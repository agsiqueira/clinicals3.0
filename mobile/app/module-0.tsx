import { useEffect, useRef, useState } from "react";
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
import { ApprovedScreens } from "../src/components/module0/ApprovedScreens";
import type { ApprovedScreen } from "../src/components/module0/ApprovedScreens";
import { afterFeedback, hasApprovedChoices, initialPresentation, isSubmissionResult } from "../src/components/module0/presentation";
import { module0SpeechText, responseAudioTooLong, exerciseEntry, narrationFor, oldCartsPanels, previousScreen, conceptPanelsFor, conceptTitle } from "../src/components/module0/teaching";
import { getItemAsync, setItemAsync } from "../src/utils/storage";
import { module0Colors } from "../src/components/module0/tokens";

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
  const params = useLocalSearchParams<{ activityId?: string | string[]; preview?: string | string[]; mode?:string | string[] }>();
  const reviewEntry = (Array.isArray(params.mode) ? params.mode[0] : params.mode) === "review";
  const initialActivity = Array.isArray(params.activityId) ? params.activityId[0] : params.activityId;
  const preview = Array.isArray(params.preview) ? params.preview[0] : params.preview;
  // Development-only presentation entry; server progress is never reset or replaced.
  const previewWelcome = typeof __DEV__ !== "undefined" && __DEV__ && preview === "welcome";
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [activityId, setActivityId] = useState<string | undefined>(initialActivity);
  const [stepId, setStepId] = useState<string | undefined>();
  const [kind, setKind] = useState<LessonResult["kind"]>("required");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<LessonResult | null>(null);
  const [retryClock, setRetryClock] = useState(Date.now());
  const [screen, setScreen] = useState<ApprovedScreen | null>(null);
  const [teachingPanel, setTeachingPanel] = useState(0);
  const [caseFactsState, setCaseFactsState] = useState<{context:string;expanded:boolean} | null>(null);
  const [captions, setCaptions] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [navigationOpen, setNavigationOpen] = useState(false);
  const presentationInitialized = useRef(false);
  const reviewNavigation = useRef<{source:"route" | "module-complete";mode:"review" | "practice" | null} | null>(reviewEntry ? {source:"route",mode:null} : null);
  const answerDraft = useRef("");
  const drafts = useRef(new Map<string,string>());
  const [exitPrompt,setExitPrompt] = useState(false);
  const draftKey = (a?:string,s?:string,k:LessonResult["kind"]="required") => `${a}:${s}:${k}`;
  function keepDraft() {
    if(!activity || !step || kind === "clarify") return;
    const key=draftKey(activity.id,step.id,kind);
    if(input.trim() && notice?.response !== input && progress?.pending?.response !== input) drafts.current.set(key,input);
    else drafts.current.delete(key);

  }
  const oldCartsOrigin = useRef<{ stepId: string; result: LessonResult | null } | null>(null);
  const oldCartsDraft = useRef("");
  const clarificationOrigin = useRef<{
    activityId: string; stepId: string; activityTitle: string; exerciseTitle: string;
    screen: ApprovedScreen | null; panel: number; panelTitle: string | null;
    kind: LessonResult["kind"]; input: string; notice: LessonResult | null;
    navigationOpen: boolean; caseFactsExpanded: boolean; error: string | null; retry: LessonSubmission | null;
  } | null>(null);
  const boundary = useRef(createModule0Boundary()).current;
  const { activity, step } = module0Selection(progress, activityId, stepId) as { activity?: LessonActivity; step?: LessonStep };
  const caseFactsContext = `${userId}:${activity?.id}:${step?.id}:${kind}`;
  const caseFactsExpanded = caseFactsState?.context === caseFactsContext ? caseFactsState.expanded
    : step?.id === "organize-old-carts" && kind === "required" && !step.completed;
  const scope = `${userId}:${activity?.id || activityId}:${step?.id}:${kind}:${screen || "existing"}:${teachingPanel}`;
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
  useEffect(() => { let active=true; void getItemAsync("module0_captions").then(v=>{if(active) setCaptions(v === "1");}); return ()=>{active=false;}; }, []);
  useEffect(() => { setCaseFactsState(null); drafts.current.clear(); }, [userId]);
  const mentorSpeech = useSpeechPlayback({
    channel: "mentor", voice: MENTOR_TTS_VOICE,
    enabled: isFocused && !transcription.isRecording,
    muted: !voiceEnabled,
    onError: (error: any) => setAudioError(error?.code === "AUTH_REQUIRED" ? "Sign in again to play narration."
      : error?.code === "TTS_UNAVAILABLE" ? "The configured TTS model is unavailable. Check the development provider configuration."
      : error?.code === "TTS_TIMEOUT" ? "Narration took too long to load. Press Play to retry."
      : error?.code === "PLAYBACK_BLOCKED" ? "Your browser blocked audio. Press Play to try again."
      : "Narration could not play. Press Play to retry; check development diagnostics if it continues."),
    scopeKey: scope,
  });
  const headers = { expectedUserId: userId };
  function guard() {
    const validView = boundary.capture();
    const validSession = captureSession(userId);
    return () => { try { validSession(); return validView(); } catch { return false; } };
  }
  const choose = (id: string, selectedStep?: string, nextKind: LessonResult["kind"] = "required") => {
    keepDraft();
    clarificationOrigin.current = null;
    oldCartsOrigin.current = null;
    if (nextKind === "clarify") answerDraft.current = input;
    boundary.invalidate(); void mentorSpeech.stop();
    setActivityId(id); setStepId(selectedStep); setKind(nextKind);
    activeSubmission.current?.abort(); activeSubmission.current = null;
    const selected = progressRef.current?.activities.find(a=>a.id === id);
    const selectedId = selectedStep || selected?.nextStepId || selected?.steps[0]?.id;
    setInput(drafts.current.get(draftKey(id,selectedId,nextKind)) || ""); setNotice(null); setError(null); setSending(false); retrySubmission.current = null;
    setNavigationOpen(false);
    setTeachingPanel(0);
    setCaseFactsState(null);
    const targetActivity = progressRef.current?.activities.find(a => a.id === id);
    const targetStep = targetActivity?.steps.find(s => s.id === (selectedStep || targetActivity.nextStepId));
    setScreen(nextKind === "clarify" ? "clarify" : id !== activity?.id && nextKind === "required" && targetStep && !targetStep.completed ? "introduction" : exerciseEntry(targetStep, nextKind));
  };
  const present = (next: ApprovedScreen | null) => {
    boundary.invalidate(); void mentorSpeech.stop();
    spoken.current = ""; setAudioError(null); setScreen(next);
  };
  function openReview() {
    reviewNavigation.current={source:"module-complete",mode:null};
    present("review");
  }
  function returnToReview() {
    keepDraft();
    if(reviewNavigation.current) reviewNavigation.current.mode=progressRef.current?.pending?.kind === "practice" ? "practice" : null;
    clarificationOrigin.current=null;setInput("");setNotice(null);setError(null);setKind("required");setTeachingPanel(0);setCaseFactsState(null);
    present("review");
  }
  function exitReview() {
    reviewNavigation.current=null;
    present(progressRef.current?.completed ? "module-complete" : progressRef.current?.completedCount ? "resume" : "welcome");
  }
  function selectReviewExercise(id:string, selectedStep:string, practice:boolean) {
    const target=progressRef.current?.activities.find(a=>a.id === id)?.steps.find(s=>s.id === selectedStep);
    if(!target?.completed || sending || progressRef.current?.pending || !isFocused || transcription.isRecording || transcription.transcribing) return;
    choose(id,selectedStep,practice ? "practice" : "required");
    if(reviewNavigation.current) reviewNavigation.current.mode=practice ? "practice" : "review";
    if(!practice) setNotice(target.saved);
    present(practice ? "practice" : selectedStep === "organize-old-carts" ? "old-carts-teach" : "teach");
  }
  function openClarification() {
    if (!activity || !step || kind === "clarify" || sending || progress?.pending || !isFocused || transcription.isRecording || transcription.transcribing) return;
    clarificationOrigin.current = {
      activityId:activity.id,stepId:step.id,activityTitle:activity.title,exerciseTitle:conceptTitle(step,activity),
      screen,panel:teachingPanel,panelTitle:screen === "old-carts-teach" || screen === "teach" ? conceptPanelsFor(step)[teachingPanel]?.title || (step.id === "open-the-interview" ? "Start with curiosity." : conceptTitle(step,activity)) : null,
      kind,input,notice,navigationOpen,caseFactsExpanded,error,retry:retrySubmission.current,
    };
    answerDraft.current = input;
    setActivityId(activity.id);setStepId(step.id);setKind("clarify");setNotice(null);setInput("");setError(null);setNavigationOpen(false);retrySubmission.current=null;
    present("clarify");
  }
  function returnFromClarification() {
    const origin = clarificationOrigin.current;
    if (!origin) { setKind("required");setNotice(null);setInput(answerDraft.current);present(hasApprovedChoices(activity,step) ? "practice" : null);return; }
    clarificationOrigin.current=null;
    setActivityId(origin.activityId);setStepId(origin.stepId);setKind(origin.kind);setTeachingPanel(origin.panel);setInput(origin.input);setNotice(origin.notice);setNavigationOpen(origin.navigationOpen);retrySubmission.current=origin.retry;
    setCaseFactsState({context:`${userId}:${origin.activityId}:${origin.stepId}:${origin.kind}`,expanded:origin.caseFactsExpanded});
    present(origin.screen);setError(origin.error);
  }
  function applySaved(data: LessonProgress, result?: LessonResult) {
    if (progressRef.current && data.revision < progressRef.current.revision) return;
    progressRef.current = data; setProgress(data);
    if (!presentationInitialized.current) {
      presentationInitialized.current = true;
      const entry = initialPresentation(data, initialActivity);
      setScreen(previewWelcome ? "welcome" : reviewEntry ? "review" : entry || exerciseEntry(module0Selection(data, initialActivity).step));
    }
    // Pending interactions retain the existing durable recovery UI.
    if (data.pending) setScreen(current => current === "resume" || current === "review" ? current : null);
    if (result) {
      drafts.current.delete(draftKey(result.activityId,result.stepId,result.kind));
      setNotice(result); setInput(""); setError(null); setSending(false); retrySubmission.current = null;
      // Result identity, rather than server.next, anchors feedback to its submission.
      setActivityId(result.activityId); setStepId(result.stepId); setKind(result.kind);
      setScreen(result.kind === "clarify" ? "clarify" : "feedback");
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
        ? data.activities.flatMap(a => a.steps).map(s => s.saved).find(r => isSubmissionResult(r, previous))
          || data.history.find(r => isSubmissionResult(r, previous)) : undefined;
      setLoading(false);
      applySaved(data, result || undefined);
      if (!recover) setError(null);
      if (resume && !result && !notice && !clarificationOrigin.current && !reviewNavigation.current) {
        const target = data.pending || data.next;
        setActivityId(target?.activityId || initialActivity); setStepId(target?.stepId);
        setKind(data.pending?.kind || "required"); setNotice(null);
        setScreen(initialPresentation(data, initialActivity));
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
    const pending = progress?.pending;
    if (!isFocused || (!sending && (!pending || pending.status !== "evaluating" || Date.now() >= Date.parse(pending.retryAfter)))) return;
    const timer = setTimeout(() => { void load(true); }, 3000);
    return () => clearTimeout(timer);
  }, [progress, scope, isFocused, sending, retryClock]);
  useEffect(() => {
    if (!isFocused || !progress?.pending) return;
    const delay = Date.parse(progress.pending.retryAfter) - Date.now();
    if (delay <= 0) return;
    // One local wake-up enables retry/stops expired-lease polling; it makes no API request.
    const timer = setTimeout(() => setRetryClock(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [progress?.pending?.requestId, progress?.pending?.retryAfter, isFocused]);
  const currentResult = notice && notice.activityId === activity?.id && notice.stepId === step?.id ? notice : null;
  const narration = narrationFor(screen || "practice", step, currentResult, teachingPanel, activity, kind);
  const responseAudioBlocked = responseAudioTooLong(screen || "practice", narration);
  const playNarration = () => {
    if (!narration || responseAudioBlocked || progress?.pending || sending) return;
    setAudioError(null);
    if (mentorSpeech.isPaused) void mentorSpeech.resume();
    else { const valid = boundary.capture(); void mentorSpeech.speak(module0SpeechText(narration), undefined, valid); }
  };
  useEffect(() => {
    // Returned feedback and mentor answers are read only on the learner's request.
    if (screen === "feedback" || screen === "clarify") return;
    if (progress?.pending || sending || !isFocused || !voiceEnabled || !step || !activity || transcription.isRecording || !narration) return;
    const latest = notice?.activityId === activity.id && notice.stepId === step.id ? notice : null;
    const key = `${scope}:${latest?.requestId || "teach"}`;
    if (spoken.current === key) return;
    spoken.current = key;
    const text = narration;
    const valid = boundary.capture();
    void mentorSpeech.speak(module0SpeechText(text), undefined, valid);
  }, [scope, step?.id, notice, isFocused, transcription.isRecording, narration]);

  const submit = async (pending = false) => {
    if(reviewNavigation.current?.mode === "review" && kind === "required") return;
    if (activeSubmission.current || sending || !progress || !activity || !step || !isFocused) return;
    let current: () => boolean;
    try { current = guard(); } catch { setError("Your session expired. Sign in again to resume your saved progress."); return; }
    const savedPending = progress.pending;
    if ((!pending && savedPending) || (!pending && (!input.trim() || transcription.isRecording || transcription.transcribing))) return;
    const old = retrySubmission.current;
    // Existing clarification contract accepts a question in response. Add only
    // the teaching context to that question; required/practice answers are untouched.
    const origin = kind === "clarify" ? clarificationOrigin.current : null;
    const response = origin?.panelTitle ? `Teaching context: ${origin.activityTitle} / ${origin.exerciseTitle} / ${origin.panelTitle}\n\nLearner question: ${input.trim()}` : input.trim();
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
      if (data.status === "saved" && !isSubmissionResult(data.result, payload)) {
        setError("The returned feedback did not match this answer. Refreshing your saved response.");
        void load(true); return;
      }
      applySaved(data.progress, data.status === "saved" ? data.result : undefined);
    } catch (err: any) {
      if (current() && !controller.signal.aborted) {
        setScreen(null);
        setError(err?.status === 401 ? "Your session expired. Sign in again to resume your saved progress." : errorMessage(err?.data?.error || err?.code));
        // The server may have saved the answer even when transport/evaluation failed.
        void load(true);
      }
    } finally {
      controllers.current.delete(controller);
      if (activeSubmission.current === controller) { activeSubmission.current = null; if (current()) setSending(false); }
    }
  };
  const exitModule = () => {
    setExitPrompt(false); boundary.invalidate(); void mentorSpeech.stop();
    router.replace("/(tabs)");
  };
  const leave = () => {
    keepDraft();
    const unsent = [...drafts.current.values()].some(text=>text.trim()) ||
      kind === "clarify" && (!!input.trim() && notice?.response !== input || !!clarificationOrigin.current?.input.trim());
    if (unsent) setExitPrompt(true);
    else exitModule();
  };
  function previousExercise() {
    if(!progress || !activity || !step) return;
    const index=activity.steps.findIndex(s=>s.id === step.id);
    if(index === 0) {present("introduction");return;}
    const previous=activity.steps[index-1];
    choose(activity.id,previous.id);
    setNotice(previous.saved);
    present(previous.saved ? "feedback" : "practice");
  }
  const relevantHistory = progress?.history.filter(r => r.activityId === activity?.id && r.stepId === step?.id) || [];
  const pending = progress?.pending;
  const retryWait = pending ? Math.max(0, Math.ceil((Date.parse(pending.retryAfter) - Math.max(Date.now(), retryClock)) / 1000)) : 0;
  if (progress && activity && step) {
    return <ApprovedScreens exitPrompt={exitPrompt} onCancelExit={()=>setExitPrompt(false)} onConfirmExit={exitModule} screen={pending && screen !== "resume" && screen !== "review" ? "practice" : screen || "practice"} activity={activity} step={step} progress={progress}
      onReviewExercise={selectReviewExercise}
      clarificationContext={kind === "clarify" && clarificationOrigin.current ? clarificationOrigin.current : undefined}
      teachingPanel={teachingPanel} narration={narration} captions={captions} muted={!voiceEnabled} audioError={audioError}
      caseFactsExpanded={caseFactsExpanded} onToggleCaseFacts={() => setCaseFactsState({context:caseFactsContext,expanded:!caseFactsExpanded})}
      onToggleCaptions={() => setCaptions(v => { void setItemAsync("module0_captions", !v ? "1" : "0"); return !v; })}
      onToggleMute={() => { setVoiceEnabled(v => !v); }}
      isPaused={mentorSpeech.isPaused} onPause={() => void mentorSpeech.pause()}
      onPlay={() => playNarration()}
      textMode={!!pending || !screen || !hasApprovedChoices(activity,step,kind)} kind={kind} history={relevantHistory}
      retryWait={retryWait} onRetry={() => void submit(true)} onRefresh={() => void load(true)} onChoose={(id,selectedStep,nextKind="required")=>{
        const targetActivity=progressRef.current?.activities.find(a=>a.id === id);
        const target=targetActivity?.steps.find(s=>s.id === (selectedStep || targetActivity.nextStepId || targetActivity.steps[0]?.id));
        if(reviewNavigation.current && !target?.completed && !pending) reviewNavigation.current=null;
        choose(id,selectedStep,nextKind);
        if(screen === "review" && reviewNavigation.current) reviewNavigation.current.mode=nextKind === "practice" ? "practice" : null;
      }}
      navigationOpen={navigationOpen} onToggleNavigation={() => setNavigationOpen(v => !v)}
      voiceEnabled={voiceEnabled} onToggleVoice={() => setVoiceEnabled(v => !v)}
      transcribing={transcription.transcribing} micDisabled={!isFocused || sending || !!pending || transcription.transcribing || transcription.recordingBusy}
      result={notice?.activityId === activity.id && notice.stepId === step.id ? notice : null}
      selected={input} onSelect={setInput} busy={sending}
      disabled={!isFocused || transcription.isRecording || transcription.transcribing}
      error={error} isSpeaking={mentorSpeech.isSpeaking}
      onContinue={() => {
        if(screen === "feedback" && reviewNavigation.current?.mode && notice) {returnToReview();return;}
        if (screen === "welcome") present("introduction");
        else if (screen === "introduction") { setTeachingPanel(0); present(step.id === "organize-old-carts" ? "old-carts-teach" : "teach"); }
        else if (screen === "old-carts-teach") { if (teachingPanel < oldCartsPanels.length-1) { void mentorSpeech.stop(); setTeachingPanel(v=>v+1); } else present("practice"); }
        else if (screen === "exercise-transition") {
          if (activity.nextStepId) {
            const origin = { stepId: step.id, result: notice };
            choose(activity.id, activity.nextStepId);
            oldCartsOrigin.current = origin;
            setInput(drafts.current.get(draftKey(activity.id,activity.nextStepId,"required")) || oldCartsDraft.current);
          }
        }
        else if (screen === "teach") {
          const panels=conceptPanelsFor(step);
          if(teachingPanel < panels.length-1) {void mentorSpeech.stop();setTeachingPanel(v=>v+1);}
          else present(hasApprovedChoices(activity, step, kind) ? "practice" : null);
        }
        else if (screen === "feedback") {
          if (!notice || notice.activityId !== activity.id || notice.stepId !== step.id) return;
          if (notice.kind === "required" && afterFeedback(progress, activity.id)) present("activity-complete");
          else if (notice.kind === "required" && activity.nextStepId) { if (activity.id === "starting-the-encounter" && step.id === "open-the-interview") present("exercise-transition"); else choose(activity.id, activity.nextStepId); }
          else choose(activity.id, step.id);
        }
        else if (screen === "activity-complete") {
          if (progress.completed) present("module-complete");
          else if (progress.next) choose(progress.next.activityId, progress.next.stepId);
        }
        else if (screen === "resume") {
          if (progress.pending) choose(progress.pending.activityId, progress.pending.stepId, progress.pending.kind);
          else if (progress.next) choose(progress.next.activityId, progress.next.stepId);
          else present(progress.completed ? "module-complete" : null);
        }
        else if (screen === "module-complete") { boundary.invalidate(); void mentorSpeech.stop(); router.replace("/(tabs)/cases"); }
        else if (step.completed && kind === "required" && notice) present("feedback");
        else void submit();
      }}
      onBack={() => {
        if (sending || pending || transcription.isRecording || transcription.transcribing) return;
        if(screen === "review") {exitReview();return;}
        if(reviewNavigation.current?.mode === "practice" && kind === "practice" && (screen === "practice" || screen === null)) {returnToReview();return;}
        if(reviewNavigation.current?.mode && (screen === "teach" || screen === "old-carts-teach") && teachingPanel === 0) {returnToReview();return;}
        if (screen === "old-carts-teach") {
          if (teachingPanel > 0) { void mentorSpeech.stop(); setTeachingPanel(v=>v-1); }
          else if (oldCartsOrigin.current) {
            keepDraft(); oldCartsDraft.current = input; setInput("");
            setStepId(oldCartsOrigin.current.stepId);
            setNotice(oldCartsOrigin.current.result);
            present("exercise-transition");
          } else previousExercise();
        }
        else if (screen === "clarify") returnFromClarification();
        else if (screen === "teach" && conceptPanelsFor(step).length) {
          if(teachingPanel>0){void mentorSpeech.stop();setTeachingPanel(v=>v-1);}else previousExercise();
        }
        else if(screen === "welcome") leave();
        else if(screen === "resume") present("welcome");
        else if(screen === "module-complete") {
          const last=progress.activities[progress.activities.length-1];choose(last.id,last.steps[last.steps.length-1].id);present("activity-complete");
        }
        else if(screen === "activity-complete") {
          const last=activity.steps[activity.steps.length-1];choose(activity.id,last.id);setNotice(last.saved);present(last.saved ? "feedback" : "practice");
        }
        else if(screen === "introduction" && progress.activities.findIndex(a=>a.id === activity.id)>0) {
          const previous=progress.activities[progress.activities.findIndex(a=>a.id === activity.id)-1];
          if(previous.completed){choose(previous.id,previous.steps[previous.steps.length-1].id);present("activity-complete");}
          else present("resume");
        }
        else { const previous = previousScreen(screen || "practice", step.id === "organize-old-carts"); if (previous === "old-carts-teach" || previous === "teach" && conceptPanelsFor(step).length) setTeachingPanel(conceptPanelsFor(step).length-1); if (previous) present(previous); }
      }} onLeave={leave}
      onReview={openReview}
      onMicPress={() => { void mentorSpeech.stop(); void transcription.toggleRecording(); }} isRecording={transcription.isRecording}
      onFreeText={() => present(null)}
      onClarify={openClarification}
      onListen={playNarration}
      onStopAudio={() => void mentorSpeech.stop()} />;
  }
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
          {hasApprovedChoices(activity, step, kind) && !pending && <Pressable accessibilityRole="button" onPress={() => present("introduction")}><Text style={styles.link}>View approved opening lesson</Text></Pressable>}
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
            <Pressable onPress={() => { const valid = boundary.capture(); void mentorSpeech.speak(module0SpeechText(`${step.teach} ${step.question}`), undefined, valid); }}><Text style={styles.link}>Listen to teaching and question</Text></Pressable>
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
          <Text style={styles.muted}>{pending.status === "failed" ? "Feedback could not be completed. Your answer is preserved. Automatic checks have stopped." : retryWait === 0 ? "The earlier feedback request has not finished. Automatic checks have stopped." : "Dr. Martinez is preparing feedback. Saved progress refreshes automatically."} {retryWait > 0 ? `Retry is available in about ${retryWait} seconds while the previous request settles.` : "You can safely retry feedback now."}</Text>
          <View style={styles.row}><Pressable onPress={() => choose(pending.activityId, pending.stepId, pending.kind)}><Text style={styles.link}>Return to saved answer</Text></Pressable>
          <Pressable disabled={sending || retryWait > 0} onPress={() => void submit(true)}><Text style={styles.link}>{sending ? "Working…" : "Retry feedback"}</Text></Pressable></View>
          <Pressable onPress={() => void load(true)}><Text style={styles.link}>Refresh saved progress</Text></Pressable>
        </View>}

          <View style={styles.rowWrap}>
            {!step.completed && <Pressable style={styles.chip} onPress={() => choose(activity.id, step.id, "required")}><Text style={styles.link}>Answer exercise</Text></Pressable>}
            <Pressable style={styles.chip} onPress={() => choose(activity.id, step.id, "clarify")}><Text style={styles.link}>Ask for clarification</Text></Pressable>
            {step.completed && <Pressable style={styles.chip} onPress={() => choose(activity.id, step.id, "practice")}><Text style={styles.link}>Optional targeted practice</Text></Pressable>}
          </View>
          {(!step.completed || kind !== "required") && <>
            <ClinicalsChatComposer value={input} onChangeText={setInput} onSubmit={() => void submit()} onMicPress={() => { void mentorSpeech.stop(); void transcription.toggleRecording(); }}
              placeholderTextColor={module0Colors.placeholder}
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
