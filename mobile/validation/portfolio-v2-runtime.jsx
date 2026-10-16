// Isolated Portfolio visual fixtures only. No production API, authentication or record writes.
import React,{useEffect,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
export const fixture=new URLSearchParams(location.search).get('fixture')||'default';
let currentOwner={userId:'synthetic-A',sessionId:'synthetic-session-A'},releaseA;
const listeners=new Set();
function useOwner(){const [owner,setOwner]=useState(currentOwner);useEffect(()=>{listeners.add(setOwner);return()=>listeners.delete(setOwner);},[]);return owner;}
function switchOwner(){currentOwner={userId:'synthetic-B',sessionId:'synthetic-session-B'};listeners.forEach(fn=>fn(currentOwner));}
export const useAuth=()=>useOwner();
export function useUser(){const owner=useOwner();return{isLoaded:true,user:{id:owner.userId,firstName:owner.userId==='synthetic-B'?'Reviewer B':'Reviewer A'}};}
export const useClerk=()=>({signOut:async()=>{}});
export const captureSession=()=>()=>{};
const milestone=(slug,title,status,category='milestone')=>({slug,title,status,category,description:'Synthetic backend milestone details: '+title,currentValue:status==='EARNED'?4:status==='IN_PROGRESS'?2:0,targetValue:4,earnedAt:status==='EARNED'?'2026-10-10T12:00:00Z':null});
function portfolioFor(owner){
 const result={identity:{professionalLevel:2,levelTitle:'Emerging Interviewer',xp:140,nextLevelXp:200},streak:{currentCount:7},learningPathProgress:{pathTitle:'Clinical Foundations',completedSessions:1,totalSessions:4,percentComplete:25},
 milestones:[milestone('first-visit','First Visit','EARNED'),milestone('introductions','Introductions','IN_PROGRESS','competency'),milestone('next','Next Milestone','LOCKED')],
 competencies:[{slug:'introduction',title:'Professional introduction',attempts:6,achievedCount:4,bestPercentScore:92,latestPercentScore:88},{slug:'communication',title:'Patient communication',attempts:6,achievedCount:5,bestPercentScore:91,latestPercentScore:90}],
 recentPatients:[72,81,66,88,79,94].map((score,i)=>({sessionAttemptId:'synthetic-'+i,patientSessionTitle:(i%2?'Taylor Reed':'Jordan Lee')+': Introduction & Chief Complaint',caseId:i%2?'seasonal_allergies_level1':'uti_level1',sessionScore:score,badgeTier:score>=84?'GOLD':'SILVER',passed:score>=84,scoredAt:'2026-10-'+(10+i)+'T12:00:00Z'})).reverse()};
 if(fixture==='empty'){result.identity={professionalLevel:1,levelTitle:'Student Clinician',xp:0,nextLevelXp:100};result.streak={currentCount:0};result.learningPathProgress={pathTitle:'Clinical Foundations',completedSessions:0,totalSessions:4,percentComplete:0};result.milestones=[];result.recentPatients=[];result.competencies=[];}
 if(fixture==='long'||fixture==='many'){
 result.milestones=Array.from({length:20},(_,i)=>milestone('milestone-'+i,i===0?'Comprehensive Clinical Communication and Patient Partnership Across Multiple Rotations':'Professional milestone '+(i+1),['EARNED','IN_PROGRESS','LOCKED'][i%3],i%2?'competency':'milestone'));
 if(fixture==='long'){result.identity={professionalLevel:12,levelTitle:'Advanced Professional Clinical Communication and Patient Partnership',xp:1234567,nextLevelXp:2000000};result.streak={currentCount:12345};result.learningPathProgress={pathTitle:'Comprehensive Clinical Foundations and Multidisciplinary Encounter Experience',completedSessions:1234,totalSessions:5678,percentComplete:22};result.recentPatients[0]={...result.recentPatients[0],caseId:'unavailable-portrait',patientSessionTitle:'Alexandra Montgomery: Comprehensive history, medication reconciliation and shared clinical planning across multiple concerns'};}
 }
 if(fixture==='missing'){result.identity={};result.streak={};result.learningPathProgress={};result.milestones=[{slug:'unknown',title:'Backend milestone without optional fields',status:'UNKNOWN',category:'milestone'}];result.recentPatients=[{sessionAttemptId:'incomplete',caseId:'unknown'}];result.competencies=[];}
 if(fixture==='one-score')result.recentPatients=result.recentPatients.slice(0,1);
 if(owner==='synthetic-B'){result.identity={professionalLevel:1,levelTitle:'Learner B clinical story',xp:20};result.learningPathProgress={pathTitle:'Learner B Learning Path',completedSessions:0,totalSessions:4,percentComplete:0};result.milestones=[];result.recentPatients=[];result.streak={currentCount:1};result.competencies=[];}
 return result;
}
let failedOnce=false;
export const api={
 getClinicalPortfolio:async headers=>{const owner=headers.expectedUserId;if(fixture==='loading')return new Promise(()=>{});if(fixture==='error'&&!failedOnce){failedOnce=true;throw Error('Synthetic Portfolio connection error. Retry is available.');}if(fixture==='switch'&&owner==='synthetic-A')return new Promise(resolve=>{releaseA=()=>resolve(portfolioFor(owner));});return portfolioFor(owner);},
 getToday:async()=>({dailyBriefing:{nextGoal:fixture==='empty'||fixture==='missing'||currentOwner.userId==='synthetic-B'?null:{title:'Your next clinical milestone',description:'Clarify symptom duration and associated symptoms.',currentValue:79,targetValue:84}}}),
 getCompetencyProfile:async()=>({student:{displayName:'Synthetic reviewer'},summary:{completedSessions:6,totalAttempts:6,averageScore:80},competencies:[{id:'history',name:'History Taking',description:'Evidence from scored encounters',currentScore:88,trend:'IMPROVING'}],growthSummary:{overallCompetencyScore:88,completedSessions:6}}),
};
export function FixtureAccountControl(){return fixture==='switch'?<View style={{position:'absolute',bottom:70,left:10,right:10,gap:5,backgroundColor:'#fff',borderWidth:1,padding:8}}><Text>Synthetic account-switch controls · no live services</Text><Pressable accessibilityRole='button' onPress={switchOwner} style={{padding:10}}><Text>Switch to learner B</Text></Pressable><Pressable accessibilityRole='button' onPress={()=>releaseA?.()} style={{padding:10}}><Text>Release delayed learner A response</Text></Pressable></View>:null;}
