import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../src/api/client";
import { captureSession } from "../src/api/sessionToken";
import { createModule0Boundary, module0Selection, newLessonRequestId } from "../src/api/module0View";
import { MentorAvatar } from "../src/components/MentorAvatar";
import { ClinicalsChatComposer } from "../src/components/ClinicalsChatComposer";
import { useSpeechPlayback } from "../src/hooks/useSpeechPlayback";
import { useEnglishSpeechTranscription } from "../src/hooks/useEnglishSpeechTranscription";
import { useVoicePreference } from "../src/hooks/useVoicePreference";
import { portfolioStyles } from "../assets/styles/portfolio.styles";
import type { LessonActivity, LessonProgress, LessonResult, LessonStep, LessonSubmission } from "../src/types/clinicalReadiness";

const MENTOR_TTS_VOICE = process.env.EXPO_PUBLIC_NAVIGATOR_MENTOR_TTS_VOICE || "am_adam";
function errorMessage(code?: string) {
  const messages: Record<string, string> = {
    REQUEST_TIMEOUT: "Feedback took longer than expected. Refresh saved progress to recover your answer, then retry feedback if needed.",
    MODULE_STATE_REVIEW_REQUIRED: "Your saved progress needs a compatibility review. It has not been erased.",
    MODULE_STORAGE_UNAVAILABLE: "Clinical Readiness is not available yet. Please try again after setup.",
    RESPONSE_ATTEMPT_REQUIRED: "Please make an attempt at the exercise. You do not need a correct answer to advance.",
    PROGRESS_CHANGED: "Your progress changed in another window. The saved version has been refreshed.",
    EVALUATION_PENDING: "Your earlier answer is saved and awaiting feedback. Finish that request before sending another.",
    MODULE_VERSION_REVIEW_REQUIRED: "Your saved progress needs a curriculum compatibility review. It has not been erased.",
    OPTIONAL_INTERACTION_LIMIT: "You have reached the supplementary practice limit. Your required progress is unaffected.",
  };
  return messages[code || ""] || "Could not complete this request. Your saved progress is safe. Refresh to recover any pending answer.";
}
export default function Module0Screen() {
  const { userId, sessionId } = useAuth();
  if (!userId) return <SafeAreaView style={portfolioStyles.container}><Text style={styles.body}>Sign in to continue Clinical Readiness.</Text></SafeAreaView>;
  return <Module0Experience key={`${userId}:${sessionId}`} userId={userId} />;
}
function Module0Experience({ userId }: { userId: string }) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ activityId?: string | string[] }>();
  const initialActivity = Array.isArray(params.activityId) ? params.activityId[0] : params.activityId;
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [activityId, setActivityId] = useState<string | undefined>(initialActivity);
  const [stepId, setStepId] = useState<string | undefined>();
  const [kind, setKind] = useState<LessonResult["kind"]>("required");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<LessonResult | null>(null);
  const boundary = useRef(createModule0Boundary()).current;
  const { activity, step } = module0Selection(progress, activityId, stepId) as { activity?: LessonActivity; step?: LessonStep };
  const scope = `${userId}:${activity?.id || activityId}:${step?.id}:${kind}`;
  boundary.enter(scope, isFocused);
  const controllers = useRef(new Set<AbortController>());
  const readGeneration = useRef(0);
  const retrySubmission = useRef<LessonSubmission | null>(null);
  const activeSubmission = useRef<AbortController | null>(null);
  const progressRef = useRef<LessonProgress | null>(null);
  const spoken = useRef("");
  const { voiceEnabled, setVoiceEnabled } = useVoicePreference();
  const transcription = useEnglishSpeechTranscription({
    enabled: isFocused, scopeKey: scope,
    onText: text => setInput(current => current ? `${current} ${text}` : text),
    onError: () => setError("Could not transcribe. Please try again or type your answer."),
  });
  const mentorSpeech = useSpeechPlayback({
    channel: "mentor", voice: MENTOR_TTS_VOICE,
    enabled: voiceEnabled && isFocused && !transcription.isRecording,
    scopeKey: scope,
  });
  const headers = { expectedUserId: userId };
  function guard() {
    const validView = boundary.capture();
    const validSession = captureSession(userId);
    return () => { try { validSession(); return validView(); } catch { return false; } };
  }
  const choose = (id: string, selectedStep?: string, nextKind: LessonResult["kind"] = "required") => {
    boundary.invalidate(); void mentorSpeech.stop();
    setActivityId(id); setStepId(selectedStep); setKind(nextKind);
    activeSubmission.current?.abort(); activeSubmission.current = null;
    setInput(""); setNotice(null); setError(null); setSending(false); retrySubmission.current = null;
  };
  function applySaved(data: LessonProgress, result?: LessonResult) {
    if (progressRef.current && data.revision < progressRef.current.revision) return;
    progressRef.current = data; setProgress(data);
    if (result) {
      setNotice(result); setInput(""); setError(null); setSending(false); retrySubmission.current = null;
      if (result.kind === "clarify") setKind("required");
      if (result.kind === "required") {
        const nextActivity = data.activities.find(a => a.id === result.activityId);
        // Advance within this activity; completed activities remain open for review.
        setActivityId(result.activityId); setStepId(nextActivity?.nextStepId || result.stepId); setKind("required");
      }
    }
  }
  const load = async (recover = false, resume = false) => {
    let current: () => boolean;
    try { current = guard(); } catch { setError("Your session expired. Sign in again to resume your saved progress."); setLoading(false); return; }
    const generation = ++readGeneration.current;
    const controller = new AbortController(); controllers.current.add(controller);
    try {
      const data: LessonProgress = await api.getModule0Progress(headers, controller.signal);
      if (!current() || generation !== readGeneration.current) return;
      if (progressRef.current && data.revision < progressRef.current.revision) return;
      const previous = progressRef.current?.pending || retrySubmission.current;
      const result = recover && previous && previous.activityId === activity?.id && previous.stepId === step?.id
        ? data.activities.flatMap(a => a.steps).map(s => s.saved).find(r => r?.requestId === previous.requestId)
          || data.history.find(r => r.requestId === previous.requestId) : undefined;
      setLoading(false);
      applySaved(data, result || undefined);
      if (!recover) setError(null);
      if (resume) {
        const target = data.pending || data.next;
        setActivityId(target?.activityId || initialActivity); setStepId(target?.stepId);
        setKind(data.pending?.kind || "required"); setNotice(null);
      }
      if (data.pending && !activityId) { setActivityId(data.pending.activityId); setStepId(data.pending.stepId); setKind(data.pending.kind); }
    } catch (err: any) {
      if (current() && generation === readGeneration.current && !controller.signal.aborted) setError(err?.status === 401 ? "Your session expired. Sign in again to resume your saved progress." : errorMessage(err?.data?.error));
    } finally {
      controllers.current.delete(controller);
      if (current()) setLoading(false);
    }
  };
  useEffect(() => {
    boundary.enter(scope, isFocused);
    return () => {
      boundary.invalidate(); readGeneration.current++;
      for (const controller of controllers.current) controller.abort();
      controllers.current.clear();
      activeSubmission.current = null; setSending(false);
      void mentorSpeech.stop();
    };
  }, [scope, isFocused, boundary, mentorSpeech.stop]);
  useEffect(() => { if (initialActivity && initialActivity !== activityId) choose(initialActivity); }, [initialActivity]);
  const wasFocused = useRef(false);
  useEffect(() => {
    const returning = isFocused && !wasFocused.current;
    wasFocused.current = isFocused;
    if (isFocused) void load(true, returning && !!progressRef.current);
  }, [isFocused, scope]); // Resume on focus; explicit activity/review choices remain intact.
  useEffect(() => {
    if (!isFocused || (!progress?.pending && !sending)) return;
    const timer = setTimeout(() => { void load(true); }, 3000);
    return () => clearTimeout(timer);
  }, [progress, scope, isFocused, sending]);
  useEffect(() => {
    if (!isFocused || !voiceEnabled || !step || !activity || transcription.isRecording) return;
    const latest = notice?.activityId === activity.id ? notice : null;
    const key = `${scope}:${latest?.requestId || "teach"}`;
    if (spoken.current === key) return;
    spoken.current = key;
    const text = latest ? latest.evaluation.feedback || latest.evaluation.reply || "" : `${step.teach} ${step.question}`;
    const valid = boundary.capture();
    void mentorSpeech.speak(text, undefined, valid);
  }, [scope, step?.id, notice, isFocused, voiceEnabled, transcription.isRecording]);

  const submit = async (pending = false) => {
    if (activeSubmission.current || sending || !progress || !activity || !step || !isFocused) return;
    let current: () => boolean;
    try { current = guard(); } catch { setError("Your session expired. Sign in again to resume your saved progress."); return; }
    const savedPending = progress.pending;
    if ((!pending && savedPending) || (!pending && (!input.trim() || transcription.isRecording || transcription.transcribing))) return;
    const old = retrySubmission.current;
    const response = input.trim();
    const request: LessonSubmission = pending && savedPending
      ? { ...savedPending, expectedRevision: progress.revision } // Project below; no server metadata is submitted.
      : old && old.activityId === activity.id && old.stepId === step.id && old.kind === kind && old.response === response
        ? { ...old, expectedRevision: progress.revision }
        : { activityId: activity.id, stepId: step.id, kind, response, requestId: newLessonRequestId(), expectedRevision: progress.revision };
    const payload: LessonSubmission = { activityId: request.activityId, stepId: request.stepId, kind: request.kind, response: request.response, requestId: request.requestId, expectedRevision: request.expectedRevision };
    retrySubmission.current = payload;
    const controller = new AbortController(); controllers.current.add(controller);
    activeSubmission.current = controller;
    setSending(true); setError(null); void mentorSpeech.stop();
    try {
      const data = await api.submitModule0Interaction(payload, headers, controller.signal);
      if (!current()) return;
      setSending(false);
      applySaved(data.progress, data.status === "saved" ? data.result : undefined);
    } catch (err: any) {
      if (current() && !controller.signal.aborted) {
        setError(err?.status === 401 ? "Your session expired. Sign in again to resume your saved progress." : errorMessage(err?.data?.error || err?.code));
        // The server may have saved the answer even when transport/evaluation failed.
        void load(true);
      }
    } finally {
      controllers.current.delete(controller);
      if (activeSubmission.current === controller) { activeSubmission.current = null; if (current()) setSending(false); }
    }
  };
  const leave = () => {
    boundary.invalidate(); void mentorSpeech.stop();
    if (router.canGoBack()) router.back(); else router.replace("/(tabs)");
  };
  const relevantHistory = progress?.history.filter(r => r.activityId === activity?.id && r.stepId === step?.id) || [];
  const pending = progress?.pending;
  const retryWait = pending ? Math.max(0, Math.ceil((Date.parse(pending.retryAfter) - Date.now()) / 1000)) : 0;
  return <SafeAreaView style={portfolioStyles.container}>
    <ScrollView contentContainerStyle={[portfolioStyles.scrollContent, styles.content]} keyboardShouldPersistTaps="handled">
      <View style={styles.row}>
        <View style={styles.flex}><Text style={portfolioStyles.screenTitle}>Clinical Readiness</Text><Text style={styles.body}>Module 0 · Four activities · 14–18 minutes</Text></View>
        <Pressable accessibilityRole="button" onPress={leave}><Text style={styles.link}>Save & leave</Text></Pressable>
      </View>
      <Text style={styles.muted}>Accepted answers save automatically. You can leave at any time; text you have not submitted is not saved.</Text>
      {loading && !progress ? <ActivityIndicator /> : null}
      {error && !progress && <RequestError message={error} onRefresh={() => void load()} />}
      {progress && <>
        <Text style={styles.progress}>{progress.completed ? "Module 0 completed · Your completion is saved" : `${progress.completedCount} of ${progress.requiredCount} interactions complete`}</Text>
        <View style={styles.panel}>
          {progress.activities.map((a, i) => <Pressable key={a.id} accessibilityRole="button" accessibilityState={{ selected: a.id === activity?.id }} style={[styles.activity, a.id === activity?.id && styles.selected]} onPress={() => choose(a.id)}>
            <Text style={styles.body}>{a.completed ? "✓" : `${i + 1}.`} {a.title}</Text><Text style={styles.muted}>{a.completedCount}/{a.requiredCount} · {a.estimatedMinutesRange.join("–")} min</Text>
          </Pressable>)}
        </View>
        {activity && step && <>
          <View style={[styles.panel, styles.mentor]}>
            <MentorAvatar mentorName="Dr. Martinez" mentorSlug="dr-martinez" size={100} isSpeaking={mentorSpeech.isSpeaking} />
            <View style={styles.flex}><Text style={styles.heading}>Dr. Martinez · Clinical Preceptor</Text><Text style={styles.body}>Try the exercise, receive feedback, and move on. Both feedback labels count toward completion.</Text>
              <View style={styles.row}><Pressable onPress={() => { void mentorSpeech.stop(); setVoiceEnabled(v => !v); }}><Text style={styles.link}>Voice: {voiceEnabled ? "On" : "Off"}</Text></Pressable><Pressable onPress={() => void mentorSpeech.stop()}><Text style={styles.link}>Stop audio</Text></Pressable></View>
            </View>
          </View>
          <Text style={styles.heading}>{activity.title}</Text>
          <View style={styles.rowWrap}>{activity.steps.map((s, i) => <Pressable key={s.id} disabled={!s.completed && s.id !== activity.nextStepId} onPress={() => choose(activity.id, s.id)} style={styles.chip}><Text style={styles.link}>{s.completed ? "✓ Review" : "Exercise"} {i + 1}</Text></Pressable>)}</View>
          <View style={styles.panel}>
            <Text style={styles.body}>{step.teach}</Text>
            <Pressable onPress={() => { const valid = boundary.capture(); void mentorSpeech.speak(`${step.teach} ${step.question}`, undefined, valid); }}><Text style={styles.link}>Listen to teaching and question</Text></Pressable>
            <Text style={styles.question}>{kind === "practice" ? step.optionalPracticeQuestion : step.question}</Text>
            <Text style={styles.muted}>{step.answerHint}</Text>
          </View>
          <View style={styles.panel}><Text style={styles.heading}>Mr. Jones · Instructional facts</Text><Text selectable style={styles.body}>{progress.scenario.text}</Text><Text style={styles.muted}>{progress.scenario.purpose}</Text></View>
          {step.saved && <><View style={styles.panel}><Text style={styles.heading}>Your saved response</Text><Text selectable style={styles.body}>{step.saved.response}</Text></View><Feedback result={step.saved} /></>}
          {relevantHistory.map(r => <Feedback key={r.requestId} result={r} />)}
          {notice?.activityId === activity.id && notice.requestId !== step.saved?.requestId && !relevantHistory.some(r => r.requestId === notice.requestId) && <Feedback result={notice} />}
          {error && <RequestError message={error} onRefresh={() => void load()} />}
          {sending && !pending && <View style={styles.panel}><ActivityIndicator /><Text accessibilityLiveRegion="polite" style={styles.body}>Submitting your answer and preparing feedback…</Text></View>}
          {pending && <View style={styles.panel}><Text style={styles.body}>Your answer is saved and awaiting feedback. You may leave and resume later.</Text>
          <Text selectable style={styles.muted}>{pending.response}</Text>
          <Text style={styles.muted}>{pending.status === "failed" ? "Feedback could not be completed. Your answer is preserved." : "Dr. Martinez is preparing feedback. Saved progress refreshes automatically."} {retryWait > 0 ? `Retry is available in about ${retryWait} seconds while the previous request settles.` : "You can safely retry feedback now."}</Text>
          <View style={styles.row}><Pressable onPress={() => choose(pending.activityId, pending.stepId, pending.kind)}><Text style={styles.link}>Return to saved answer</Text></Pressable>
          <Pressable disabled={sending || retryWait > 0} onPress={() => void submit(true)}><Text style={styles.link}>{sending ? "Working…" : "Retry feedback"}</Text></Pressable></View>
        </View>}

          <View style={styles.rowWrap}>
            {!step.completed && <Pressable style={styles.chip} onPress={() => choose(activity.id, step.id, "required")}><Text style={styles.link}>Answer exercise</Text></Pressable>}
            <Pressable style={styles.chip} onPress={() => choose(activity.id, step.id, "clarify")}><Text style={styles.link}>Ask for clarification</Text></Pressable>
            {step.completed && <Pressable style={styles.chip} onPress={() => choose(activity.id, step.id, "practice")}><Text style={styles.link}>Optional targeted practice</Text></Pressable>}
          </View>
          {(!step.completed || kind !== "required") && <>
            <ClinicalsChatComposer value={input} onChangeText={setInput} onSubmit={() => void submit()} onMicPress={() => { void mentorSpeech.stop(); void transcription.toggleRecording(); }}
              submitLabel={kind === "clarify" ? "Ask" : "Submit"} placeholder={kind === "clarify" ? "Ask about this concept…" : "A few focused sentences or labeled phrases…"}
              editable={isFocused && !sending && !pending} sending={sending} sendDisabled={sending || !!pending || !input.trim() || transcription.isRecording || transcription.transcribing}
              micDisabled={sending || !!pending || transcription.transcribing || transcription.recordingBusy} isRecording={transcription.isRecording} transcribing={transcription.transcribing}
              containerStyle={styles.composer} inputAccessibilityLabel={kind === "clarify" ? "Clarification question" : "Your exercise response"} />
            {kind === "clarify" && <Text style={styles.muted}>Clarification does not complete the exercise. Return to your answer when you are ready.</Text>}
          </>}
          {step.completed && !activity.completed && activity.nextStepId && <Pressable onPress={() => choose(activity.id, activity.nextStepId!)}><Text style={styles.link}>Continue to the next unfinished exercise</Text></Pressable>}
          {activity.completed && <>
            <Text style={styles.progress}>Activity complete. Review or practice without repeating required work.</Text>
            {progress.next && <Pressable onPress={() => choose(progress.next!.activityId, progress.next!.stepId)}><Text style={styles.link}>Continue to the next unfinished activity</Text></Pressable>}
          </>}
        </>}
        {progress.completed && <Pressable style={styles.button} onPress={() => { boundary.invalidate(); void mentorSpeech.stop(); router.replace("/(tabs)/cases"); }}><Text style={styles.buttonText}>Return to Full Roadmap</Text></Pressable>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
function RequestError({ message, onRefresh }: { message: string; onRefresh: () => void }) {
  return <View style={styles.panel}><Text accessibilityRole="alert" style={styles.error}>{message}</Text><Pressable onPress={onRefresh}><Text style={styles.link}>Refresh saved progress</Text></Pressable></View>;
}
function Feedback({ result }: { result: LessonResult }) {
  return <View style={styles.panel}><Text style={styles.heading}>{result.evaluation.label || "Dr. Martinez · Clarification"}</Text><Text style={styles.body}>{result.evaluation.feedback || result.evaluation.reply}</Text>{result.evaluation.evidence?.map((e, i) => <Text key={i} selectable style={styles.muted}>Your response: “{e}”</Text>)}</View>;
}
const styles = StyleSheet.create({
  content: { paddingBottom: 40, gap: 14 }, flex: { flex: 1 }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 }, rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  body: { color: "#374151", fontSize: 15, lineHeight: 23 }, muted: { color: "#6b7280", fontSize: 13, lineHeight: 20 }, heading: { color: "#312e81", fontSize: 17, fontWeight: "700" },
  panel: { backgroundColor: "#ffffff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#ede9fe", gap: 10 }, mentor: { flexDirection: "row", alignItems: "center" },
  link: { color: "#6d28d9", fontWeight: "700", paddingVertical: 6 }, error: { color: "#b91c1c", lineHeight: 22 }, question: { color: "#312e81", fontSize: 17, lineHeight: 25, fontWeight: "600" }, progress: { color: "#5b21b6", fontWeight: "700" },
  activity: { padding: 10, borderRadius: 10, gap: 2 }, selected: { backgroundColor: "#faf5ff" }, chip: { paddingHorizontal: 12, backgroundColor: "#faf5ff", borderRadius: 10 }, composer: { marginHorizontal: 0 },
  button: { backgroundColor: "#6d28d9", padding: 14, alignItems: "center", borderRadius: 12 }, buttonText: { color: "white", fontWeight: "700" },
});
