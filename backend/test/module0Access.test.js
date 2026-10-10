const test = require("node:test");
const assert = require("node:assert/strict");
const { options, token } = require("./helpers/clerkSession");
const catalog = require("../src/content/clinicalReadiness.json");
const users = [{ id: "A", clerkUserId: "user_A" }, { id: "B", clerkUserId: "user_B" }];
const progress = new Map(); let missing = false; const writes = []; const paid = [];
const cases = { id: "case-db", caseId: "uti_level1", level: 1 };
const conversations = [
  {id:"active_A", userId:"A", user:users[0], patientCase:cases, caseId:cases.id, status:"IN_PROGRESS", messages:[{role:"USER",content:"Synthetic answer"}], submission:null},
  {id:"active_B", userId:"B", user:users[1], patientCase:cases, caseId:cases.id, status:"IN_PROGRESS", messages:[], submission:null},
  {id:"historical_A", userId:"A", user:users[0], patientCase:cases, caseId:cases.id, status:"SUBMITTED", messages:[{role:"USER",content:"Synthetic history"}], submittedAt:new Date(), submission:{id:"saved",score:90,feedback:"Saved feedback",details:{earned_points:20,available_points:25},submittedAt:new Date()}},
];
const fixture = new Proxy({}, {get(_target,model){return new Proxy({}, {get(_delegate,operation){return async args=>{
  const where=args?.where||{};
  if(model==="user"&&operation==="findUnique")return users.find(u=>u.id===where.id||u.clerkUserId===where.clerkUserId)||null;
  if(model==="learnerModuleProgress"&&operation==="findUnique"){
    if(missing)throw Object.assign(new Error("Synthetic missing table"),{code:"P2021"});
    return progress.get(where.userId_moduleId.userId)||null;
  }
  if(model==="conversation"&&["findUnique","findFirst"].includes(operation))return conversations.find(c=>c.id===where.id&&(!where.userId||c.userId===where.userId))||null;
  if(model==="conversation"&&operation==="findMany")return conversations.filter(c=>c.userId===where.userId&&c.submission);
  if(model==="patientSession"&&operation==="findFirst")return {id:"session",slug:"first-patient",title:"Synthetic session",achievements:[],unit:{learningPath:{preceptorPersona:{name:"Dr. Martinez"}}}};
  if(model==="case"&&operation==="findUnique")return cases;
  if(model==="case"&&operation==="upsert"){writes.push({model,operation});return cases;}
  if(model==="conversation"&&operation==="create"){writes.push({model,operation});const c={id:`created-${conversations.length}`,user:users.find(u=>u.id===args.data.userId),patientCase:cases,status:"IN_PROGRESS",messages:[],submission:null,...args.data};conversations.push(c);return c;}
  if(model==="userProgress"&&operation==="upsert")return args.create;
  if(["update","create","upsert"].includes(operation)){writes.push({model,operation});return {id:"synthetic",...args.data,...args.create};}
  if(operation==="findMany")return [];
  if(operation==="findFirst"||operation==="findUnique")return null;
  throw new Error(`Unexpected fixture ${model}.${operation}`);
};}});}});
require.cache[require.resolve("../src/db/prisma")]={exports:fixture};
require.cache[require.resolve("../src/llm/navigatorClient")]={exports:{
  getTtsConfig:()=>({model:"kokoro",voice:"af_heart",speed:1}),
  createPatientReply:async()=>{paid.push("chat");return "My throat hurts.";},
  createSpeechAudio:async()=>{paid.push("speech");return{audioBase64:"c3ludGhldGlj",mimeType:"audio/mpeg"};},
  transcribeAudio:async()=>{paid.push("transcription");return{text:"Synthetic answer",language:"en"};},
}};
process.env.GRADING_LLM_DISABLED="true";
const { createApp }=require("../src/app");
const { approvePatientSpeech }=require("../src/utils/patientSpeech");
const { getModule0Summary, applyModule0ToRoadmap, enforcementActive }=require("../src/services/module0Access");
const names=["cases","chat","grade","conversations","voice","progress","learningPaths","clinicalPortfolio","today","profile","clinicalReadiness"];
async function start(t){
  const server=createApp(Object.fromEntries(names.map(n=>[`${n}Router`,require(`../src/routes/${n}`)])),options).listen(0,"127.0.0.1");
  await new Promise(resolve=>server.once("listening",resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  return async(path,body,user="user_A",method=body?"POST":"GET")=>fetch(`http://127.0.0.1:${server.address().port}/api${path}`,{method,headers:{...(user?{Authorization:`Bearer ${token(user)}`}:{"x-clerk-user-id":"user_A"}),"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
}
function markComplete(userId){
  const required=Object.fromEntries(catalog.activities.flatMap(a=>a.steps.map(s=>[s.id,{evaluation:{label:"Needs More Practice"},response:"Synthetic attempt",requestId:`req-${s.id}`}])));
  progress.set(userId,{id:`progress-${userId}`,userId,contentVersion:1,revision:18,startedAt:new Date(),completedAt:new Date(),state:{schemaVersion:1,required,interactions:{},pending:null}});
}
test.beforeEach(()=>{process.env.MODULE0_PREREQUISITE_MODE="enforced";missing=false;progress.clear();writes.length=0;paid.length=0;});
test.after(()=>{delete process.env.MODULE0_PREREQUISITE_MODE;});
const clinicalRequests=()=>[
  ["/conversations",{caseId:"uti_level1",patientSessionSlug:"pretend-other-rotation",completed:true,userId:"B"}],
  ["/chat",{caseId:"uti_level1",messages:[]}],
  ["/chat",{caseId:"uti_level1",messages:[{role:"user",content:"Hello"}],module0Completed:true}],
  ["/chat",{caseId:"uti_level1",conversationId:"active_A",messages:[{role:"user",content:"Hello"}]}],
  ["/grade",{caseId:"uti_level1",conversation:[{role:"user",content:"Hello"}],userId:"B",module0Completed:true}],
  ["/conversations/active_A/messages",{role:"user",content:"Hello"}],
  ["/conversations/active_A/submit",{hpi:"Synthetic HPI",patientSessionSlug:"fake"}],
  ["/learning-paths/patient-sessions/first-patient/preceptor-chat",{message:"How should I start?"}],
  ["/voice/patient-greeting",{conversationId:"active_A",caseId:"uti_level1"}],
  ["/voice/patient-speak",{authorization:approvePatientSpeech({text:"Hello.",clerkUserId:"user_A",conversationId:"active_A",caseId:"uti_level1"}).authorization,conversationId:"active_A",caseId:"uti_level1"}],
];
test("enforced mode blocks every clinical-entry route before writes or paid calls, including identifier-free bypasses",async t=>{
  const request=await start(t);
  for(const [path,body] of clinicalRequests()){const response=await request(path,body);assert.equal(response.status,403,path);assert.equal((await response.json()).error,"MODULE0_REQUIRED");}
  assert.equal(writes.length,0);assert.equal(paid.length,0);
});
test("header impersonation and anonymous requests cannot reach the gate's data store",async t=>{
  const request=await start(t);
  for(const [path,body] of clinicalRequests())assert.equal((await request(path,body,null)).status,401,path);
  assert.equal(writes.length,0);assert.equal(paid.length,0);
});
test("historical records, saved-result replay, portfolio, roadmap and metadata remain readable without Module 0",async t=>{
  const request=await start(t);
  for(const path of ["/conversations/historical_A","/conversations/by-case/uti_level1","/clinical-portfolio","/profile/competencies","/learning-paths","/cases/uti_level1","/learning-paths/patient-sessions/first-patient"]){assert.equal((await request(path)).status,200,path);}
  const saved=await request("/conversations/historical_A/submit",{hpi:"Unused"});assert.equal(saved.status,200);assert.equal((await saved.json()).score,90);
  assert.equal((await request("/conversations/active_B")).status,404);
});
test("completion with weak feedback authorizes only its learner and never trusts another learner's record",async t=>{
  const request=await start(t);markComplete("A");
  const ordered = clinicalRequests().sort((a,b)=>Number(a[0].endsWith("/submit"))-Number(b[0].endsWith("/submit")));
  for(const [path,body] of ordered)assert.equal((await request(path,body)).status,200,path);
  const blocked=await request("/chat",{caseId:"uti_level1",messages:[],userId:"A"},"user_B");assert.equal(blocked.status,403);
  const wrongOwner=await request("/chat",{caseId:"uti_level1",conversationId:"active_B",messages:[]});assert.equal(wrongOwner.status,404);
});
test("enforced missing storage fails closed while default preview needs no storage and preserves clinical workflows",async t=>{
  const request=await start(t);missing=true;
  const blocked=await request("/conversations",{caseId:"uti_level1"});assert.equal(blocked.status,503);assert.equal(writes.length,0);
  delete process.env.MODULE0_PREREQUISITE_MODE;assert.equal(enforcementActive(),false);
  assert.equal((await request("/chat",{caseId:"uti_level1",messages:[{role:"user",content:"Hello"}]})).status,200);
  assert.equal((await request("/conversations",{caseId:"uti_level1"})).status,200);
  const summary=await getModule0Summary({userId:"A",client:fixture});assert.equal(summary.storageReady,false);assert.equal(summary.entryBlocked,false);assert.equal(summary.activities.length,4);
});
test("generic mentor speech/transcription remain authenticated and available for the prerequisite itself",async t=>{
  const request=await start(t);
  assert.equal((await request("/voice/speak",{text:"Let's practice opening questions.",voice:"am_adam"})).status,200);
  assert.equal((await request("/voice/transcribe",{audio_base64:"c3ludGhldGlj",language:"en"})).status,200);
});
test("roadmap entry gate retains historical grades and completion and releases after module completion",async()=>{
  const roadmap=[{units:[{sessions:[{status:"completed",bestSessionScore:90},{status:"available"}]}]}];
  const blocked=applyModule0ToRoadmap(roadmap,{entryBlocked:true});assert.equal(blocked[0].units[0].sessions[0].status,"completed");assert.equal(blocked[0].units[0].sessions[0].bestSessionScore,90);assert.ok(blocked[0].units[0].sessions.every(s=>s.entryBlocked));
  assert.equal(applyModule0ToRoadmap(roadmap,{entryBlocked:false}),roadmap);
  markComplete("A");const summary=await getModule0Summary({userId:"A",client:fixture});assert.equal(summary.completedCount,9);assert.equal(summary.entryBlocked,false);
});
test("bare completion timestamps and partial records cannot spoof completion",async t=>{
  const request=await start(t);markComplete("A");delete progress.get("A").state.required[catalog.activities[0].steps[0].id];
  assert.equal((await request("/chat",{caseId:"uti_level1",messages:[]})).status,403);
});
