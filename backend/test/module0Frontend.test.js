const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("../../mobile/node_modules/typescript");
const catalog = require("../src/content/clinicalReadiness.json");
const { createClinicalReadinessService } = require("../src/services/clinicalReadiness");
function compile(file, requireFn, globals = {}) {
  const exports = {};
  const code=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,"../../mobile",file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,require:requireFn,process:{env:{}},AbortController,Date,Math,Set,setTimeout,clearTimeout,console,...globals});return exports;
}
const view=compile("src/api/module0View.js",()=>({}));
function memoryService() {
  const rows=new Map();
  const client={learnerModuleProgress:{
    findUnique:async({where})=>structuredClone(rows.get(where.userId_moduleId.userId)||null),
    create:async({data})=>{const r={id:data.userId,revision:0,startedAt:new Date(),completedAt:null,...structuredClone(data)};rows.set(data.userId,r);return structuredClone(r);},
    updateMany:async({where,data})=>{const r=rows.get(where.userId);if(!r||r.revision!==where.revision)return{count:0};Object.assign(r,structuredClone(data),{revision:r.revision+1});return{count:1};},
  }};
  return createClinicalReadinessService({client,evaluate:async({kind,response})=>kind==="clarify"?{reply:"An open question invites the patient's account. Return to the exercise."}:{label:"Needs More Practice",feedback:"Your response is an attempt. Connect it to the visible facts.",evidence:[response.slice(0,20)]}});
}
function harness(file="app/module-0.tsx", params={}) {
  let slots=[],cursor=0,effects=[],dirty=false,root,instance;
  let userId="A",focused=true;
  const service=memoryService();const navigation=[],speeches=[],stops=[];
  let get=async()=>service.getProgress(userId);
  let post=async payload=>service.submit(userId,payload);
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const react={
    useRef(value){const i=cursor++;return slots[i] ||= {current:value};},
    useState(value){const i=cursor++;if(!(i in slots))slots[i]=typeof value==="function"?value():value;return[slots[i],next=>{slots[i]=typeof next==="function"?next(slots[i]):next;dirty=true;}];},
    useEffect(fn,deps){const i=cursor++;const previous=slots[i];if(!previous||!same(deps,previous.deps)){effects.push(()=>{previous?.cleanup?.();slots[i]={deps,cleanup:fn()};});}},
    useMemo(fn,deps){const i=cursor++;if(!slots[i]||!same(deps,slots[i].deps))slots[i]={deps,value:fn()};return slots[i].value;},
    useCallback(fn,deps){return react.useMemo(()=>fn,deps);},
  };
  const jsx=(type,props,key)=>({type,props:props||{},key});
  const router={push:route=>navigation.push(route),replace:route=>navigation.push(route),back:()=>navigation.push("back"),canGoBack:()=>true};
  const speech={isSpeaking:false,stop:async()=>{stops.push(true);},speak:async(text,_approval,valid)=>{speeches.push({text,valid});}};
  const api={getModule0Progress:(headers,signal)=>get(headers,signal),submitModule0Interaction:(payload,headers,signal)=>post(payload,headers,signal),
    getToday:async()=>({identity:{},module0:{storageReady:true,completed:false,completedCount:0,requiredCount:9,activities:catalog.activities.map(a=>({id:a.id,title:a.title,completedCount:0,requiredCount:a.steps.length,completed:false}))},activeRotation:{id:"rotation1",sessions:[]}}),
    getLearningPaths:async()=>[{id:"path",title:"Path",units:[{id:"rotation1",sessions:[]}]}],
  };
  function requireFn(name){
    if(name==="react")return react;
    if(name==="react/jsx-runtime")return{jsx,jsxs:jsx,Fragment:"Fragment"};
    if(name==="react-native")return{View:"View",Text:"Text",Pressable:"Pressable",ScrollView:"ScrollView",ActivityIndicator:"ActivityIndicator",RefreshControl:"RefreshControl",Modal:"Modal",StyleSheet:{create:x=>x},Animated:{Value:class{setValue(){}},sequence:()=>({start(){}}),timing:()=>({})},useWindowDimensions:()=>({width:800})};
    if(name==="react-native-safe-area-context")return{SafeAreaView:"SafeAreaView"};
    if(name==="@clerk/clerk-expo")return{useAuth:()=>({userId,sessionId:`session-${userId}`}),useUser:()=>({isLoaded:true,user:{id:userId}}),useClerk:()=>({signOut:async()=>{}})};
    if(name==="expo-router")return{useRouter:()=>router,useLocalSearchParams:()=>params};
    if(name==="@react-navigation/native")return{useIsFocused:()=>focused,useFocusEffect:fn=>react.useEffect(()=>fn(),[fn])};
    if(name.includes("module0View"))return view;
    if(name.includes("sessionToken"))return{captureSession:expected=>{const captured=userId;return()=>{if(expected!==userId||captured!==userId)throw new Error("Account changed");};}};
    if(name.includes("api/client"))return{api};
    if(name.includes("useVoicePreference"))return{useVoicePreference:()=>({voiceEnabled:true,setVoiceEnabled(){}})};
    if(name.includes("useSpeechPlayback"))return{useSpeechPlayback:()=>speech};
    if(name.includes("useEnglishSpeechTranscription"))return{useEnglishSpeechTranscription:()=>({isRecording:false,transcribing:false,recordingBusy:false,toggleRecording(){}})};
    if(name.includes("ClinicalsChatComposer"))return{ClinicalsChatComposer:"Composer"};
    if(name.includes("MentorAvatar"))return{MentorAvatar:"MentorAvatar"};
    if(name.includes("Module0Card"))return{Module0Card:"Module0Card"};
    if(name.includes("CompactJourneyCard"))return{CompactJourneyCard:"JourneyCard"};
    if(name.includes("RotationCard"))return{RotationCard:"RotationCard",rotationComplete:()=>false};
    if(name.includes("PatientAvatar"))return{PatientAvatar:"PatientAvatar"};
    if(name.includes("storage"))return{getItemAsync:async()=>null,setItemAsync:async()=>{}};
    if(name.includes("clinicalDisplay"))return{patientFacingText:x=>x};
    if(name.includes("styles"))return{portfolioStyles:{},casesStyles:{}};
    if(name==="@expo/vector-icons")return{MaterialCommunityIcons:"Icon"};
    throw new Error(`Unexpected frontend dependency ${name}`);
  }
  const exported=compile(file,requireFn);
  function render(){cursor=0;effects=[];dirty=false;const element=exported.default();
    if(typeof element.type==="function"){instance=element.type;cursor=0;root=instance(element.props);}else root=element;
    for(const effect of effects)effect();return root;
  }
  async function settle(){for(let i=0;i<12;i++){await new Promise(resolve=>setImmediate(resolve));if(dirty)render();}return root;}
  function unmount(){for(const slot of slots)slot?.cleanup?.();slots=[];}
  function nodes(node,result=[]){if(arguments.length===0)node=root;if(!node)return result;if(Array.isArray(node)){for(const child of node)nodes(child,result);return result;}if(typeof node!=="object")return result;result.push(node);nodes(node.props?.children,result);return result;}
  function text(node){if(node===undefined||node===null||typeof node==="boolean")return"";if(Array.isArray(node))return node.map(text).join(" ");if(typeof node!=="object")return String(node);return text(node.props?.children);}
  return{render,settle,unmount,nodes,text,service,navigation,speeches,stops,
    setGet:fn=>{get=fn;},setPost:fn=>{post=fn;},setFocused:value=>{focused=value;render();},
    switchUser:value=>{unmount();userId=value;render();},
    find:label=>nodes().find(n=>n.type==="Pressable"&&text(n).replace(/\s+/g," ").includes(label)),
    composer:()=>nodes().find(n=>n.type==="Composer"),
  };
}

test("frontend resume selection follows server next/pending state and completed work remains reviewable",()=>{
  const progress={next:{activityId:"b",stepId:"b2"},activities:[{id:"a",nextStepId:null,steps:[{id:"a1",completed:true}]},{id:"b",nextStepId:"b2",steps:[{id:"b1",completed:true},{id:"b2"}]}]};
  assert.equal(view.module0Selection(progress).step.id,"b2");assert.equal(view.module0Selection(progress,"a").step.id,"a1");
  assert.equal(view.module0Action({storageReady:true,completed:true}),"Review Module 0");
});
test("activity, navigation and account boundaries reject delayed work",()=>{
  const boundary=view.createModule0Boundary();boundary.enter("A:activity1");const old=boundary.capture();boundary.enter("A:activity2");assert.equal(old(),false);
  const current=boundary.capture();boundary.invalidate();assert.equal(current(),false);boundary.enter("B:activity2");assert.equal(current(),false);
});
test("Today and Full Roadmap render Module 0 before the rotation",async t=>{
  for(const file of ["app/(tabs)/index.tsx","app/(tabs)/cases.tsx"]){const h=harness(file);t.after(h.unmount);h.render();await h.settle();
    const nodes=h.nodes();const card=nodes.findIndex(n=>n.type==="Module0Card");const rotation=nodes.findIndex(n=>n.type==="RotationCard");
    assert.ok(card>=0&&rotation>card,file);
  }
});
test("Module 0 opens the exact unfinished step, saves weak feedback, advances, and permits completed review",async t=>{
  const h=harness();t.after(h.unmount);h.render();await h.settle();
  const c=h.composer();assert.ok(c);c.props.onChangeText("What brings you to the clinic today?");h.render();await h.settle();
  await h.composer().props.onSubmit();await h.settle();
  assert.match(h.text(h.render()),/1 of 9 interactions complete/);assert.match(h.text(h.render()),/give one concise OLD CARTS summary/);
  assert.equal((await h.service.getProgress("A")).completedCount,1);
  h.find("✓ Review 1").props.onPress();h.render();await h.settle();assert.match(h.text(h.render()),/Your saved response/);assert.match(h.text(h.render()),/Optional targeted practice/);
  assert.equal((await h.service.getProgress("A")).completedCount,1);
});
test("independent activity navigation cancels delayed replies and their audio without losing server progress",async t=>{
  const h=harness();t.after(h.unmount);h.render();await h.settle();let finish;
  h.setPost(payload=>new Promise(resolve=>{finish=async()=>resolve(await h.service.submit("A",payload));}));
  h.composer().props.onChangeText("What brings you to the clinic today?");h.render();h.composer().props.onSubmit();
  await h.settle();const previousSpeech=h.speeches.at(-1);
  h.find("Organizing Clinical Information").props.onPress();h.render();await h.settle();assert.equal(previousSpeech.valid(),false);
  await finish();await h.settle();assert.match(h.text(h.render()),/Place each item in SOAP/);
  assert.equal((await h.service.getProgress("A")).completedCount,1);assert.ok(h.stops.length);
});
test("leaving and reopening resumes durable progress; account switching cannot display a previous learner response",async t=>{
  const h=harness();t.after(h.unmount);h.render();await h.settle();
  const p=await h.service.getProgress("A");await h.service.submit("A",{activityId:catalog.activities[2].id,stepId:catalog.activities[2].steps[0].id,kind:"required",response:"I would examine respiratory findings and vital signs.",requestId:"persisted-response",expectedRevision:p.revision});
  h.unmount();h.render();await h.settle();assert.match(h.text(h.render()),/working possibility and an alternative/);
  h.switchUser("B");await h.settle();assert.match(h.text(h.render()),/0 of 9 interactions complete/);assert.doesNotMatch(h.text(h.render()),/I would examine respiratory findings/);
});
test("storage setup failure is visible and never masquerades as completion",async t=>{
  const h=harness();t.after(h.unmount);h.setGet(async()=>{throw{status:503,data:{error:"MODULE_STORAGE_UNAVAILABLE"}};});h.render();await h.settle();
  assert.match(h.text(h.render()),/not available yet/);assert.equal(h.composer(),undefined);
});

test("completed Module 0 opens review and optional practice never resets completion",async t=>{
  const h=harness();t.after(h.unmount);let revision=0;
  for(const activity of catalog.activities)for(const step of activity.steps)revision=(await h.service.submit("A",{activityId:activity.id,stepId:step.id,kind:"required",response:"A concise synthetic attempted response.",requestId:`completed-${step.id}`,expectedRevision:revision})).progress.revision;
  const before=await h.service.getProgress("A");h.render();await h.settle();assert.match(h.text(h.render()),/Module 0 completed/);assert.match(h.text(h.render()),/Your saved response/);
  h.find("Optional targeted practice").props.onPress();h.render();await h.settle();h.composer().props.onChangeText("What brings you to the clinic today?");h.render();h.composer().props.onSubmit();await h.settle();
  const after=await h.service.getProgress("A");assert.equal(after.completedCount,9);assert.deepEqual(after.completedAt,before.completedAt);
  h.find("Presenting to the Preceptor").props.onPress();h.render();await h.settle();assert.match(h.text(h.render()),/Give a brief SBAR/);assert.match(h.text(h.render()),/Your saved response/);
});
test("completed-step clarification retains completion and returns to the same exercise",async t=>{
  const h=harness();t.after(h.unmount);await h.service.submit("A",{activityId:catalog.activities[0].id,stepId:catalog.activities[0].steps[0].id,kind:"required",response:"What brings you to the clinic today?",requestId:"saved-review-step",expectedRevision:0});
  h.render();await h.settle();h.find("✓ Review 1").props.onPress();h.render();await h.settle();h.find("Ask for clarification").props.onPress();h.render();await h.settle();h.composer().props.onChangeText("How does an open question help?");h.render();h.composer().props.onSubmit();await h.settle();
  assert.equal((await h.service.getProgress("A")).completedCount,1);assert.match(h.text(h.render()),/Write your opening question/);
});
test("Module 0 card navigates to start, independent activities, and completed review",()=>{
  const navigation=[];const jsx=(type,props)=>({type,props});
  const component=compile("src/components/Module0Card.tsx",name=>name==="react/jsx-runtime"?{jsx,jsxs:jsx}:name==="react-native"?{View:"View",Text:"Text",Pressable:"Pressable",StyleSheet:{create:x=>x}}:name==="expo-router"?{useRouter:()=>({push:r=>navigation.push(r)})}:view);
  const summary={storageReady:true,completed:false,completedCount:0,requiredCount:9,activities:catalog.activities.map(a=>({id:a.id,title:a.title,completedCount:0,requiredCount:a.steps.length}))};
  const collect=(node)=>!node||typeof node!=="object"?[]:Array.isArray(node)?node.flatMap(collect):[node,...collect(node.props?.children)];
  const root=component.Module0Card({summary});const buttons=collect(root).filter(n=>n.type==="Pressable");buttons[0].props.onPress();buttons.at(-1).props.onPress();
  assert.equal(navigation[0].pathname,"/module-0");assert.equal(navigation[0].params.activityId,catalog.activities[0].id);assert.equal(navigation[1],"/module-0");
  const done=collect(component.Module0Card({summary:{...summary,completed:true,completedCount:9}}));assert.ok(done.some(n=>n.props.children==="Review Module 0"));
});
