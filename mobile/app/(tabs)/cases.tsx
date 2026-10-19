import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFonts } from "expo-font";
import { useRoadmapFocus } from "../../src/components/roadmap/useRoadmapFocus";
import { roadmapFocusTarget } from "../../src/components/roadmap/focus";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { api } from "../../src/api/client";
import { casesStyles } from "../../assets/styles/cases.styles";
import { RoadmapFoundation, RoadmapHeader, RoadmapJourney, RoadmapScenery, roadmapStyles } from "../../src/components/roadmap/RoadmapJourney";
import { progressLayout } from "../../src/components/ProgressHeader";
import type { TodayResponse } from "../../src/components/today/model";
import { JourneyCanvas } from "../../src/components/roadmap/JourneyConnections";
import { isRotationMastered, previousAttemptsRoute } from "../../src/components/roadmap/journey";
import type { Module0Summary } from "../../src/types/clinicalReadiness";
import { captureSession } from "../../src/api/sessionToken";
import { MeetPreceptor } from "../../src/components/MeetPreceptor";
import { PatientBrief } from "../../src/components/PatientBrief";
import { useEnglishSpeechTranscription } from "../../src/hooks/useEnglishSpeechTranscription";
import { useSpeechPlayback } from "../../src/hooks/useSpeechPlayback";
import { useVoicePreference } from "../../src/hooks/useVoicePreference";
import { getItemAsync, setItemAsync } from "../../src/utils/storage";
import {
  patientFacingText,
} from "../../src/utils/clinicalDisplay";

type AchievementSummary = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  weightPercent?: number | null;
};

type RoadmapSession = {
  id: string;
  slug: string;
  title: string;
  objective?: string | null;
  description?: string | null;
  status: "locked" | "available" | "completed";
  entryBlocked?: boolean;
  badgeTier?: "GOLD" | "SILVER" | "BRONZE" | "NONE" | null;
  bestSessionScore?: number | null;
  latestSessionScore?: number | null;
  badgeThresholds?: {
    gold: number;
    silver: number;
    bronze: number;
  };
  achievements?: AchievementSummary[];
  requiresHpi?: boolean;
  workflow?: {
    requiresHpi?: boolean;
  };
};

type RoadmapUnit = {
  id: string;
  slug: string;
  title: string;
  objective?: string | null;
  sortOrder?: number | null;
  sessions: RoadmapSession[];
};

type LearningPath = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  preceptorPersona?: {
    name?: string | null;
    specialty?: string | null;
  } | null;
  units: RoadmapUnit[];
};

const SEEN_MILESTONES_STORAGE_KEY_PREFIX = "clinicals2:roadmap:seen-milestones";

type SessionOverview = {
  id: string;
  slug: string;
  title: string;
  objective?: string | null;
  description?: string | null;
  achievements: AchievementSummary[];
  badgeThresholds: {
    gold: number;
    silver: number;
    bronze: number;
  };
  estimatedTime: {
    min?: number | null;
    max?: number | null;
  };
  preceptorBriefing?: string | null;
  requiresHpi?: boolean;
  workflow?: {
    requiresHpi?: boolean;
  };
  linkedCase?: {
    caseId: string;
    title?: string | null;
    level?: number | null;
    setting?: string | null;
  } | null;
  preceptorPersona?: {
    name?: string | null;
    slug?: string | null;
    specialty?: string | null;
    avatarUrl?: string | null;
  } | null;
};

type PreceptorChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const INITIAL_PRECEPTOR_BRIEFING =
  "Welcome. I'm Dr. Martinez. In this session, you'll meet your first patient and begin the clinical encounter. Focus on two goals: introduce yourself professionally and identify the patient's chief complaint. Ask me any questions before you meet the patient.";

const PRECEPTOR_QUICK_ACTIONS = [
  "How should I introduce myself?",
  "What is a chief complaint?",
  "What should I focus on?",
];

const MENTOR_TTS_VOICE =
  process.env.EXPO_PUBLIC_NAVIGATOR_MENTOR_TTS_VOICE || "am_adam";

function normalizeLearningPathsResponse(data: any): LearningPath[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.learningPaths)) return data.learningPaths;
  if (data && typeof data === "object" && Array.isArray(data.units)) return [data];
  throw new Error("Learning paths are unavailable: the server returned an invalid response.");
}

function achievementWeightLabels(achievements: AchievementSummary[]) {
  const numericWeights = achievements.map((achievement) => Number(achievement.weightPercent));
  const allWeightsValid = numericWeights.every(Number.isFinite);
  if (!allWeightsValid) return achievements.map(() => null);

  const roundedWeights = numericWeights.map((weight) => Math.round(weight));
  const rawTotal = numericWeights.reduce((sum, weight) => sum + weight, 0);
  if (roundedWeights.length > 1 && Math.round(rawTotal) === 100) {
    const priorTotal = roundedWeights.slice(0, -1).reduce((sum, weight) => sum + weight, 0);
    roundedWeights[roundedWeights.length - 1] = 100 - priorTotal;
  }

  return roundedWeights.map((weight) => `${weight}%`);
}

function badgeThresholdLabels(thresholds: SessionOverview["badgeThresholds"]) {
  const gold = Math.round(thresholds.gold);
  const silver = Math.round(thresholds.silver);
  const bronze = Math.round(thresholds.bronze);

  return {
    gold: `${gold}%+`,
    silver: `${silver}–${gold - 1}%`,
    bronze: `${bronze}–${silver - 1}%`,
  };
}

export default function HomeScreen() {
  const { userId } = useAuth();
  return <OwnedRoadmap key={userId || "signed-out"} />;
}

function OwnedRoadmap() {
  const isFocused = useIsFocused();
  const { userId: authUserId, sessionId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const focusOwner = `${authUserId || ""}:${sessionId || ""}`;
  const autoFocus = useRoadmapFocus(focusOwner, isFocused);
  const [journeyFontsReady] = useFonts({ RoadmapInter: require("../../assets/module0/Inter-Regular.ttf"), RoadmapInterBold: require("../../assets/module0/Inter-Bold.ttf") });
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    focusSessionSlug?: string | string[];
    focusSessionToken?: string | string[];
  }>();
  const rawFocusSessionSlug = searchParams.focusSessionSlug;
  const rawFocusSessionToken = searchParams.focusSessionToken;
  const focusSessionSlug = Array.isArray(rawFocusSessionSlug)
    ? rawFocusSessionSlug[0]
    : rawFocusSessionSlug;
  const focusSessionToken = Array.isArray(rawFocusSessionToken)
    ? rawFocusSessionToken[0]
    : rawFocusSessionToken;
  const explicitIntent = useRef({ key: "", slug: undefined as string | undefined });
  explicitIntent.current = { key: [focusSessionSlug, focusSessionToken].join(":"), slug: focusSessionSlug };
  const consumedExplicitIntent = useRef<string | null>(null);
  const visitExplicitSlug = useRef<string | null>(null);
  const [module0, setModule0] = useState<Module0Summary | null>(null);
  const loadEpoch = useRef(0);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const [loadedRoadmapEpoch, setLoadedRoadmapEpoch] = useState(0);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [journeySummary, setJourneySummary] = useState<TodayResponse | null>(null);
  const [recommendedSlug, setRecommendedSlug] = useState<string | null>(null);
  const [selectedOverview, setSelectedOverview] = useState<SessionOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewVisible, setOverviewVisible] = useState(false);
  const [evaluationDetailsVisible, setEvaluationDetailsVisible] = useState(false);
  const [briefingVisible, setBriefingVisible] = useState(false);
  const [preceptorMessages, setPreceptorMessages] = useState<PreceptorChatMessage[]>([]);
  const [preceptorInput, setPreceptorInput] = useState("");
  const [preceptorSending, setPreceptorSending] = useState(false);
  const [preceptorError, setPreceptorError] = useState<string | null>(null);
  const [animatingMilestoneIds, setAnimatingMilestoneIds] = useState<Set<string>>(() => new Set());
  const { voiceEnabled: mentorVoiceEnabled, setVoiceEnabled: setMentorVoiceEnabled } =
    useVoicePreference();
  const preceptorDialogueRef = useRef<ScrollView | null>(null);
  const followPreceptor = useRef(true);
  const milestoneAnimationRefs = useRef<Record<string, Animated.Value>>({});
  const preceptorTranscription = useEnglishSpeechTranscription({
    enabled: isFocused && briefingVisible,
    scopeKey: `${user?.id}:${selectedOverview?.slug}:${briefingVisible}`,
    onText: setPreceptorInput,
    onError: () => setPreceptorError("Could not transcribe audio. Please try again or type your question."),
  });
  const mentorSpeech = useSpeechPlayback({
    voice: MENTOR_TTS_VOICE,
    enabled: isFocused && mentorVoiceEnabled && briefingVisible,
    scopeKey: `${user?.id}:${selectedOverview?.slug}:${briefingVisible}`,
    onError: () => {
      // Keep mentor chat usable when TTS is unavailable.
    },
  });
  const [autoOpenedSessionKey, setAutoOpenedSessionKey] = useState<string | null>(null);

  const userHeaders = useMemo<Record<string, string>>(() => ({ expectedUserId: user?.id || "" }), [user?.id]);

  const milestoneStorageKey = useMemo(() => {
    const userKey = user?.id || "anonymous";
    return `${SEEN_MILESTONES_STORAGE_KEY_PREFIX}:${userKey}`;
  }, [userHeaders]);

  const displayName = useMemo(() => {
    const info =
      user?.firstName ||
      user?.fullName?.split(/\s+/)[0] ||
      user?.username ||
      user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
      null;

    return info ? info.charAt(0).toUpperCase() + info.slice(1) : null;
  }, [user]);

  const loadRoadmap = useCallback(async () => {
    if (!userLoaded) {
      setLoadingRoadmap(true);
      return;
    }

    if (!user?.id) {
      setRoadmapError("Your session is unavailable. Sign in again to load your Roadmap.");
      setRecommendedSlug(null);
      setLearningPaths([]);
      setJourneySummary(null);
      setLoadingRoadmap(false);
      return;
    }

    const epoch = ++loadEpoch.current;
    let assertSession: () => void;
    try { assertSession = captureSession(user.id); }
    catch { setRoadmapError("Your session is unavailable. Sign in again to load your Roadmap."); setLearningPaths([]); setModule0(null); setJourneySummary(null); setLoadedRoadmapEpoch(epoch); setLoadingRoadmap(false); return; }
    const current = () => { try { assertSession(); return epoch === loadEpoch.current; } catch { return false; } };
    try {
      setRoadmapError(null);
      setLoadingRoadmap(true);
      const data = await api.getLearningPaths(userHeaders);
      const parsed = normalizeLearningPathsResponse(data);
      if (!current()) return;
      setLearningPaths(parsed);
      try {
        const todayData = await api.getToday(userHeaders);
        if (!current()) return;
        setJourneySummary(todayData || null);
        setRecommendedSlug(todayData?.recommendedEncounter?.patientSessionSlug || null);
        setModule0(todayData?.module0 || null);
      } catch (err: any) {
        if (!current()) return;
        throw err;
      }
    } catch (err: any) {
      if (!current()) return;
      setRecommendedSlug(null);
      setRoadmapError(err?.status === 403 ? "You are not authorized to view this Roadmap. Use account settings to sign out or contact support." : err?.status === 401 ? "Your session is unavailable. Sign in again to continue." : err?.status >= 500 ? "The learning service is unavailable. Please retry shortly." : err?.message?.includes("invalid response") ? "The learning service returned an invalid response. Please retry." : "Could not load your Roadmap. Check your connection and retry.");
      setLearningPaths([]);
      setJourneySummary(null);
      setModule0(null);
    } finally {
      if (current()) { setLoadedRoadmapEpoch(epoch); setLoadingRoadmap(false); }
    }
  }, [userHeaders, userLoaded]);

  useFocusEffect(
    useCallback(() => {
      const intent = explicitIntent.current;
      visitExplicitSlug.current = intent.slug && consumedExplicitIntent.current !== intent.key ? intent.slug : null;
      if (intent.slug) consumedExplicitIntent.current = intent.key;
      autoFocus.controller.begin(focusOwner);
      loadRoadmap();
      return () => { autoFocus.controller.end(); ++loadEpoch.current; };
    }, [loadRoadmap, focusOwner, autoFocus.controller])
  );

  useEffect(() => {
    if (!isFocused || loadingRoadmap || loadedRoadmapEpoch !== loadEpoch.current || !userLoaded || !journeyFontsReady) return;
    autoFocus.controller.ready(focusOwner, roadmapError ? null : roadmapFocusTarget(learningPaths, module0, recommendedSlug, visitExplicitSlug.current));
  }, [isFocused, loadingRoadmap, loadedRoadmapEpoch, userLoaded, journeyFontsReady, learningPaths, module0, recommendedSlug, focusSessionSlug, roadmapError, focusOwner, autoFocus.controller]);

  const explicitFocusKey = [focusSessionSlug, focusSessionToken].join(":");
  const previousExplicitFocus = useRef(explicitFocusKey);
  useEffect(() => {
    if (previousExplicitFocus.current === explicitFocusKey) return;
    previousExplicitFocus.current = explicitFocusKey;
    if (!focusSessionSlug || !isFocused) return;
    consumedExplicitIntent.current = explicitFocusKey;
    visitExplicitSlug.current = focusSessionSlug;
    if (!loadingRoadmap) autoFocus.controller.explicit(roadmapFocusTarget(learningPaths, module0, recommendedSlug, focusSessionSlug));
  }, [explicitFocusKey, focusSessionSlug, isFocused, loadingRoadmap, learningPaths, module0, recommendedSlug, autoFocus.controller]);

  useEffect(() => {
    if (loadingRoadmap || learningPaths.length === 0) return;

    let isMounted = true;
    const achievedMilestoneIds = learningPaths
      .flatMap((path) => path.units)
      .filter(isRotationMastered)
      .map((unit) => unit.id);

    if (achievedMilestoneIds.length === 0) return;

    const animateNewMilestones = async () => {
      const stored = await getItemAsync(milestoneStorageKey);
      let seenIds: string[] = [];

      try {
        seenIds = stored ? JSON.parse(stored) : [];
      } catch {
        seenIds = [];
      }

      const seenSet = new Set(seenIds);
      const newMilestoneIds = achievedMilestoneIds.filter((id) => !seenSet.has(id));
      if (!isMounted || newMilestoneIds.length === 0) return;

      const nextSeenIds = Array.from(new Set([...seenIds, ...newMilestoneIds]));
      await setItemAsync(milestoneStorageKey, JSON.stringify(nextSeenIds));

      setAnimatingMilestoneIds((current) => new Set([...current, ...newMilestoneIds]));

      newMilestoneIds.forEach((id) => {
        const scale = milestoneAnimationRefs.current[id] || new Animated.Value(1);
        milestoneAnimationRefs.current[id] = scale;
        scale.setValue(1);
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.14,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.96,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setAnimatingMilestoneIds((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
          });
        });
      });
    };

    void animateNewMilestones();

    return () => {
      isMounted = false;
    };
  }, [learningPaths, loadingRoadmap, milestoneStorageKey]);

  const openSessionOverview = useCallback(async (session: RoadmapSession) => {
    if (session.status === "locked" || session.entryBlocked) return;

    setOverviewVisible(true);
    setOverviewLoading(true);
    setOverviewError(null);
    setSelectedOverview(null);
    setEvaluationDetailsVisible(false);

    try {
      const data = await api.getPatientSessionOverview(session.slug, userHeaders);
      setSelectedOverview(data);
    } catch (err: any) {
      setOverviewError(err?.message || "Failed to load session overview.");
    } finally {
      setOverviewLoading(false);
    }
  }, [userHeaders]);

  useEffect(() => {
    if (!isFocused || !focusSessionSlug || loadingRoadmap || overviewVisible || briefingVisible) return;

    const focusKey = `${focusSessionSlug}:${focusSessionToken || ""}`;
    if (autoOpenedSessionKey === focusKey) return;

    const session = learningPaths
      .flatMap((path) => path.units)
      .flatMap((unit) => unit.sessions)
      .find((candidate) => candidate.slug === focusSessionSlug);

    if (!session || session.status === "locked" || session.entryBlocked) return;

    setAutoOpenedSessionKey(focusKey);
    openSessionOverview(session);
  }, [
    autoOpenedSessionKey,
    isFocused,
    briefingVisible,
    focusSessionSlug,
    focusSessionToken,
    learningPaths,
    loadingRoadmap,
    openSessionOverview,
    overviewVisible,
  ]);

  const startSelectedSession = () => {
    setOverviewVisible(false);
    setPreceptorMessages([{ role: "assistant", content: INITIAL_PRECEPTOR_BRIEFING }]);
    setPreceptorInput("");
    setPreceptorError(null);
    setBriefingVisible(true);
  };

  const briefMissionText = (overview: SessionOverview) => {
    const requiresHpi = Boolean(overview.workflow?.requiresHpi ?? overview.requiresHpi);
    if (requiresHpi) {
      return "Complete a focused clinical encounter and submit a concise history summary.";
    }
    if (overview.requiresHpi === false || overview.workflow?.requiresHpi === false) {
      return "Begin the encounter professionally, build rapport, and identify the patient’s main concern.";
    }
    return patientFacingText(overview.description) || "Prepare for a focused patient encounter.";
  };

  const sendPreceptorMessage = async (messageOverride?: string) => {
    const text = (typeof messageOverride === "string" ? messageOverride : preceptorInput).trim();
    if (!text || !selectedOverview || preceptorSending) return;

    const nextMessages: PreceptorChatMessage[] = [
      ...preceptorMessages,
      { role: "user", content: text },
    ];

    setPreceptorMessages(nextMessages);
    setPreceptorInput("");
    setPreceptorError(null);
    setPreceptorSending(true);
    void mentorSpeech.stop();
    const isSpeechCurrent = mentorSpeech.capture();

    try {
      const data = await api.sendPreceptorChatMessage(
        selectedOverview.slug,
        {
          message: text,
          messages: preceptorMessages,
        },
        userHeaders
      );
      const reply = String(data?.reply || "").trim();
      const assistantReply =
        reply ||
        "Focus on greeting the patient professionally and inviting them to share their main concern.";
      setPreceptorMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: assistantReply,
        },
      ]);
      if (mentorVoiceEnabled) {
        void mentorSpeech.speak(assistantReply, undefined, isSpeechCurrent);
      }
    } catch (err: any) {
      setPreceptorError(err?.message || "Dr. Martinez could not respond right now.");
    } finally {
      setPreceptorSending(false);
    }
  };

  const meetPatient = () => {
    void mentorSpeech.stop();
    const caseId = selectedOverview?.linkedCase?.caseId || "uti_level1";
    setBriefingVisible(false);
    router.push({
      pathname: "/(tabs)/level1",
      params: {
        caseId,
        patientSessionSlug: selectedOverview?.slug || "first-patient",
        requiresHpi: String(Boolean(selectedOverview?.workflow?.requiresHpi ?? selectedOverview?.requiresHpi)),
      },
    });
  };

  const preceptorName = selectedOverview?.preceptorPersona?.name || "Dr. Martinez";
  const preceptorSpecialty =
    selectedOverview?.preceptorPersona?.specialty || "Clinical Preceptor";
  const preceptorSlug = selectedOverview?.preceptorPersona?.slug || "dr-martinez";
  const welcomeMessage =
    preceptorMessages.find((message) => message.role === "assistant")?.content ||
    INITIAL_PRECEPTOR_BRIEFING;
  const conversationMessages =
    preceptorMessages[0]?.role === "assistant" ? preceptorMessages.slice(1) : preceptorMessages;
  const scrollPreceptorDialogueToEnd = useCallback(() => {
    if (briefingVisible && (conversationMessages.length > 0 || preceptorSending) && followPreceptor.current) preceptorDialogueRef.current?.scrollToEnd({ animated: true });
  }, [briefingVisible, conversationMessages.length, preceptorSending]);
  useEffect(() => { if (briefingVisible) followPreceptor.current = true; }, [briefingVisible]);

  useEffect(() => {
    if (!briefingVisible) return;
    scrollPreceptorDialogueToEnd();
  }, [
    briefingVisible,
    conversationMessages.length,
    preceptorSending,
    scrollPreceptorDialogueToEnd,
  ]);

  const layoutEpoch = loadEpoch.current;
  return (
    <SafeAreaView style={roadmapStyles.screen}>
      <RoadmapHeader identity={journeySummary?.identity} />
      <View style={progressLayout.scroll}>
      <ScrollView ref={autoFocus.scroll} testID="roadmap-scroll" style={[progressLayout.scroll, { opacity: autoFocus.visible && !loadingRoadmap ? 1 : 0 }]} onLayout={event => autoFocus.controller.viewport(event.nativeEvent.layout.height)} onScrollBeginDrag={autoFocus.controller.cancel} onTouchStart={autoFocus.controller.cancel} onWheel={autoFocus.controller.cancel} {...({ onKeyDown: (event: any) => { if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) autoFocus.controller.cancel(); } } as any)} showsVerticalScrollIndicator={false} contentContainerStyle={roadmapStyles.content}>
        {(!loadingRoadmap && journeyFontsReady) && <JourneyCanvas key={loadEpoch.current} scenery={RoadmapScenery} foundation={!!module0} onFocusMeasure={(id, box) => { if (layoutEpoch === loadEpoch.current) autoFocus.controller.measure(id, box); }} onCanvasLayout={box => { if (layoutEpoch === loadEpoch.current) autoFocus.controller.canvas(box); }}>
        <RoadmapFoundation summary={module0} />

        {loadingRoadmap ? (
          <View style={casesStyles.loadingBlock}>
            <ActivityIndicator />
          </View>
        ) : roadmapError ? (
          <View style={casesStyles.inlineErrorBox}>
            <Text style={casesStyles.errorText}>{roadmapError}</Text>
            <Pressable onPress={loadRoadmap} style={casesStyles.retryButton}>
              <Text style={casesStyles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : learningPaths.length === 0 ? (
          <Text style={casesStyles.emptyText}>No learning paths found.</Text>
        ) : (
          <RoadmapJourney paths={learningPaths} onSessionPress={session => { autoFocus.controller.cancel(); openSessionOverview(session); }}
            recommendedSlug={recommendedSlug}
            milestoneScales={milestoneAnimationRefs.current} />
        )}

        </JourneyCanvas>}
      </ScrollView>
      {(!autoFocus.visible || loadingRoadmap) && <View testID="roadmap-positioning" pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}><ActivityIndicator accessibilityLabel="Loading current Roadmap destination" /></View>}
      </View>

      <PatientBrief
        visible={overviewVisible} loading={overviewLoading} error={overviewError} overview={selectedOverview}
        mission={selectedOverview ? briefMissionText(selectedOverview) : ""} preceptorName={preceptorName}
        evaluationExpanded={evaluationDetailsVisible} onToggleEvaluation={() => setEvaluationDetailsVisible(visible => !visible)}
        weights={selectedOverview ? achievementWeightLabels(selectedOverview.achievements) : []}
        thresholds={selectedOverview ? badgeThresholdLabels(selectedOverview.badgeThresholds) : { gold: "", silver: "", bronze: "" }}
        hasPreviousAttempts={!!previousAttemptsRoute(selectedOverview)}
        onPreviousAttempts={() => {
          const destination = previousAttemptsRoute(selectedOverview);
          if (!destination) return;
          setOverviewVisible(false);
          router.push(destination);
        }}
        onClose={() => setOverviewVisible(false)} onMeetPreceptor={startSelectedSession}
      />
      <MeetPreceptor visible={briefingVisible && !!selectedOverview} name={preceptorName} role={preceptorSpecialty} slug={preceptorSlug}
        speaking={mentorSpeech.isSpeaking} welcome={welcomeMessage} messages={conversationMessages} suggestions={PRECEPTOR_QUICK_ACTIONS}
        voiceEnabled={mentorVoiceEnabled} onToggleVoice={() => { if (mentorVoiceEnabled) void mentorSpeech.stop(); setMentorVoiceEnabled(current => !current); }}
        input={preceptorInput} onChangeInput={setPreceptorInput} sending={preceptorSending} error={preceptorError} onAsk={sendPreceptorMessage}
        onMic={preceptorTranscription.toggleRecording} recording={preceptorTranscription.isRecording} transcribing={preceptorTranscription.transcribing} recordingBusy={preceptorTranscription.recordingBusy}
        onClose={() => setBriefingVisible(false)} onBack={() => setBriefingVisible(false)} onMeetPatient={meetPatient}
        dialogueRef={preceptorDialogueRef} onContentSizeChange={scrollPreceptorDialogueToEnd}
        onScroll={event => { const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent; followPreceptor.current = contentSize.height - layoutMeasurement.height - contentOffset.y <= 48; }}
      />
    </SafeAreaView>
  );
}
