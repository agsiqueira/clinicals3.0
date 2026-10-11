// Local visual fixture: renders the actual production screen components.
// It has no auth bypass, API client, server, or persistence connection.
import React, { useRef, useState } from "react";
import { registerRootComponent } from "expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { narrationFor, oldCartsPanels, conceptPanelsFor } from "../src/components/module0/teaching";
import { hasApprovedChoices } from "../src/components/module0/presentation";
import catalog from "../../backend/src/content/clinicalReadiness.json";
import { ApprovedScreens } from "../src/components/module0/ApprovedScreens";
import type { ApprovedScreen } from "../src/components/module0/ApprovedScreens";
import type { LessonActivity, LessonProgress, LessonResult } from "../src/types/clinicalReadiness";
const step = {id:"open-the-interview",teach:"Start with an open-ended question.",question:"Write your opening question.",answerHint:"",optionalPracticeQuestion:"",completed:false,saved:null};
const activity: LessonActivity = {id:"starting-the-encounter",title:"Starting the Encounter",completed:false,completedCount:0,requiredCount:2,estimatedMinutesRange:[3,4],nextStepId:step.id,feedbackLabel:null,steps:[step,{...step,id:"organize-old-carts"}]};
function Preview() {
  const oldCartsPreview = typeof location !== "undefined" && new URLSearchParams(location.search).get("exercise") === "organize-old-carts";
  const historyPreview = typeof location !== "undefined" && new URLSearchParams(location.search).get("exercise") === "history-and-context";
  const requested = typeof location === "undefined" ? "welcome" : new URLSearchParams(location.search).get("screen");
  const [screen,setScreen] = useState<ApprovedScreen>(["old-carts-teach","exercise-transition","welcome","introduction","teach","practice","feedback","clarify","activity-complete","resume","module-complete"].includes(requested || "") ? requested as ApprovedScreen : "welcome");
  const [panel,setPanel] = useState(typeof location === "undefined" ? 0 : Number(new URLSearchParams(location.search).get("panel") || 0));
  const [captions,setCaptions] = useState(false);
  const [playing,setPlaying] = useState(false);
  const [muted,setMuted] = useState(false);
  const [selected,setSelected] = useState("");
  const optionalPractice = typeof location !== "undefined" && new URLSearchParams(location.search).get("kind") === "practice";
  const [factsState,setFactsState] = useState<boolean | null>(null);
  const clarifyOrigin=useRef<{screen:ApprovedScreen;panel:number;selected:string} | null>(null);
  const controls = typeof location !== "undefined" && new URLSearchParams(location.search).get("controls") === "1";
  const weak = typeof location !== "undefined" && new URLSearchParams(location.search).get("feedback") === "needs-practice";
  const result: LessonResult = {requestId:"synthetic-visual-result",activityId:activity.id,stepId:step.id,kind:screen === "clarify" ? "clarify" : "required",response:screen === "clarify" ? "What's the difference between an open and closed question?" : "What brings you in today?",evaluation:screen === "clarify" ? {reply:"An open question lets a patient tell their story. A closed question asks for a specific answer—often yes or no."} : weak ? {label:"Needs More Practice",feedback:"Your response is an attempt. Connect it to the visible facts."} : {label:"Ready",feedback:"It lets the patient describe their concern in their own words without suggesting a symptom."},completedAt:"2026-01-01T00:00:00Z"};
  const complete = screen === "module-complete" || optionalPractice;
  const completedActivity = screen === "activity-complete" || complete;
  const shownActivity = {...activity, completed:completedActivity, completedCount:(completedActivity || requested === "activity-complete") ? 2 : 1, steps:activity.steps.map(s=>({...s,completed:completedActivity || s.id === step.id}))};
  const otherActivities = [2,3,4].map((n,i)=>({...activity,steps:Array.from({length:i === 0 ? 3 : 2},(_,j)=>({...step,id:"synthetic-step-"+n+"-"+j,completed:complete})),id:`synthetic-${n}`,title:`Synthetic activity ${n}`,completed:complete,completedCount:complete ? (i === 0 ? 3 : 2) : (i === 0 ? 2 : 0),requiredCount:i === 0 ? 3 : 2}));
  const progress: LessonProgress = {moduleId:"module-0",title:"Clinical Readiness",personaSlug:"dr-martinez",completed:complete,completedCount:complete ? 9 : (completedActivity || requested === "activity-complete") ? 2 : 1,requiredCount:9,contentVersion:1,revision:1,next:complete ? null : {activityId:activity.id,stepId:"organize-old-carts"},activities:[shownActivity,...otherActivities],scenario:{text:"",purpose:""},history:[],pending:null};
  const definition=catalog.activities.find(a=>a.id === "organizing-clinical-information")!;
  const historyActivity:LessonActivity={...definition,steps:definition.steps.map(s=>({...s,completed:false,saved:null})),completed:false,completedCount:0,requiredCount:definition.steps.length,nextStepId:"history-and-context",feedbackLabel:null};
  const [requestedActivityId,setRequestedActivityId]=useState(typeof location === "undefined" ? null : new URLSearchParams(location.search).get("activityId"));
  const mappedActivities:LessonActivity[]=catalog.activities.map((a,i)=>({...a,completed:complete || (completedActivity || requested === "activity-complete") && i===0,completedCount:complete || (completedActivity || requested === "activity-complete") && i===0 ? a.steps.length : i===0 ? 1 : 0,requiredCount:a.steps.length,feedbackLabel:null,nextStepId:complete || (completedActivity || requested === "activity-complete") && i===0 ? null : a.steps[i===0 ? 1 : 0].id,steps:a.steps.map((s,j)=>({...s,completed:complete || (completedActivity || requested === "activity-complete") && i===0 || i===0 && j===0,saved:null}))}));
  const mappedActivity=mappedActivities.find(a=>a.id === requestedActivityId);
  const displayedActivity=mappedActivity || (historyPreview ? historyActivity : shownActivity);
  if(mappedActivity){progress.activities=mappedActivities;progress.next=complete ? null : {activityId:completedActivity ? mappedActivities[1].id : mappedActivity.id,stepId:completedActivity ? mappedActivities[1].steps[0].id : mappedActivity.nextStepId || mappedActivity.steps[0].id};}
  if(historyPreview) progress.activities[1]=historyActivity;
  const requestedExercise = typeof location === "undefined" ? null : new URLSearchParams(location.search).get("exercise");
  const exactStep = displayedActivity.steps.find(s=>s.id === requestedExercise);
  const shownStep = exactStep || (mappedActivity ? mappedActivity.steps[screen === "old-carts-teach" ? 1 : 0] : historyPreview ? historyActivity.steps[1] : oldCartsPreview ? {...catalog.activities[0].steps[1],completed:false,saved:null} : screen === "old-carts-teach" ? shownActivity.steps[1] : step);
  progress.scenario=catalog.sharedScenario;
  const caseFactsExpanded=factsState ?? (shownStep.id === "organize-old-carts" && !optionalPractice && !shownStep.completed);
  const panels=conceptPanelsFor(shownStep);
  const next = () => { if(screen === "activity-complete" && progress.next){setRequestedActivityId(progress.next.activityId);setPanel(0);setScreen("introduction");return;} if(["old-carts-teach","teach"].includes(screen) && panel < panels.length-1) {setPanel(panel+1); return;} setScreen(screen === "exercise-transition" ? "old-carts-teach" : ["old-carts-teach","teach"].includes(screen) ? "practice" : screen === "welcome" ? "introduction" : screen === "introduction" ? "teach" : "practice"); };
  return <SafeAreaProvider initialMetrics={{frame:{x:0,y:0,width:390,height:844},insets:{top:0,bottom:0,left:0,right:0}}}>
    <ApprovedScreens screen={screen} activity={displayedActivity} step={shownStep} progress={progress} result={result} selected={selected} onSelect={setSelected} kind={optionalPractice ? "practice" : "required"} textMode={historyPreview || oldCartsPreview || !hasApprovedChoices(displayedActivity,shownStep,optionalPractice ? "practice" : "required")}
      caseFactsExpanded={caseFactsExpanded} onToggleCaseFacts={()=>setFactsState(!caseFactsExpanded)}
      onContinue={next} onBack={()=>{if(screen === "clarify" && clarifyOrigin.current){setScreen(clarifyOrigin.current.screen);setPanel(clarifyOrigin.current.panel);setSelected(clarifyOrigin.current.selected);clarifyOrigin.current=null;}else if(["old-carts-teach","teach"].includes(screen) && panel>0)setPanel(panel-1);else setScreen("introduction");}} onLeave={()=>setScreen("resume")}
      onFreeText={()=>{}} onClarify={()=>{clarifyOrigin.current={screen,panel,selected};setSelected("");setScreen("clarify");}} onListen={()=>setPlaying(true)} onStopAudio={()=>{}}
      onMicPress={controls ? ()=>{} : undefined} onReview={controls ? ()=>{} : undefined}
      teachingPanel={panel} narration={narrationFor(screen,shownStep,result,panel,displayedActivity,optionalPractice ? "practice" : "required")} captions={captions} onToggleCaptions={()=>setCaptions(v=>!v)} muted={muted} onToggleMute={()=>setMuted(v=>!v)}
      onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} isSpeaking={playing} busy={false} disabled={false} referenceChrome />
  </SafeAreaProvider>;
}
registerRootComponent(Preview);
