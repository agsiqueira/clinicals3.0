// Local-only API/identity/voice aliases; never included in the production Expo entry.
import React, { useCallback, useEffect, useState } from "react";
import catalog from "../../backend/src/content/clinicalReadiness.json";
const query = new URLSearchParams(location.search);
export const fixture = query.get("fixture") || "mixed";
const session = (slug, title, status, score = null, badgeTier = null) => ({ id:slug, slug, title, status, bestSessionScore:score, badgeTier, requiresHpi:slug !== "first-patient", achievements:[] });
const first = session("first-patient", "First Patient: Introduction and Chief Complaint", "completed", 90, "GOLD");
const second = session("first-patient-hpi", "First Patient: Complete HPI", "available");
const locked = session("reasoning", "Jordan Lee: Clinical Reasoning", "locked");
let sessions = [first,second,locked,session("presentation","Jordan Lee: Presenting to the Preceptor","locked")];
if(fixture === "real") sessions = [first,second];
if(fixture === "tiers") sessions = [first,session("first-patient-hpi",second.title,"completed",70,"SILVER"),session("bronze","Jordan Lee: Practice","completed",30,"BRONZE"),session("none","Jordan Lee: Reflection","completed",0,"NONE"),session("missing","Morgan Chen: Encounter","completed")];
if(fixture === "boundary") sessions = [{...first,bestSessionScore:83.99,badgeTier:"SILVER"},session("first-patient-hpi",second.title,"locked")];
if(fixture === "mastered") sessions = [first,session("first-patient-hpi",second.title,"completed",84,"GOLD")];
if(fixture === "empty-unit") sessions = [];
if(fixture === "blocked") sessions = sessions.map(s=>({...s,entryBlocked:true}));
const paths = [{id:"path",slug:"synthetic",title:"Clinical Encounters",description:"",units:[
  {id:"unit-1",slug:"unit-1-clinical-encounter",title:"First Clinical Encounter",sessions},
  {id:"unit-2",slug:"seasonal-allergies",title:"Seasonal Allergies",sessions:[session("seasonal-allergies-complete-hpi","Seasonal Allergies: Complete HPI",fixture === "mastered" ? "available" : "locked")]},
]}];
if(fixture === 'connections-long') {
  sessions.forEach((s,i)=>{s.title=i===1?'Taylor Reed: Complete Clinical Encounter with a detailed focused history and a careful explanation of the next clinical steps':s.title;s.objective=i===1?'Ask the patient to describe the onset, location, duration and character of symptoms. Clarify aggravating factors and associated symptoms, then summarize the history clearly without adding unsupported findings. '.repeat(4):'Brief focused clinical task.';});
  paths[0].description='This synthetic path tests long clinical text and repeated rotations without changing actual curriculum.';
  paths[0].units[0].objective='Practice a professional introduction and structured history while preserving the patient’s own description of the concern.';
  paths.push({id:'independent',title:'Independent learning path',description:'This is an independent path; no connector may cross this boundary.',units:[{id:'independent-unit',slug:'independent',title:'Separate rotation',sessions:[session('separate','Morgan Chen: Complete Clinical Encounter','locked')]}]});
}
if(fixture === 'final-design-long' || fixture === 'objectives-only') {
  paths[0].description='HIDDEN_PATH_DESCRIPTION '.repeat(80);
  paths[0].units[0].objective='HIDDEN_ROTATION_OBJECTIVE '.repeat(80);
  sessions.forEach(s=>{s.objective='HIDDEN_CLINICAL_OBJECTIVE Ask about symptom onset and associated findings. '.repeat(100);s.description='HIDDEN_PATIENT_INSTRUCTIONS '.repeat(100);});
  if(fixture === 'final-design-long') {
  sessions[1]={...sessions[1],id:'long-focused-history',slug:'long-focused-history',title:'Alexandra Montgomery: Focused history and medication reconciliation'};
  paths.push({id:'independent',title:'Independent learning path',description:'HIDDEN_INDEPENDENT_DESCRIPTION '.repeat(80),units:[{id:'independent-unit',slug:'independent',title:'Separate rotation',sessions:[session('separate','Morgan Chen: Complete Clinical Encounter','locked')]}]});
  }
}
let focusVisits=0;
function focusFixture(){
 if(fixture==='focus-later'||fixture==='focus-complete'||(fixture==='focus-return'&&focusVisits>1)){
 paths[0].units[0].sessions.forEach(s=>{s.status='completed';s.bestSessionScore=90;s.badgeTier='GOLD';});
 paths[0].units[1].sessions[0].status=fixture==='focus-complete'?'completed':'available';
 paths[0].units[1].sessions[0].bestSessionScore=fixture==='focus-complete'?90:null;
 }
 if(fixture==='focus-locked'){paths[0].units[0].sessions[0].bestSessionScore=70;paths[0].units[0].sessions[1].status='locked';}
}
const summary = { storageReady:true, completed:fixture!=="blocked", completedCount:fixture === "blocked" ? 2 : 9, requiredCount:9, entryBlocked:fixture === "blocked", activities:catalog.activities.map(a=>({id:a.id,title:a.title,completed:true,completedCount:a.steps.length,requiredCount:a.steps.length})) };
export const api = {
  getCompetencyProfile:async()=>({student:{displayName:'Synthetic Reviewer'},summary:{completedSessions:6,totalAttempts:6,averageScore:80},competencies:[{id:'history',name:'History Taking',description:'Evidence from scored encounters',currentScore:88,trend:'IMPROVING'}],growthSummary:{overallCompetencyScore:88,completedSessions:6}}),
  getAttemptsByCase:async()=>[{conversationId:"synthetic-review-attempt",submittedAt:"2026-10-14T12:00:00Z",score:90,passed:true,attemptNumber:1}],
  getLearningPaths:async()=>{++focusVisits;focusFixture();if(fixture==="error")throw new Error("Synthetic loading error — Retry available");if(fixture==="loading")await new Promise(()=>{});return fixture==="empty" ? [] : structuredClone(paths);},
  getClinicalPortfolio:async()=>({identity:{professionalLevel:2,levelTitle:'Emerging Interviewer',xp:140,nextLevelXp:200},streak:{currentCount:7},learningPathProgress:{pathTitle:'Clinical Foundations',completedSessions:1,totalSessions:4,percentComplete:25},milestones:[{slug:'first',title:'First Encounter',description:'Complete your first scored encounter',category:'milestone',status:'EARNED',earnedAt:'2026-10-10T12:00:00Z'}],competencies:[{slug:'history',title:'History Taking',attempts:6,achievedCount:4,bestPercentScore:92,latestPercentScore:88},{slug:'communication',title:'Clinical Communication',attempts:6,achievedCount:5,bestPercentScore:91,latestPercentScore:90}],recentPatients:fixture==='portfolio-empty'?[]:[72,81,66,88,79,94].map((score,i)=>({sessionAttemptId:'synthetic-'+i,patientSessionTitle:(i%2?'Taylor Reed':'Jordan Lee')+': Focused History',caseId:i%2?'seasonal_allergies':'uti_level1',sessionScore:score,badgeTier:score>=84?'GOLD':'SILVER',passed:score>=84,scoredAt:'2026-10-'+String(10+i)+'T12:00:00Z'})).reverse(),...(fixture==='portfolio-empty'?{identity:{professionalLevel:1,levelTitle:'Student Clinician',xp:0,nextLevelXp:100},streak:{currentCount:0},learningPathProgress:{pathTitle:'Clinical Foundations',completedSessions:0,totalSessions:4,percentComplete:0},milestones:[],competencies:[]}: {})}),
  getToday:async()=>{
    if(fixture==='portfolio-empty')return {identity:{},dailyBriefing:{nextGoal:null}};
    if(fixture==='error')throw new Error('Synthetic Today fetch error');
    if(fixture==='loading')await new Promise(()=>{});
    const incomplete=fixture==='incomplete'||fixture.startsWith('streak-');
    const m={...summary,completed:!incomplete,entryBlocked:incomplete,activities:summary.activities.map((a,i)=>({...a,completed:!incomplete||i<2}))};
    const focusSlug=(fixture==='focus-later'||(fixture==='focus-return'&&focusVisits>1))?'seasonal-allergies-complete-hpi':fixture==='focus-locked'?'first-patient':second.slug;
    const selected={patientSessionSlug:focusSlug,status:fixture==='retry'?'completed':'available',unitTitle:fixture==='long'?'Advanced clinical communication and comprehensive patient assessment across a multidisciplinary rotation':'First Clinical Encounter',displayTitle:'Taylor Reed: Complete Clinical Encounter'};
    return {dailyBriefing:{nextGoal:{title:'Strengthen your focused history',description:'Clarify the duration and associated symptoms.',currentValue:79,targetValue:84}},identity:fixture==='missing-xp'?{streak:{currentCount:0}}:{levelTitle:'Emerging Interviewer',professionalLevel:fixture==='streak-values'?12:2,xp:fixture==='streak-values'?12345:fixture==='streak-extreme'?1234567:140,nextLevelXp:fixture==='streak-values'?20000:fixture==='streak-extreme'?2000000:200,streak:{currentCount:fixture==='streak-values'?365:fixture==='streak-extreme'?12345:fixture==='streak-zero'?0:fixture==='singular'||fixture==='streak-one'?1:fixture==='streak-long'?12345:fixture==='streak-unavailable'?null:7}},module0:m,recommendedEncounter:fixture==='complete'||fixture==='locked'||fixture==='focus-complete'?null:selected,activeRotation:{...paths[0].units[0],title:fixture==='long'?'Advanced clinical communication and comprehensive patient assessment across a multidisciplinary rotation':paths[0].units[0].title,sessions:fixture==='locked'?[{...second,status:'locked'}]:fixture==='complete'?paths[0].units[0].sessions.map(s=>({...s,status:'completed'})):paths[0].units[0].sessions}};
  },
  getPatientSessionOverview:async slug=>{
    const selected=paths.flatMap(p=>p.units.flatMap(u=>u.sessions)).find(s=>s.slug===slug);
    if(!selected || selected.status==="locked" || selected.entryBlocked)throw new Error("Synthetic locked session");
    return {...selected,...(fixture==="brief-long"?{requiresHpi:undefined}:{}),description:fixture==="brief-long"?"Detailed clinical context and patient concerns. ".repeat(30):"Synthetic patient overview",achievements:[{id:"intro",title:fixture==="brief-long"?"Explore the full clinical history, concerns, risk factors and patient goals. ".repeat(4):"Formal Introduction",weightPercent:50},{id:"history",title:"Chief Complaint",weightPercent:50}],badgeThresholds:{gold:84,silver:50,bronze:1},estimatedTime:{min:3,max:5},linkedCase:{caseId:slug.includes("seasonal")?"seasonal_allergies":"uti_level1",title:"Synthetic case"},workflow:fixture==="brief-long"?{}:{requiresHpi:selected.requiresHpi},preceptorPersona:{name:"Dr. Martinez",slug:"dr-martinez",specialty:"Clinical Preceptor"}};
  },
  sendPreceptorChatMessage:async()=>{
    if(fixture==='mentor-loading')return new Promise(()=>{});
    if(fixture==='mentor-error')throw new Error('Synthetic connection unavailable. Please try again.');
    return {reply:fixture==='mentor-long'?"Use open questions, listen carefully, and clarify the clinical history before summarizing your understanding. ".repeat(18):"Synthetic mentor reply. Introduce yourself professionally and invite the patient to describe their main concern."};
  },
};
export const useUser = () => ({isLoaded:true,user:{id:"synthetic-roadmap-review",firstName:"Reviewer"}});
export const useAuth = () => ({userId:"synthetic-roadmap-review",sessionId:"synthetic-session"});
export const captureSession = () => () => {};
const memory = new Map();
export const getItemAsync = async key => memory.get(key)||null;
export const setItemAsync = async (key,value) => {memory.set(key,value);};
export function useVoicePreference(){const [voiceEnabled,setVoiceEnabled]=useState(fixture!=='voice-off');return {voiceEnabled,setVoiceEnabled};}
export function useSpeechPlayback(){const [isSpeaking,setSpeaking]=useState(false);const stop=useCallback(async()=>setSpeaking(false),[]);useEffect(()=>()=>{setSpeaking(false);},[]);return {isSpeaking,isPaused:false,stop,speak:async()=>setSpeaking(true),pause:stop,resume:async()=>setSpeaking(true),capture:()=>()=>true};}
export function useEnglishSpeechTranscription(options){return{isRecording:false,transcribing:false,recordingBusy:false,toggleRecording:async()=>options.onText("Synthetic dictated question")};}

export const useClerk=()=>({signOut:async()=>{}});
