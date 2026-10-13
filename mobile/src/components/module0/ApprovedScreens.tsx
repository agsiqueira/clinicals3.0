import React, { useRef } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFonts } from "expo-font";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LessonActivity, LessonStep, LessonProgress, LessonResult } from "../../types/clinicalReadiness";
import { oldCartsPanels, conceptPanelsFor, conceptTitle, responseAudioTooLong } from "./teaching";
import { lessonPosition, exerciseTitle, activityIntroductions, provisionalOpeningChoices } from "./presentation";
import { module0Colors as c } from "./tokens";
import { ClinicalsChatComposer } from "../ClinicalsChatComposer";
import { PracticeTask } from "./PracticeTask";

export type ApprovedScreen = "review" | "exercise-transition" | "old-carts-teach" | "welcome" | "introduction" | "teach" | "practice" | "feedback" | "clarify" | "activity-complete" | "resume" | "module-complete";
const artwork = {
  welcome: require("../../../assets/module0/b0c87.png"),
  consultation: require("../../../assets/module0/b698e.png"),
  avatar: require("../../../assets/module0/60b41.png"),
  conversation: require("../../../assets/module0/2a5ba.svg"),
  book: require("../../../assets/module0/ef2e9.svg"),
  list: require("../../../assets/module0/6b92c.svg"),
  clock: require("../../../assets/module0/b9b5b.svg"),
  back: require("../../../assets/module0/54086.svg"),
  close: require("../../../assets/module0/97c37.svg"),
  number1: require("../../../assets/module0/603c6.svg"),
  number2: require("../../../assets/module0/be7a8.svg"),
  audioBackground: require("../../../assets/module0/d187d.svg"),
  audio: require("../../../assets/module0/26572.svg"),
  radioOutline: require("../../../assets/module0/afbee.svg"),
  radioInside: require("../../../assets/module0/eac06.svg"),
  message: require("../../../assets/module0/a89ed.svg"),
  feedback: require("../../../assets/module0/8f4ba.svg"),
  complete: require("../../../assets/module0/7386f.svg"),
  trophy: require("../../../assets/module0/06da8.png"),
  check: require("../../../assets/module0/67307.svg"),
  send: require("../../../assets/module0/96175.svg"),
  sendBackground: require("../../../assets/module0/42c63.svg"),
};
const conceptArtwork = {
  "soap-overview": require("../../../assets/module0/soap-overview.png"),
  "subjective-patient-report": require("../../../assets/module0/subjective-patient-report.png"),
  "objective-exam-findings": require("../../../assets/module0/objective-exam-findings.png"),
  "assessment-clinical-reasoning": require("../../../assets/module0/assessment-clinical-reasoning.png"),
  "plan-next-steps": require("../../../assets/module0/plan-next-steps.png"),
  "medical-history-context": require("../../../assets/module0/medical-history-context.png"),
  "review-of-systems": require("../../../assets/module0/review-of-systems.png"),
  "mentor-consultation": require("../../../assets/module0/mentor-consultation.png"),
  "clinical-differential-map": require("../../../assets/module0/clinical-differential-map.png"),
  "learner-clinical-learning-cycle": require("../../../assets/module0/learner-clinical-learning-cycle.png"),
  "patient-data-to-summary": require("../../../assets/module0/patient-data-to-summary.png"),
  "narrowing-the-differential": require("../../../assets/module0/narrowing-the-differential.png"),
  "mentorship-questions": require("../../../assets/module0/mentorship-questions.png"),
  "self-directed-learning": require("../../../assets/module0/self-directed-learning.png"),
  "history-medications-allergies": require("../../../assets/module0/history-medications-allergies.png"),
  "history-surgical-family-context": require("../../../assets/module0/history-surgical-family-context.png"),
  "history-social-environmental-context": require("../../../assets/module0/history-social-environmental-context.png"),
  "ros-systematic-symptom-questions": require("../../../assets/module0/ros-systematic-symptom-questions.png"),
  "ros-symptoms-in-history": require("../../../assets/module0/ros-symptoms-in-history.png"),
  "focused-examination-purpose": require("../../../assets/module0/focused-examination-purpose.png"),
  "focused-examination-guided-by-history": require("../../../assets/module0/focused-examination-guided-by-history.png"),
  "focused-findings-support-challenge-v2": require("../../../assets/module0/focused-findings-support-challenge-v2.png"),
  "clinical-reasoning-possibilities": require("../../../assets/module0/clinical-reasoning-possibilities.png"),
};
const conceptArtworkDescriptions = {
  "history-medications-allergies": "A clinician discusses medication and allergy history with an older patient, alongside medicine and allergy symbols.",
  "history-surgical-family-context": "A clinician asks an older patient about prior surgery and family health, with surgical and family-tree motifs.",
  "history-social-environmental-context": "A clinician and older patient discuss daily life, with home, work, and social-support symbols.",
  "ros-systematic-symptom-questions": "A clinician asks a patient about symptoms across body systems, illustrated by a body silhouette and organ symbols.",
  "ros-symptoms-in-history": "A clinician listens to reported symptoms and records the history, with symptom and timeline motifs.",
  "focused-examination-purpose": "A clinician performs a focused chest examination on a seated patient using a stethoscope.",
  "focused-examination-guided-by-history": "A clinician discusses a relevant chest examination with a patient, alongside a chest and lung illustration.",
  "focused-findings-support-challenge-v2": "A clinician listens to an older patient’s lungs with a stethoscope, alongside lung and sound symbols marked with a check and a question.",
  "clinical-reasoning-possibilities": "A clinical mentor and learner discuss possible explanations, with a thought-network and evidence symbols.",
  "medical-history-context": "A health record is connected to medication, allergy, family, and daily-life history symbols.",
  "review-of-systems": "A body silhouette and organ symbols represent body systems reviewed through patient-reported symptoms.",
  "clinical-differential-map": "A learner considers multiple clinical possibilities represented by different body-system cards.",
  "assessment-clinical-reasoning": "A clinician considers patient information and connected evidence symbols while forming a clinical interpretation."
};
type Props = {
  screen: ApprovedScreen; activity: LessonActivity; step: LessonStep;
  selected: string; onSelect: (value: string) => void;
  onContinue: () => void; onBack: () => void; onLeave: () => void;
  exitPrompt?:boolean; onCancelExit?:()=>void; onConfirmExit?:()=>void;
  onFreeText: () => void; onClarify: () => void;
  onListen: () => void; onStopAudio: () => void;
  isSpeaking: boolean; busy: boolean; disabled: boolean; error?: string | null;
  // Deterministic system chrome in the local visual fixture; never learner data.
  referenceChrome?: boolean;
  progress?: LessonProgress; result?: LessonResult | null;
  onReview?: () => void; onMicPress?: () => void; isRecording?: boolean;
  onReviewExercise?: (activityId:string, stepId:string, practice:boolean) => void;
  textMode?: boolean; kind?: LessonResult["kind"]; history?: LessonResult[];
  retryWait?: number; onRetry?: () => void; onRefresh?: () => void;
  onChoose?: (activityId: string, stepId?: string, kind?: LessonResult["kind"]) => void;
  navigationOpen?: boolean; onToggleNavigation?: () => void;
  voiceEnabled?: boolean; onToggleVoice?: () => void;
  transcribing?: boolean; micDisabled?: boolean;
  teachingPanel?: number; narration?: string; captions?: boolean; onToggleCaptions?: () => void;
  caseFactsExpanded?: boolean; onToggleCaseFacts?: () => void;
  muted?: boolean; onToggleMute?: () => void; isPaused?: boolean; onPause?: () => void; onPlay?: () => void; audioError?: string | null;
  clarificationContext?: { activityTitle: string; exerciseTitle: string; panelTitle: string | null };
};
function Art({ source, width, height }: { source: number; width: number; height: number }) {
  return <Image source={source} contentFit="contain" style={{ width, height }} accessibilityElementsHidden importantForAccessibility="no" />;
}
function Button({ label, onPress, disabled = false, buttonRef }: { label: string; onPress: () => void; disabled?: boolean; buttonRef?:React.Ref<React.ElementRef<typeof View>> }) {
  return <Pressable ref={buttonRef} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, pressed && s.pressed, disabled && s.disabled]}>
    <Text style={s.buttonText}>{label}</Text>
  </Pressable>;
}
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
function IconControl({ label, icon, onPress, active=false, disabled=false }: {label:string;icon:IconName;onPress?:()=>void;active?:boolean;disabled?:boolean}) {
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,selected:active}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.iconControl,active && s.iconActive,disabled && s.iconDisabled,pressed && s.pressed]}><MaterialCommunityIcons name={icon} size={24} color={active ? c.primary : c.body} /></Pressable>;
}
function MentorAudio(p: Props & { compact?: boolean }) {
 const {height,width}=useWindowDimensions();
 const narrow = p.compact && width < 360;
 const unavailable=p.busy || p.disabled || !!p.progress?.pending;
 const responseTooLong=responseAudioTooLong(p.screen,p.narration);
 const askAvailable=["teach","old-carts-teach","practice","feedback"].includes(p.screen);
 if (!p.narration && !askAvailable) return null;
 const ask = askAvailable && <Pressable accessibilityRole="button" accessibilityLabel="Ask Dr. Martinez" accessibilityState={{disabled:unavailable}} disabled={unavailable} onPress={p.onClarify} style={({pressed})=>[s.askMentor,p.compact && s.compactAsk,unavailable && s.iconDisabled,pressed && s.pressed]}>
   <Image source={artwork.avatar} contentFit="contain" style={p.compact ? s.compactAvatar : s.stripAvatar} accessibilityElementsHidden importantForAccessibility="no"/><Text numberOfLines={p.compact ? 1 : undefined} style={[s.askMentorText,p.compact && s.compactMentorText]}>Ask Dr. Martinez</Text>
  </Pressable>;
 const controls = !!p.narration && <View style={[s.narrationControls,narrow && s.narrowNarrationControls]}>
   <IconControl label={p.isSpeaking ? "Pause narration" : "Play narration"} icon={p.isSpeaking ? "pause" : "play"} onPress={p.isSpeaking ? p.onPause : p.onPlay || p.onListen} active={p.isSpeaking || p.isPaused} disabled={unavailable || (!p.isSpeaking && responseTooLong)}/>
   <IconControl label={p.muted ? "Unmute narration" : "Mute narration"} icon={p.muted ? "volume-off" : "volume-high"} onPress={p.onToggleMute} active={p.muted}/>
   <IconControl label={p.captions ? "Hide captions" : "Show captions"} icon="closed-caption" onPress={p.onToggleCaptions} active={p.captions}/>
 </View>;
 return <View style={s.narrationArea}>
  {p.compact ? <View style={[s.compactMentorRow,narrow && s.narrowMentorRow]}>{ask}{controls}</View> : ask}
  {p.captions && <ScrollView style={[s.captionPanel,height<700 && {maxHeight:64}]} contentContainerStyle={s.captionContent} nestedScrollEnabled><Text selectable accessibilityLabel="Narration captions" style={s.captionText}>{p.narration}</Text></ScrollView>}
  {p.audioError && <Text accessibilityRole="alert" style={s.lessonHint}>{p.audioError}</Text>}
  {responseTooLong && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.lessonHint}>Audio playback is unavailable because this response is too long.</Text>}
  {!p.compact && controls && <View style={s.narrationRow}>{controls}</View>}
 </View>;
}
function Checklist({ labels, module }: { labels: string[]; module?: boolean }) {
  return <View style={[s.checklist, module && s.moduleChecklist]}>{labels.map((label, i) => <View key={`${i}:${label}`} style={s.checkRow}>
    <Art source={artwork.check} width={20} height={20} /><Text style={s.checkText}>{label}</Text>
  </View>)}</View>;
}
function SavedFeedback({ result }: { result: LessonResult }) {
  return <View style={s.lessonCard}><Text style={s.lessonHeading}>{result.evaluation.label || "Dr. Martinez · Clarification"}</Text><Text style={s.lessonText}>{result.evaluation.feedback || result.evaluation.reply}</Text>{result.evaluation.evidence?.map((e,i) => <Text key={i} selectable style={s.lessonHint}>Your response: “{e}”</Text>)}</View>;
}
function Shell({children,header,footer,referenceChrome,contentKey,practice}:{children:React.ReactNode;header:React.ReactNode;footer:React.ReactNode;referenceChrome?:boolean;contentKey:string;practice?:boolean}) {
 const insets=useSafeAreaInsets();
 return <View style={s.root}><View style={s.frame}>
  <View style={[s.fixedHeader,{paddingTop:Math.max(referenceChrome ? 44 : 0,insets.top)}]}>
   {referenceChrome && <View pointerEvents="none" style={s.status}><Text style={s.statusText}>9:41</Text><Text style={s.statusText}>●　 ▰</Text></View>}{header}
  </View>
  <KeyboardAvoidingView style={s.body} behavior={Platform.OS === "ios" ? "padding" : practice && Platform.OS === "android" ? "height" : undefined}>
   <ScrollView key={contentKey} style={s.body} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.scroll}><View style={[s.shell,{paddingBottom:20}]}>{children}</View></ScrollView>
   <View style={[s.dock,{paddingBottom:Math.max(16,insets.bottom)}]}>{footer}</View>
  </KeyboardAvoidingView>
 </View></View>;
}
export function ApprovedScreens(props: Props) {
  const cancelExitRef=useRef<React.ElementRef<typeof View>>(null);
  const { width, height } = useWindowDimensions();
  const oldCarts = props.step.id === "organize-old-carts";
  const lessonPanel = props.teachingPanel || 0;
  const panels = conceptPanelsFor(props.step);
  const conceptScreen = props.screen === "teach" || props.screen === "old-carts-teach";
  const panel = panels[lessonPanel];
  const illustrationWidth = Math.min(panel?.rows.length > 1 ? 196 : panel?.rows.length ? 236 : 258, width - 64, Math.max(160, height * (panel?.rows.length > 1 ? 0.23 : 0.3)));
  const trophySize = Math.min(326, width - 44);
  const feedbackWidth = Math.min(274,width-60,height < 700 ? 160 : 274);
  const [fontsLoaded, fontError] = useFonts({
    Module0Inter: require("../../../assets/module0/Inter-Regular.ttf"),
    Module0InterMedium: require("../../../assets/module0/Inter-Medium.ttf"),
    Module0InterSemiBold: require("../../../assets/module0/Inter-SemiBold.ttf"),
    Module0InterBold: require("../../../assets/module0/Inter-Bold.ttf"),
  });
  if (!fontsLoaded && !fontError) return <View style={s.loading}><ActivityIndicator accessibilityLabel="Loading lesson typography" /></View>;
  const p = props;
  const nextActivity = p.progress?.activities.find(a => a.id === p.progress?.next?.activityId);
  const nextStep = nextActivity?.steps.find(step => step.id === p.progress?.next?.stepId);
  const completedSteps = p.activity.steps.filter(step => step.completed);
  const opening = p.activity.id === "starting-the-encounter" && p.step.id === "open-the-interview";
  const feedbackHeading = <Text accessibilityRole="header" style={s.feedbackTitle}>{p.result?.evaluation.label === "Ready" && opening ? "That's a strong opening!" : p.result?.evaluation.label || "Practice feedback"}</Text>;
  const position=lessonPosition(p.progress,p.activity,p.step);
  let bottom:React.ReactNode=null;
  const dock=(node:React.ReactNode)=>{bottom=node;return null;};
  const footer = (label: string) => dock(<View style={s.footer}><MentorAudio {...p}/>
    
    {p.error && <Text accessibilityRole="alert" style={s.error}>{p.error}</Text>}
    <Button label={p.busy ? "Preparing feedback…" : label} onPress={p.onContinue} disabled={p.disabled || p.busy || (p.screen === "practice" && !p.selected)} />
  </View>);
  const hasHeader = true;
  const header = hasHeader && <>
    <View style={s.navigationBar}><IconControl label="Back" icon="arrow-left" onPress={p.onBack} disabled={p.busy || p.disabled || !!p.progress?.pending}/><Text numberOfLines={2} style={s.lessonIdentifier}>{p.screen === "review" ? "Review & Practice" : p.screen === "introduction" || p.screen === "activity-complete" ? p.activity.title : conceptTitle(p.step,p.activity)}</Text><IconControl label="Close lesson" icon="close" onPress={p.onLeave}/></View>
    <View style={s.lessonProgress}><View accessibilityRole="progressbar" accessibilityLabel={conceptScreen ? "Teaching panel progress" : "Saved exercise progress"} accessibilityValue={conceptScreen ? {min:1,max:panels.length,now:lessonPanel+1} : {min:0,max:position.exerciseTotal,now:position.completedCount}} style={[s.track,{marginTop:0}]}><View style={[s.fill,{width:((conceptScreen ? (lessonPanel+1)/panels.length : position.exerciseTotal ? Math.min(1,position.completedCount/position.exerciseTotal) : 0)*100 + "%") as `${number}%`}]} /></View><Text style={s.panelCount}>{conceptScreen ? lessonPanel+1 : position.exerciseNumber}/{conceptScreen ? panels.length : position.exerciseTotal}</Text></View>
  </>;
  const caseFacts = p.progress?.scenario && <View style={[s.practiceReference,["history-and-context","review-of-systems"].includes(p.step.id) && {backgroundColor:c.reply}]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Mr. Jones · Case facts" accessibilityState={{expanded:!!p.caseFactsExpanded}} aria-expanded={!!p.caseFactsExpanded} onPress={p.onToggleCaseFacts}
      style={(state)=>[s.caseFactsHeader,Platform.OS === "web" && (state as {pressed:boolean;focused?:boolean}).focused && s.caseFactsFocus,state.pressed && s.pressed]}>
      <Text style={s.practiceReferenceLabel}>Mr. Jones · Patient facts</Text><MaterialCommunityIcons name={p.caseFactsExpanded ? "chevron-up" : "chevron-down"} size={22} color={c.primary}/>
    </Pressable>
    {p.caseFactsExpanded && <View style={s.practiceFacts}><Text selectable style={s.practiceCopy}>{p.progress.scenario.text}</Text><Text style={s.lessonHint}>{p.progress.scenario.purpose}</Text></View>}
  </View>;
  const content=<>
    {p.screen === "review" && p.progress && <View style={s.response}>
      <Text accessibilityRole="header" style={s.responseTitle}>Review &amp; Practice</Text>
      <Text style={s.lessonText}>Review the teaching, saved answer, and feedback. Practice Again uses the existing targeted practice question; your original answer and completion stay saved.</Text>
      {p.progress.pending && <View><Text accessibilityRole="alert" style={s.lessonHint}>A saved feedback request is pending. Resume it before starting another attempt.</Text><Pressable accessibilityRole="button" onPress={()=>p.onChoose?.(p.progress!.pending!.activityId,p.progress!.pending!.stepId,p.progress!.pending!.kind)} style={s.control}><Text style={s.controlText}>Resume saved request</Text></Pressable></View>}
      {p.progress.activities.map(a=><View key={a.id} style={s.lessonCard}>
        <Text accessibilityRole="header" style={s.lessonHeading}>{a.title}</Text>
        {a.steps.map(step=><View key={step.id}>
          <Text style={s.lessonText}>{exerciseTitle(step,a)}</Text>
          <View style={s.responseTools}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Review: ${exerciseTitle(step,a)}`} accessibilityState={{disabled:!step.completed || p.busy || p.disabled || !!p.progress?.pending}} disabled={!step.completed || p.busy || p.disabled || !!p.progress?.pending} onPress={()=>p.onReviewExercise?.(a.id,step.id,false)} style={s.control}><Text style={s.controlText}>Review</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Practice Again: ${exerciseTitle(step,a)}`} accessibilityState={{disabled:!step.completed || p.busy || p.disabled || !!p.progress?.pending}} disabled={!step.completed || p.busy || p.disabled || !!p.progress?.pending} onPress={()=>p.onReviewExercise?.(a.id,step.id,true)} style={s.control}><Text style={s.controlText}>Practice Again</Text></Pressable>
          </View>
          {!step.completed && <Text style={s.lessonHint}>Not yet completed</Text>}
        </View>)}
      </View>)}
    </View>}
    {!oldCarts && !conceptScreen && ["feedback","exercise-transition"].includes(p.screen) && <View style={s.lessonHierarchy}>
     <Text style={s.activityLabel}>Activity {position.activityNumber} of {position.activityTotal} — {p.activity.title}</Text>
     <Text style={s.exerciseHierarchy}>Exercise {position.exerciseNumber} of {position.exerciseTotal} — {exerciseTitle(p.step,p.activity)}</Text>
    </View>}
    {p.screen === "exercise-transition" && <><View style={s.teach}><Art source={artwork.check} width={72} height={72}/><Text style={s.teachTitle}>Exercise {position.exerciseNumber} complete!</Text><Text style={s.teachBody}>You’ve practiced opening the interview.</Text><View style={[s.lessonCard,{marginTop:24}]}><Text style={s.activityLabel}>NEXT: EXERCISE {position.exerciseNumber+1} OF {position.exerciseTotal}</Text><Text style={s.responseTitle}>Organize OLD CARTS</Text><Text style={s.lessonText}>Learn the framework, then organize Mr. Jones’s symptoms.</Text></View></View>{footer("Learn OLD CARTS →")}</>}
    {conceptScreen && panel && <>
      <View style={s.conceptContent}>
       <View style={s.conceptIllustration}>{panel.illustration ? <Image source={conceptArtwork[panel.illustration as keyof typeof conceptArtwork]} contentFit="contain" accessibilityLabel={conceptArtworkDescriptions[panel.illustration as keyof typeof conceptArtworkDescriptions] || panel.title} style={{width:illustrationWidth,height:illustrationWidth}}/> : <Art source={artwork[panel.icon as "conversation" | "clock" | "list" | "book"]} width={panel.icon === "conversation" ? illustrationWidth : Math.min(180,illustrationWidth)} height={panel.icon === "conversation" ? illustrationWidth*233/258 : Math.min(180,illustrationWidth)}/>}</View>
       <View style={s.conceptCopy}><Text accessibilityRole="header" style={s.conceptTitle}>{panel.title}</Text>{panel.text.split(/\n\s*\n/).map((paragraph:string,i:number)=><Text key={i} style={s.conceptExplanation}>{paragraph}</Text>)}</View>
       {panel.rows.length > 0 && <View style={s.clinicalExamples}>{panel.rows.map((row: {label:string;patient:string;clinical:string;detail:string})=><View key={row.label} style={s.clinicalExample}>
        <Text style={s.lessonHeading}>{row.label}</Text>
        {!!row.patient && <Text selectable style={[s.exampleText,s.exampleItalic]}>{row.patient}</Text>}
        {!!row.detail && <Text selectable style={s.exampleText}>{row.detail}</Text>}
        {!!row.clinical && <Text selectable style={s.exampleText}><Text style={s.exampleLabel}>Clinical description: </Text><Text style={s.exampleItalic}>{row.clinical}</Text></Text>}
       </View>)}</View>}
      </View>
      {footer(lessonPanel === panels.length-1 ? oldCarts ? "Practice with Mr. Jones →" : opening ? "Got it →" : "Practice →" : "Continue →")}
    </>}
    {p.screen === "welcome" && <>
      <Image source={artwork.welcome} contentFit="cover" style={s.welcomeArt} accessibilityLabel="Dr. Martinez, your clinical preceptor" />
      <View style={s.welcomePanel}>
        <Text style={s.eyebrow}>Module 0</Text>
        <Text accessibilityRole="header" style={s.welcomeTitle}>Clinical Readiness</Text>
        <Text style={s.welcomeBody}>Let’s build the essential skills you'll use with every patient.</Text>
        <View style={s.facts}>
          {([[artwork.book, `${position.activityTotal} activities`], [artwork.list, `${position.exerciseTotal} short exercises`], [artwork.clock, "About 15 minutes"]] as const).map(([source, label]) =>
            <View key={label} style={s.fact}><Art source={source} width={23} height={23} /><Text style={s.factText}>{label}</Text></View>)}
        </View>
      </View>
      {footer("Let's start →")}
    </>}
    {p.screen === "introduction" && <>
      <View style={s.introduction}>
        <Text style={s.activityLabel}>Activity {position.activityNumber} of {position.activityTotal}</Text>
        <Text accessibilityRole="header" style={s.introTitle}>{p.activity.title}</Text>
        <Image source={artwork.consultation} contentFit="cover" style={s.consultation} accessibilityLabel="Dr. Martinez opening a patient consultation" />
        <Text style={s.introBody}>{activityIntroductions[p.activity.id] || p.activity.steps.map(step=>step.teach).join(" ")}</Text>
        <View style={s.exerciseList}>{p.activity.steps.map((step, i) => <View key={step.id} style={s.exerciseRow}>
          <View style={s.number}><Art source={i === 0 ? artwork.number1 : artwork.number2} width={24} height={24} /><Text style={[s.numberText, i > 0 && { color: "#596680" }]}>{i + 1}</Text></View>
          <Text style={s.exerciseText}>{exerciseTitle(step,p.activity)}</Text>
        </View>)}</View>
      </View>
      
      {footer("Begin →")}
    </>}
    {p.screen === "teach" && !panel && <>
      <View style={s.teach}>
        <View style={s.conversation}><Art source={artwork.conversation} width={258} height={233} /></View>
        <Text accessibilityRole="header" style={s.teachTitle}>{opening ? "Start with curiosity." : p.activity.title}</Text>
        <Text style={s.teachBody}>{opening ? "Let the patient tell you what's bothering them in their own words." : p.step.teach}</Text>
      </View>
      
      {footer("Got it →")}
    </>}
    {p.screen === "practice" && !p.textMode && <>
      <View style={s.practice}>
        <PracticeTask step={p.step} optional={false} choices />
        <View accessibilityRole="radiogroup" accessibilityLabel="Opening question choices" style={s.choices}>
          {provisionalOpeningChoices.map(choice => <Pressable key={choice} accessibilityRole="radio" accessibilityLabel={choice} accessibilityState={{ checked: p.selected === choice, disabled: p.disabled || p.busy }} disabled={p.disabled || p.busy} onPress={() => p.onSelect(choice)} style={[s.choice, p.selected === choice && s.selected]}>
            <View style={s.radio}><Art source={artwork.radioOutline} width={22} height={22} /><View style={s.radioInner}><Art source={artwork.radioInside} width={20} height={20} /></View>{p.selected === choice && <View style={s.radioDot} />}</View>
            <Text style={s.choiceText}>{choice}</Text>
          </Pressable>)}
        </View>
      </View>
      {dock(<View style={[s.practiceDock,width<360 && s.narrowPracticeDock]}><MentorAudio {...p} compact/>{p.error && <Text accessibilityRole="alert" style={s.error}>{p.error}</Text>}<Button label={p.busy ? "Preparing feedback…" : "Check answer →"} onPress={p.onContinue} disabled={p.disabled || p.busy || !p.selected}/></View>)}
    </>}
    {p.screen === "practice" && p.textMode && <>
      <View style={s.practiceBody}>
        <PracticeTask step={p.step} optional={p.kind === "practice"} caseFacts={caseFacts}/>
        <View style={s.responseTools}><Pressable accessibilityRole="button" onPress={p.onToggleNavigation} style={s.control}><Text style={s.controlText}>Activities and reviews</Text></Pressable></View>
        {p.navigationOpen && <View style={s.lessonCard}>{p.progress?.activities.map((a,i) => <Pressable key={a.id} accessibilityRole="button" onPress={() => p.onChoose?.(a.id)} style={s.control}><Text style={s.lessonText}>{a.completed ? "✓" : `${i + 1}.`} {a.title} · {a.completedCount}/{a.requiredCount}</Text></Pressable>)}</View>}
        {p.navigationOpen && <View style={s.responseTools}>{p.activity.steps.map((step,i) => <Pressable key={step.id} accessibilityRole="button" disabled={!step.completed && step.id !== p.activity.nextStepId} onPress={() => p.onChoose?.(p.activity.id,step.id)} style={s.control}><Text style={s.controlText}>{step.completed ? "✓ Review" : "Exercise"} {i + 1}</Text></Pressable>)}</View>}
        {p.step.saved && <><View style={s.lessonCard}><Text style={s.lessonHeading}>Your saved response</Text><Text selectable style={s.lessonText}>{p.step.saved.response}</Text></View><SavedFeedback result={p.step.saved} /></>}
        {p.history?.map(result => <SavedFeedback key={result.requestId} result={result} />)}
        {p.error && <View style={s.lessonCard}><Text accessibilityRole="alert" style={s.error}>{p.error}</Text><Pressable accessibilityRole="button" onPress={p.onRefresh} style={s.control}><Text style={s.controlText}>Refresh saved progress</Text></Pressable></View>}
        {p.busy && !p.progress?.pending && <View style={s.lessonCard}><ActivityIndicator /><Text accessibilityLiveRegion="polite" style={s.lessonText}>Submitting your answer and preparing feedback…</Text></View>}
        {p.progress?.pending && <View style={s.lessonCard}>
          <Text style={s.lessonText}>Your answer is saved and awaiting feedback. You may leave and resume later.</Text><Text selectable style={s.lessonHint}>{p.progress.pending.response}</Text>
          <Text style={s.lessonHint}>{p.progress.pending.status === "failed" ? "Feedback could not be completed. Your answer is preserved. Automatic checks have stopped." : !p.retryWait ? "The earlier feedback request has not finished. Automatic checks have stopped." : "Dr. Martinez is preparing feedback. Saved progress refreshes automatically."} {p.retryWait ? `Retry is available in about ${p.retryWait} seconds while the previous request settles.` : "You can safely retry feedback now."}</Text>
          <Pressable accessibilityRole="button" onPress={() => p.onChoose?.(p.progress!.pending!.activityId,p.progress!.pending!.stepId,p.progress!.pending!.kind)} style={s.control}><Text style={s.controlText}>Return to saved answer</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={p.onRefresh} style={s.control}><Text style={s.controlText}>Refresh saved progress</Text></Pressable>
        </View>}
        <View style={s.responseTools}>
          {p.step.completed && <Pressable accessibilityRole="button" onPress={() => p.onChoose?.(p.activity.id,p.step.id,"practice")} style={s.control}><Text style={s.controlText}>Optional targeted practice</Text></Pressable>}
        </View>
        {p.step.completed && p.kind === "required" && !p.activity.completed && p.activity.nextStepId && <Pressable accessibilityRole="button" onPress={() => p.onChoose?.(p.activity.id,p.activity.nextStepId!)} style={s.control}><Text style={s.controlText}>Continue to the next unfinished exercise</Text></Pressable>}
        {p.activity.completed && <><Text style={s.lessonHint}>Activity complete. Review or practice without repeating required work.</Text>{p.progress?.next && <Pressable accessibilityRole="button" onPress={() => p.onChoose?.(p.progress!.next!.activityId,p.progress!.next!.stepId)} style={s.control}><Text style={s.controlText}>Continue to the next unfinished activity</Text></Pressable>}</>}
      </View>
      
      {dock(<View style={[s.practiceDock,width<360 && s.narrowPracticeDock]}><MentorAudio {...p} compact/>
        {(!p.step.completed || p.kind !== "required" || p.progress?.pending) ? <ClinicalsChatComposer key={p.step.id+":"+p.kind} practice compact
              value={p.selected} onChangeText={p.onSelect} onSubmit={p.onContinue} onMicPress={p.onMicPress || (()=>{})}
              placeholder="Answer here" inputAccessibilityLabel="Your exercise response" submitLabel="Submit" showSendControl={!p.progress?.pending}
              editable={!p.busy && !p.progress?.pending && !p.disabled} sending={p.busy}
              sendDisabled={p.busy || !!p.progress?.pending || p.disabled || !p.selected.trim()}
              micDisabled={p.micDisabled || p.busy || !!p.progress?.pending || p.disabled} isRecording={p.isRecording} transcribing={p.transcribing}/>
          : p.result ? <Button label="Return to feedback →" onPress={p.onContinue}/> : null}
        {p.progress?.pending && <Button label={p.busy ? "Working…" : "Retry feedback"} onPress={p.onRetry || (() => {})} disabled={p.busy || !!p.retryWait}/>}
      </View>)}

    </>}
    {p.screen === "feedback" && p.result && <>
      <View style={[s.feedbackContent,height < 700 && {marginTop:16,gap:20}]}>
        {height < 700 && feedbackHeading}
        <View style={s.feedbackArt}><Art source={artwork.feedback} width={feedbackWidth} height={feedbackWidth*240/274} /></View>
        {height >= 700 && feedbackHeading}
        <View accessibilityLiveRegion="polite" style={s.feedbackCopy}>{String(p.result.evaluation.feedback || p.result.evaluation.reply || "").split(/\n\s*\n/).filter(Boolean).map((paragraph,i)=><Text key={i} selectable style={s.feedbackBody}>{paragraph}</Text>)}</View>
      </View>
      
      {footer("Continue →")}
    </>}
    {p.screen === "clarify" && <>
      <View style={s.clarifyMentor}><Image source={artwork.avatar} contentFit="contain" style={{width:Math.min(160,height*.2),height:Math.min(160,height*.2),borderRadius:80}} accessibilityLabel="Dr. Martinez"/><Text accessibilityRole="header" style={s.clarifyTitle}>Dr. Martinez</Text></View>
      {p.clarificationContext?.panelTitle && <View style={s.clarifyContext}><Text style={s.lessonHeading}>{p.clarificationContext.panelTitle}</Text></View>}
      <View style={s.chat}>
        {p.result?.kind === "clarify" ? <>
          <View style={s.userBubble}><Text style={s.userText}>{p.clarificationContext?.panelTitle ? p.result.response.replace(/^Teaching context: [^\n]*\n\nLearner question: /,"") : p.result.response}</Text></View>
          <View style={s.replyRow}>
            <View style={s.replyBubble}><Text style={s.replyTitle}>Great question!</Text><Text accessibilityLiveRegion="polite" style={s.replyText}>{p.result.evaluation.reply || p.result.evaluation.feedback}</Text></View>
          </View>
        </> : <Text style={s.chatPrompt}>What would you like to understand better?</Text>}
      </View>
      
      {dock(<View style={s.chatFooter}><MentorAudio {...p}/>
        {p.error && <Text accessibilityRole="alert" style={s.error}>{p.error}</Text>}
        <ClinicalsChatComposer lesson compact value={p.selected} onChangeText={p.onSelect} onSubmit={p.onContinue} onMicPress={p.onMicPress || (()=>{})} showMicrophoneControl={!!p.onMicPress}
          placeholder="Ask Dr. Martinez a question…" placeholderTextColor={c.placeholder} inputAccessibilityLabel="Clarification question" submitLabel="Send" submitAccessibilityLabel="Send clarification question"
          editable={!p.busy && !p.disabled && !p.progress?.pending} sendDisabled={p.busy || p.disabled || !!p.progress?.pending || !p.selected.trim()} sending={p.busy}
          micDisabled={p.micDisabled || p.busy || !!p.progress?.pending} isRecording={p.isRecording} transcribing={p.transcribing} containerStyle={s.responseComposer} inputStyle={s.responseInput}/>
      </View>)}
    </>}
    {p.screen === "activity-complete" && p.activity.completed && <>
      <View style={s.activityCompletion}>
        <Art source={artwork.trophy} width={trophySize} height={trophySize} />
        <Text accessibilityRole="header" style={s.activityCompletionTitle}>Activity complete!</Text>
        <Text style={s.completionBody}>{p.activity.id === "starting-the-encounter" ? "You've practiced opening the interview and organizing symptoms." : `You've practiced ${p.activity.title.toLowerCase()}.`}</Text>
        <Checklist labels={completedSteps.map(step => exerciseTitle(step, p.activity) === p.activity.title ? step.question : exerciseTitle(step, p.activity))} />
      </View>
      {footer(p.progress?.completed ? "View module completion →" : "Next activity →")}
    </>}
    {p.screen === "resume" && p.progress && <>
      <View style={s.resume}>
        <Image source={artwork.avatar} contentFit="cover" style={s.resumeAvatar} accessibilityLabel="Dr. Martinez welcomes you back" />
        <Text accessibilityRole="header" style={s.resumeTitle}>Welcome back!</Text>
        <Text style={s.resumeCount}>{p.progress.completedCount} of {p.progress.requiredCount} complete</Text>
        <View accessibilityRole="progressbar" accessibilityLabel="Saved Module 0 progress" accessibilityValue={{ min: 0, max: p.progress.requiredCount, now: p.progress.completedCount }} style={s.resumeTrack}><View style={[s.resumeFill, { width: `${Math.min(100, p.progress.requiredCount ? p.progress.completedCount / p.progress.requiredCount * 100 : 0)}%` }]} /></View>
        {nextStep && <View style={s.nextCard}><Text style={s.nextLabel}>NEXT UP</Text><Text style={s.nextTitle}>{exerciseTitle(nextStep, nextActivity)}</Text><Text style={s.nextBody}>{nextStep.id === "organize-old-carts" ? "Summarize the patient's symptoms using OLD CARTS." : nextStep.question}</Text></View>}
      </View>
      <Pressable accessibilityRole="button" onPress={p.onToggleNavigation} style={s.review}><Text style={s.controlText}>Activities and reviews</Text></Pressable>
      {p.navigationOpen && <View style={[s.lessonCard,{marginHorizontal:22}]}>{p.progress.activities.map(a=><View key={a.id}><Text style={s.lessonHeading}>{a.title}</Text>{a.steps.filter(step=>step.completed || step.id===a.nextStepId).map(step=><Pressable key={step.id} accessibilityRole="button" accessibilityLabel={`${step.completed ? "Review" : "Continue"}: ${exerciseTitle(step,a)}`} onPress={()=>p.onChoose?.(a.id,step.id)} style={s.control}><Text style={s.controlText}>{step.completed ? "Review" : "Continue"}: {exerciseTitle(step,a)}</Text></Pressable>)}</View>)}</View>}
      {footer("Resume →")}
    </>}
    {p.screen === "module-complete" && p.progress?.completed && <>
      <View style={s.moduleCompletion}>
        <Art source={artwork.complete} width={274} height={240} />
        <Text accessibilityRole="header" style={s.moduleCompletionTitle}>Module 0 Complete!</Text>
        <Text style={s.moduleCompletionBody}>You're ready to begin Rotation 1.</Text>
        <Checklist module labels={[`${p.progress.activities.filter(a => a.completed).length} activities`, `${p.progress.completedCount} exercises`]} />
      </View>
      {p.onReview && <Pressable accessibilityRole="button" onPress={p.onReview} style={s.review}><Text style={s.controlText}>Review completed exercises</Text></Pressable>}
      {footer("Continue to Rotation 1")}
    </>}
  </>;
  return <><Modal visible={!!p.exitPrompt} transparent animationType="fade" onShow={()=>cancelExitRef.current?.focus?.()} onRequestClose={p.onCancelExit}>
    <View style={s.exitBackdrop}><View accessibilityViewIsModal aria-modal role="dialog" accessibilityLabel="Leave Module 0?" style={s.exitDialog}>
      <Text accessibilityRole="header" style={s.lessonHeading}>Leave Module 0?</Text>
      <Text style={s.lessonText}>Submitted answers and progress are saved. Your unsent draft will be lost if you leave.</Text>
      <Button buttonRef={cancelExitRef} label="Keep working" onPress={p.onCancelExit || (()=>{})}/>
      <Button label="Leave Module 0" onPress={p.onConfirmExit || p.onLeave}/>
    </View></View>
  </Modal><Shell practice={p.screen === "practice"} header={header} referenceChrome={p.referenceChrome} contentKey={`${p.screen}:${p.step.id}:${lessonPanel}`} footer={bottom}>{content}</Shell></>;
}
const s = StyleSheet.create({
  exitBackdrop:{flex:1,backgroundColor:"rgba(21,32,68,0.45)",justifyContent:"center",padding:24},
  exitDialog:{width:"100%",maxWidth:420,alignSelf:"center",backgroundColor:c.background,borderRadius:16,padding:20,gap:16},
  practiceBody:{paddingHorizontal:24,paddingTop:24,gap:18},
  practiceDock:{paddingHorizontal:24,paddingTop:12,borderTopWidth:1,borderTopColor:c.track,gap:10},
  narrowPracticeDock:{paddingHorizontal:16},
  practiceReference:{backgroundColor:c.lavender,borderRadius:14,paddingHorizontal:16},
  practiceReferenceLabel:{flex:1,fontFamily:"Module0InterSemiBold",fontSize:14,lineHeight:20,color:c.ink},
  practiceFacts:{paddingBottom:16,gap:12},practiceCopy:{fontFamily:"Module0Inter",fontSize:14,lineHeight:21,color:c.body},
  narrowMentorRow:{columnGap:8},narrowNarrationControls:{gap:0,flexShrink:0},
  compactMentorRow:{flexDirection:"row",alignItems:"center",backgroundColor:c.lavender,borderRadius:12},
  compactAsk:{flex:1,minWidth:0,gap:4,paddingLeft:6},compactAvatar:{width:24,height:30},compactMentorText:{flex:1,fontSize:12,lineHeight:16},
  caseFactsHeader:{minHeight:44,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},caseFactsBody:{gap:12},caseFactsFocus:{outlineWidth:2,outlineStyle:"solid",outlineColor:c.primary,outlineOffset:3},
  narrationArea:{gap:8}, narrationRow:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8}, stripAvatar:{width:44,height:44}, narrationControls:{flexDirection:"row",gap:8},askMentor:{minHeight:44,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10},askMentorText:{fontFamily:"Module0InterMedium",fontSize:15,lineHeight:21,color:c.primary},
  conceptContent:{flexGrow:1,justifyContent:"space-evenly",paddingHorizontal:23,paddingTop:20,paddingBottom:20,gap:20},conceptIllustration:{alignItems:"center"},conceptCopy:{gap:20},conceptTitle:{fontFamily:"Module0InterBold",fontSize:25,lineHeight:33.75,color:c.ink,textAlign:"center"},conceptExplanation:{fontFamily:"Module0Inter",fontSize:20,lineHeight:26,color:c.body,textAlign:"center"},clinicalExamples:{gap:24},clinicalExample:{gap:12},exampleText:{fontFamily:"Module0Inter",fontSize:18,lineHeight:25,color:c.body},exampleItalic:{fontStyle:"italic"},exampleLabel:{fontFamily:"Module0InterSemiBold",color:c.ink},clarifyContext:{paddingHorizontal:24,marginTop:24,gap:8},
  iconControl:{width:44,height:44,alignItems:"center",justifyContent:"center",borderRadius:12},iconActive:{backgroundColor:c.lavender},iconDisabled:{opacity:0.35},
  captionPanel:{maxHeight:112,borderRadius:12,backgroundColor:c.lavender},captionContent:{padding:12},captionText:{fontFamily:"Module0Inter",fontSize:14,lineHeight:20,color:c.body},
  navigationBar:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:12},lessonIdentifier:{flex:1,textAlign:"center",fontFamily:"Module0InterMedium",fontSize:15,color:c.ink},lessonProgress:{marginHorizontal:23,flexDirection:"row",alignItems:"center",gap:12},lessonHierarchy:{paddingHorizontal:22,marginTop:8,gap:6},exerciseHierarchy:{fontFamily:"Module0InterMedium",fontSize:13,lineHeight:18,color:c.ink},panelCount:{fontFamily:"Module0Inter",fontSize:12,color:c.body},
  response: { paddingHorizontal: 23, marginTop: 32, gap: 18 }, responseTitle: { fontFamily: "Module0InterBold", fontSize: 25, lineHeight: 33.75, color: c.ink },
  savedProgress: { fontFamily: "Module0InterMedium", fontSize: 13, lineHeight: 17.55, color: c.body }, responseTools: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  lessonCard: { borderWidth: 1, borderColor: c.track, borderRadius: 16, padding: 18, gap: 10 }, lessonHeading: { fontFamily: "Module0InterSemiBold", fontSize: 16, lineHeight: 21.6, color: c.ink },
  lessonText: { fontFamily: "Module0Inter", fontSize: 16, lineHeight: 21.6, color: c.body }, lessonHint: { fontFamily: "Module0Inter", fontSize: 13, lineHeight: 20.25, color: c.body },
  responseComposer: { marginHorizontal: 0, paddingHorizontal: 12, borderWidth: 1, borderColor: c.track, borderRadius: 16, backgroundColor: c.background },
  responseInput: { fontFamily: "Module0Inter", fontWeight: "normal", fontSize: 16, lineHeight: 21.6, color: c.ink, minHeight: 64 },
  root: { flex: 1, backgroundColor: c.background, alignItems:"center" }, frame:{flex:1,minHeight:0,width:"100%",maxWidth:480,backgroundColor:c.background,overflow:"hidden"}, body:{flex:1,minHeight:0}, fixedHeader:{flexShrink:0,paddingBottom:8,backgroundColor:c.background,zIndex:1}, dock:{paddingTop:8,backgroundColor:c.background}, scroll: { flexGrow: 1, alignItems: "center" },
  shell: { width: "100%", flexGrow:1, backgroundColor: c.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  status: { position: "absolute", zIndex: 2, top: 15, left: 25, right: 22, flexDirection: "row", justifyContent: "space-between" },
  statusText: { fontFamily: "Module0InterSemiBold", fontSize: 12,  color: c.ink },
  welcomeArt: { position: "absolute", top: -63, left: -2, width: "101%", height: 693 },
  welcomePanel: { marginTop: 290, paddingTop: 36, paddingHorizontal: 24, backgroundColor: c.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  eyebrow: { fontFamily: "Module0InterSemiBold", fontSize: 12,  lineHeight: 16.2, color: c.body },
  welcomeTitle: { fontFamily: "Module0InterBold", fontSize: 27,  lineHeight: 36.45, color: c.ink, marginTop: 10 },
  welcomeBody: { maxWidth: 333, fontFamily: "Module0Inter", fontSize: 20, lineHeight: 21.6, color: c.body, marginTop: 18 },
  facts: { marginTop: 72, gap: 16 }, fact: { flexDirection: "row", alignItems: "center", gap: 14 },
  factText: { fontFamily: "Module0Inter", fontSize: 16, lineHeight: 21.6, color: c.ink },
  footer: { paddingHorizontal: 22, gap:12 },
  button: { minHeight: 59, borderRadius: 15, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", padding: 14 },
  buttonText: { fontFamily: "Module0InterSemiBold", fontSize: 17,  lineHeight: 22.95, color: c.background, textAlign: "center" },
  disabled: {opacity:0.45}, pressed: { opacity: 0.9 }, error: { color: "#b91c1c", marginBottom: 12, fontSize: 15, lineHeight: 21 },
  header: { height: 44, marginHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 19 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  track: { flex: 1, height: 7, borderRadius: 4, backgroundColor: c.track, marginTop: 10 }, fill: { height: 7, borderRadius: 4, backgroundColor: c.primary },
  stage: { width: 55, fontFamily: "Module0Inter", color: c.body, fontSize: 13, textAlign: "right", paddingRight: 10, lineHeight: 17.55 },
  introduction: { marginTop: 34, marginHorizontal: 22 },
  activityLabel: { fontFamily: "Module0InterMedium", fontSize: 13,  lineHeight: 17.55, color: c.body },
  introTitle: { fontFamily: "Module0InterBold", fontSize: 25,  lineHeight: 33.75, color: c.ink, marginTop: 16 },
  consultation: { width: "100%", height: 256, borderRadius: 8, marginTop: 16 },
  introBody: { fontFamily: "Module0Inter", fontSize: 20, lineHeight: 21.6, color: c.body, marginTop: 29, marginHorizontal: 3 },
  exerciseList: { marginTop: 50, gap: 23 }, exerciseRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingLeft: 6 },
  number: { width: 24, height: 24 }, numberText: { position: "absolute", top: 3, width: 24, textAlign: "center", color: c.background, fontFamily: "Module0InterSemiBold",  fontSize: 13 },
  exerciseText: { fontFamily: "Module0InterMedium", fontSize: 17,  lineHeight: 22.95, color: c.ink },
  teach: { marginTop: 39, paddingHorizontal: 19, alignItems: "center" }, conversation: { alignItems: "center", transform: [{ translateX: 5 }] },
  teachTitle: { fontFamily: "Module0InterBold", fontSize: 25,  lineHeight: 33.75, color: c.ink, textAlign: "center", marginTop: 33 },
  teachBody: { maxWidth: 325, fontFamily: "Module0Inter", fontSize: 20, lineHeight: 21.6, color: c.body, textAlign: "center", marginTop: 27 },
  mentor: { flexDirection: "row", alignItems: "center", marginTop: 77, marginLeft: 57, gap: 0 },
  avatar: { width: 100, height: 100 }, audioBlock: { alignItems: "center", width: 84, marginLeft: -1 }, audioButton: { width: 52, height: 52 },
  audioGlyph: { position: "absolute", left: 11, top: 14 }, mentorName: { transform: [{ translateX: 7 }], fontFamily: "Module0InterMedium",  color: c.primary, fontSize: 13, lineHeight: 17.55, marginTop: 6 },
  practice: { paddingHorizontal: 24, marginTop: 24 },
  practiceTitle: { fontFamily: "Module0InterBold", fontSize: 26,  lineHeight: 35.1, color: c.ink },
  choices: { marginTop: 40, gap: 18 }, choice: { minHeight: 72, borderWidth: 1, borderColor: c.border, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  selected: { borderColor: c.primary, backgroundColor: "#f9f8ff" }, radio: { width: 22, height: 22 }, radioInner: { position: "absolute", top: 1, left: 1 },
  radioDot: { position: "absolute", width: 12, height: 12, top: 5, left: 5, backgroundColor: c.primary, borderRadius: 6 },
  choiceText: { flex: 1, fontFamily: "Module0InterMedium", fontSize: 15, lineHeight: 21, color: c.ink },
  freeText: { minHeight: 44, justifyContent: "center", alignItems: "center", marginTop: 15 }, freeTextLabel: { color: c.primary, fontFamily: "Module0InterMedium", fontSize: 13 },
  clarify: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 12, backgroundColor: c.lavender, borderRadius: 12, marginTop: 32 },
  clarifyText: { fontFamily: "Module0InterMedium", color: c.primary, fontSize: 15,  lineHeight: 20.25 },
  feedbackContent: { marginTop: 28, alignItems: "stretch", paddingHorizontal: 24, gap:28,paddingBottom:28 },
  feedbackArt: { alignItems:"center" },
  feedbackTitle: { fontFamily: "Module0InterBold", fontSize: 25, lineHeight: 33.75, color: c.ink,textAlign:"left" },
  feedbackCopy:{gap:20},
  feedbackBody: { fontFamily: "Module0Inter", fontSize: 20, lineHeight: 30, color: c.body, textAlign: "left" },
  feedbackMentor: { marginTop: 113, marginLeft: 77 },
  clarifyMentor:{alignItems:"center",gap:12,marginTop:20},clarifyTitle:{fontFamily:"Module0InterBold",fontSize:25,lineHeight:34,color:c.ink},
  chat: { marginTop: 28,paddingBottom:24,gap:24 }, userBubble: { alignSelf: "flex-end", marginRight: 23, width: 260, maxWidth: "80%", borderRadius: 17, padding: 18, backgroundColor: c.lavender },
  userText: { fontFamily: "Module0Inter", fontSize: 16, lineHeight: 21.6, color: c.ink },
  replyRow: { flexDirection: "row", alignItems: "flex-start",paddingHorizontal:23 },
  replyBubble: { flex: 1, borderRadius: 17, paddingHorizontal: 18, paddingVertical: 21, backgroundColor: c.reply },
  replyTitle: { fontFamily: "Module0InterSemiBold", fontSize: 16, lineHeight: 21.6, color: c.ink },
  replyText: { fontFamily: "Module0Inter", fontSize: 16, lineHeight: 20.25, color: c.body, marginTop: 17 },
  chatPrompt: { marginHorizontal: 24, fontFamily: "Module0Inter", fontSize: 18, lineHeight: 26, color: c.body },
  chatFooter: { paddingHorizontal: 22, gap:8 },
  chatComposer: { minHeight: 58, borderRadius: 16, borderWidth: 1, borderColor: c.track, paddingLeft: 18, paddingRight: 2, flexDirection: "row", alignItems: "center" },
  chatInput: { flex: 1, minWidth: 0, fontFamily: "Module0Inter", fontSize: 15, lineHeight: 20.25, color: c.ink, paddingVertical: 14 },
  sendButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, sendIcon: { position: "absolute", top: 11, left: 11 },
  chatControls: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  controlText: { color: c.primary, fontFamily: "Module0InterMedium", fontSize: 13, paddingVertical: 12 },
  control: { minHeight: 44, justifyContent: "center" },
  activityCompletion: { alignItems: "center", marginTop: 21, paddingHorizontal: 20 },
  activityCompletionTitle: { fontFamily: "Module0InterBold", fontSize: 26, lineHeight: 35.1, color: c.ink, textAlign: "center", marginTop: 0 },
  completionBody: { maxWidth: 319, fontFamily: "Module0Inter", fontSize: 16, lineHeight: 21.6, color: c.body, textAlign: "center", marginTop: 31 },
  checklist: { marginTop: 90, gap: 19, maxWidth: "100%", alignSelf: "stretch", marginHorizontal: 41 },
  checkRow: { flexDirection: "row", gap: 6, alignItems: "flex-start" }, checkText: { flex: 1, color: c.checklist, fontFamily: "Module0InterSemiBold", fontSize: 20, lineHeight: 22.95 },
  resume: { alignItems: "center", marginTop: 36, paddingHorizontal: 24 }, resumeAvatar: { width: 226, height: 226, transform: [{ translateX: 5 }] },
  resumeTitle: { fontFamily: "Module0InterBold", fontSize: 27, lineHeight: 36.45, color: c.ink, marginTop: 11, textAlign: "center" },
  resumeCount: { fontFamily: "Module0Inter", fontSize: 16, lineHeight: 21.6, color: c.body, marginTop: 22 },
  resumeTrack: { alignSelf: "stretch", height: 9, borderRadius: 5, backgroundColor: c.track, marginHorizontal: 6, marginTop: 29 },
  resumeFill: { height: 9, borderRadius: 5, backgroundColor: c.primary },
  nextCard: { alignSelf: "stretch", borderRadius: 20, minHeight: 184, backgroundColor: c.nextUp, marginTop: 59, paddingHorizontal: 18, paddingTop: 23, paddingBottom: 20 },
  nextLabel: { fontFamily: "Module0InterSemiBold", fontSize: 12, lineHeight: 16.2, color: c.primary },
  nextTitle: { fontFamily: "Module0InterBold", fontSize: 23, lineHeight: 31.05, color: c.ink, marginTop: 15 },
  nextBody: { fontFamily: "Module0Inter", fontSize: 16, lineHeight: 20.25, color: c.body, marginTop: 25 },
  moduleCompletion: { alignItems: "center", paddingHorizontal: 20, marginTop: 67 },
  moduleCompletionTitle: { fontFamily: "Module0InterBold", fontSize: 25, lineHeight: 33.75, color: c.ink, textAlign: "center", marginTop: 42 },
  moduleCompletionBody: { fontFamily: "Module0Inter", fontSize: 16, lineHeight: 21.6, color: c.body, textAlign: "center", marginTop: 28 },
  moduleChecklist: { marginTop: 116, marginHorizontal: 65, gap: 20 },
  review: { alignSelf: "center", marginTop: 20 },
});
