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
  const code=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,"../../mobile",file),"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,require:requireFn,process:{env:{}},AbortController,Date,Math,Set,setTimeout,clearTimeout,console,...globals});return exports;
}
const view=compile("src/api/module0View.js",()=>({}));
const teaching=compile("src/components/module0/teaching.js",()=>compile("src/components/module0/presentation.js",()=>({})));
const presentation=compile("src/components/module0/presentation.js",()=>({}));
const approvedRequiredNarration = [
 "Read the three openings and choose the one you would use to begin this encounter. Make your choice before checking the feedback.",
 "Use the supplied Mr. Jones facts to write your OLD CARTS summary. Keep your response concise and avoid adding details that are not provided.",
 "For each statement, select the correct SOAP category. Select all four categories before submitting to check your classifications.",
 "Describe the history areas you would review, then choose two areas of daily-life context and explain why they matter for care planning.",
 "Answer both parts of the question: explain the purpose of this history step and discuss where the supplied finding belongs. Use your own words.",
 "Describe the examination information you would seek for this patient and explain how it would help your reasoning. Use the supplied history to guide your response.",
 "Present a working possibility, an alternative, and your reasons for considering each. Finish with an uncertainty you would discuss with your preceptor.",
 "Use the supplied case to give a brief SBAR presentation. Include your proposed next step and a question for your preceptor.",
 "Use the supplied case to lead a concise SNAPPS presentation. Make your uncertainty clear and finish with a focused learning question."
];
const approvedOptionalNarration = [
 "Rewrite the question shown on screen as an opening you would use with the patient. Submit your own wording when you are ready.",
 "Identify the OLD CARTS categories that fit the two supplied descriptions. Explain your choice using only the information shown.",
 "Classify the reported detail and explain your reasoning. Decide before checking the feedback.",
 "Choose one of the circumstances named in the question and explain how it could affect a proposed plan.",
 "Explain where you would document each of the two details shown. Make the distinction in your own words.",
 "Compare the two sources of information named in the question and explain how each contributes to reasoning.",
 "Explain the relationship between supporting evidence and the remaining uncertainty in this case. Give your reasoning rather than repeating the question.",
 "Revise the facts-only report using just the two SBAR sections requested. Focus on your interpretation and proposed action.",
 "Write only the Probe and Select parts requested here. Give one question for your preceptor and one focused question for further learning."
];
const approvedIllustrationAssignments = [
 ["history-and-context",2,"history-medications-allergies"],
 ["history-and-context",3,"history-surgical-family-context"],
 ["history-and-context",4,"history-social-environmental-context"],
 ["review-of-systems",2,"ros-systematic-symptom-questions"],
 ["review-of-systems",4,"ros-symptoms-in-history"],
 ["focused-examination",1,"focused-examination-purpose"],
 ["focused-examination",2,"focused-examination-guided-by-history"],
 ["focused-examination",4,"focused-findings-support-challenge-v2"],
 ["evidence-and-differential",2,"clinical-reasoning-possibilities"]
];
test("approved required/optional scripts are exact, neutral, and cover all 49 teaching panels",()=>{
 const steps=catalog.activities.flatMap(a=>a.steps);
 steps.forEach((step,i)=>{
  assert.equal(teaching.narrationFor("practice",step,null,0,null,"required"),approvedRequiredNarration[i]);
  assert.equal(teaching.narrationFor("practice",step,null,0,null,"practice"),approvedOptionalNarration[i]);
  assert.notEqual(approvedRequiredNarration[i],approvedOptionalNarration[i]);
 });
 assert.equal(teaching.conceptPanelsFor(steps[0])[0].narration,"An opening question sets the tone for the encounter. Giving the patient room to describe their concern helps you understand their story before exploring the details.");
 assert.notEqual(teaching.conceptPanelsFor(steps[0])[0].narration,approvedRequiredNarration[0]);
 const preserved=steps.slice(1).flatMap(s=>teaching.conceptPanelsFor(s));assert.equal(preserved.length,48);
 // Preserve the original baseline's non-art fields and all non-approved image assignments.
 // Only the nine explicitly approved illustration references are excluded; tested below.
 const allowedTitles=new Set(approvedIllustrationAssignments.map(([id,index])=>teaching.conceptPanelsFor({id})[index-1].title));
 const unchanged=preserved.map(p=>{if(!allowedTitles.has(p.title))return p;const {illustration,...rest}=p;return rest;});
 assert.ok(unchanged.every(p=>p.title && p.text && p.narration));
 for(const script of approvedRequiredNarration)assert.doesNotMatch(script,/pulmonary cause|cardiac possibility|belongs in Subjective|belongs in Objective|invites a story/);
 for(const screen of ["welcome","resume","module-complete","review"])for(const activity of catalog.activities)assert.equal(teaching.narrationFor(screen,activity.steps[0],null,0,activity),"");
});
test("approved illustrations retain mappings and provenance with pixel-identical optimized assets",()=>{
 const crypto=require("node:crypto");const imports=JSON.parse(fs.readFileSync(path.resolve(__dirname,"../../docs/module-0/approved-ui/illustration-integration/imported-assets.json"),"utf8"));
 const renderer=fs.readFileSync(path.resolve(__dirname,"../../mobile/src/components/module0/ApprovedScreens.tsx"),"utf8");
 for(const [id,index,asset] of approvedIllustrationAssignments){
  assert.equal(teaching.conceptPanelsFor({id})[index-1].illustration,asset);
  const record=imports.find(r=>r.filename===asset+".png");assert.ok(record);assert.equal(record.exerciseId,id);assert.equal(record.panelNumber,index);assert.ok(record.accessibleDescription);
  const optimized=require("./fixtures/imageAssets.json").find(a=>a.originalPath==="mobile/assets/module0/"+asset+".png");assert.ok(optimized);assert.equal(optimized.originalSha256,record.sha256);
  const file=fs.readFileSync(path.resolve(__dirname,"../..",optimized.path));assert.equal(file.toString("ascii",8,12),"WEBP");assert.equal(crypto.createHash("sha256").update(file).digest("hex"),optimized.sha256);
  assert.ok(renderer.includes('require("../../../'+optimized.path.replace("mobile/","")+'")'));assert.ok(renderer.includes(record.accessibleDescription));
 }
 const all=catalog.activities.flatMap(a=>a.steps.flatMap(s=>teaching.conceptPanelsFor(s)));
 for(const step of catalog.activities.flatMap(a=>a.steps)){const panels=teaching.conceptPanelsFor(step);for(let i=1;i<panels.length;i++)assert.notEqual(panels[i].illustration||panels[i].icon,panels[i-1].illustration||panels[i-1].icon);}
 const targets=all.filter(p=>catalog.activities.slice(1,3).flatMap(a=>a.steps).filter(s=>s.id!=="soap-and-data-types").flatMap(s=>teaching.conceptPanelsFor(s)).includes(p));
 // Selector arrays are stable; the four target exercises contain 18 existing panels.
 assert.equal(targets.length,18);assert.equal(targets.filter(p=>p.illustration).length,13);assert.equal(targets.filter(p=>!p.illustration).length,5);
 assert.equal(teaching.conceptPanelsFor({id:"soap-and-data-types"})[2].illustration,"objective-exam-findings");
 assert.equal(imports.find(r=>r.filename==="clinical-reasoning-possibilities.png").sourceEntry,"Clinicals3_Module0_Illustrations_Set02/04_clinical_reasoning_from_ideas_to_decisions.png");
});
test("response narration is the exact current feedback/reply and rejects mismatched identities",()=>{
 for(const activity of catalog.activities)for(const step of activity.steps){
  for(const label of ["Ready","Needs More Practice"]){
   const result={activityId:activity.id,stepId:step.id,requestId:"returned-"+step.id,kind:"required",evaluation:{label,feedback:"Actual feedback for "+step.id+".\n\nKeep this paragraph."}};
   assert.equal(teaching.narrationFor("feedback",step,result,0,activity),result.evaluation.feedback);
   for(const wrong of [{...result,stepId:"other"},{...result,activityId:"other"},{...result,requestId:""},{...result,kind:"clarify"}])assert.equal(teaching.narrationFor("feedback",step,wrong,0,activity),"");
  }
  const result={activityId:activity.id,stepId:step.id,requestId:"reply-"+step.id,kind:"clarify",evaluation:{reply:"Actual answer for "+step.id+".",feedback:"Do not substitute this."}};
  assert.equal(teaching.narrationFor("clarify",step,result,0,activity),result.evaluation.reply);
  assert.equal(teaching.narrationFor("clarify",step,{...result,kind:"required"},0,activity),"");
  assert.equal(teaching.narrationFor("clarify",step,{...result,activityId:"other"},0,activity),"");
  for(const screen of ["feedback","clarify"])assert.equal(teaching.narrationFor(screen,step,null,0,activity),"");
 }
});
test("returned-response audio eligibility uses transformed, trimmed backend character length",()=>{
 for(const screen of ["feedback","clarify"]){
  assert.equal(teaching.responseAudioTooLong(screen,"x".repeat(1200)),false);
  assert.equal(teaching.responseAudioTooLong(screen,"x".repeat(1201)),true);
  assert.equal(teaching.responseAudioTooLong(screen,"  "+"x".repeat(1200)+"  "),false);
  assert.equal(teaching.responseAudioTooLong(screen,"SBAR "+"x".repeat(1194)),false);
  assert.equal(teaching.responseAudioTooLong(screen,"SBAR "+"x".repeat(1195)),true);
  assert.equal(teaching.responseAudioTooLong(screen,"😀".repeat(600)),false);
  assert.equal(teaching.responseAudioTooLong(screen,"😀".repeat(601)),true);
 }
 assert.equal(teaching.responseAudioTooLong("teach","x".repeat(1201)),false);
});
test("complete teaching sequences have individual framework components and distinct companion narration",()=>{
 const counts=[1,10,6,5,4,4,5,6,8];
 const steps=catalog.activities.flatMap(a=>a.steps);
 steps.forEach((step,i)=>{
  const panels=teaching.conceptPanelsFor(step);assert.equal(panels.length,counts[i],step.id);
  assert.equal(new Set(panels.map(p=>p.narration)).size,panels.length,step.id);
  for(const p of panels){assert.ok(p.title && p.text && p.narration);assert.ok(p.icon);assert.notEqual(p.narration,p.text);}
 });
 for(const [id,components] of [["soap-and-data-types",["Subjective","Objective","Assessment","Plan"]],["sbar",["Situation","Background","Assessment","Recommendation"]],["snapps",["Summarize","Narrow","Analyze","Probe","Plan","Select"]]]){
  const panels=teaching.conceptPanelsFor({id});for(const component of components)assert.equal(panels.filter(p=>p.title.startsWith(component+":")).length,1,component);
 }
 const mapping=JSON.parse(fs.readFileSync(path.resolve(__dirname,"../../docs/module-0/approved-ui/teaching-expansion/asset-mapping.json"),"utf8"));
 for(const step of steps)for(const p of teaching.conceptPanelsFor(step))if(p.illustration && !p.illustration.startsWith("old-carts-")){const optimized=require("./fixtures/imageAssets.json").find(a=>a.originalPath==="mobile/assets/module0/"+p.illustration+".png");assert.ok(mapping[p.illustration] && optimized && fs.existsSync(path.resolve(__dirname,"../..",optimized.path)),p.illustration);}
 assert.equal(teaching.module0SpeechText("SBAR SOAP SNAPPS ACS SBARcode"),"s-bar SOAP SNAPPS ACS SBARcode");
});
function memoryService(evaluate, now) {
  const rows=new Map();
  const client={learnerModuleProgress:{
    findUnique:async({where})=>structuredClone(rows.get(where.userId_moduleId.userId)||null),
    create:async({data})=>{const r={id:data.userId,revision:0,startedAt:new Date(),completedAt:null,...structuredClone(data)};rows.set(data.userId,r);return structuredClone(r);},
    updateMany:async({where,data})=>{const r=rows.get(where.userId);if(!r||r.revision!==where.revision)return{count:0};Object.assign(r,structuredClone(data),{revision:r.revision+1});return{count:1};},
  }};
  return createClinicalReadinessService({client,now,evaluate:async input=>evaluate ? evaluate(input) : input.kind==="clarify"?{reply:"An open question invites the patient's account. Return to the exercise."}:{label:"Needs More Practice",feedback:"Your response is an attempt. Connect it to the visible facts.",evidence:[input.response.slice(0,20)]}});
}
function harness(file="app/module-0.tsx", params={}, options={}) {
  let slots=[],cursor=0,effects=[],dirty=false,root,instance;
  let userId="A",focused=true,recordedText; const transcriptionState=options.transcription || {};
  let clock=Date.now(), evaluate, sessionValid=true;
  const timers=new Map();let timerId=0;
  const schedule=(fn,ms)=>{const id=++timerId;timers.set(id,{fn,at:clock+ms});return id;};
  const service=memoryService(input=>evaluate ? evaluate(input) : input.kind==="clarify"?{reply:"An open question invites the patient narrative."}:{label:"Needs More Practice",feedback:"Your response is an attempt. Connect it to the visible facts.",evidence:[input.response.slice(0,20)]},()=>clock);const navigation=[],speeches=[],stops=[],recordings=[];
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
  react.createElement=(type,props,...children)=>jsx(type,{...props,children});
  const router={push:route=>navigation.push(route),replace:route=>navigation.push(route),back:()=>navigation.push("back"),canGoBack:()=>options.canGoBack ?? true};
  const speech={capture:()=>()=>true,isSpeaking:false,isPaused:false,pause:async()=>{speech.isSpeaking=false;speech.isPaused=true;},resume:async()=>{speech.isSpeaking=true;speech.isPaused=false;},stop:async()=>{stops.push(true);},speak:async(text,_approval,valid)=>{speeches.push({text,valid});}};
  const api={getModule0Progress:(headers,signal)=>get(headers,signal),submitModule0Interaction:(payload,headers,signal)=>post(payload,headers,signal),
    getToday:async()=>({identity:{},module0:{storageReady:true,completed:false,completedCount:0,requiredCount:9,activities:catalog.activities.map(a=>({id:a.id,title:a.title,completedCount:0,requiredCount:a.steps.length,completed:false}))},activeRotation:{id:"rotation1",sessions:[]}}),
    getLearningPaths:async()=>[{id:"path",title:"Path",units:[{id:"rotation1",sessions:[]}]}],
  };
  Object.assign(api,options.api);
  function requireFn(name){
    if(name === "./soap" || name.endsWith("module0/soap")) return compile("src/components/module0/soap.js",requireFn);
    if(name === "./SoapClassification") return compile("src/components/module0/SoapClassification.tsx",name=>name === "react" ? {...react,useState:()=>[null,()=>{}]} : requireFn(name));
    if(name === "./teaching" || name.includes("module0/teaching")) return compile("src/components/module0/teaching.js",()=>compile("src/components/module0/presentation.js",()=>({})));
    if(name.includes("module0/presentation") || name === "./presentation") return {...presentation, initialPresentation: options.approvedUI ? presentation.initialPresentation : () => null};
    // Screen focus refs belong to a child React component, not the controller hook slots.
    if(name.includes("module0/ApprovedScreens")) return compile("src/components/module0/ApprovedScreens.tsx",name=>name==="react"?{...react,useRef:initial=>({current:initial})}:requireFn(name));
    if(name === "./PracticeTask") return compile("src/components/module0/PracticeTask.tsx",requireFn);
    if(name === "./tokens" || name.includes("module0/tokens")) return compile("src/components/module0/tokens.ts",requireFn);
    if(name === "expo-font") return {useFonts:()=>[true,null]};
    if(name === "expo-image") return {Image:"Image"};
    if(/\.(png|webp|svg|ttf)$/.test(name)) return 1;
    if(name==="react")return react;
    if(name==="react/jsx-runtime")return{jsx,jsxs:jsx,Fragment:"Fragment"};
    if(name==="react-native")return{View:"View",Text:"Text",TextInput:"TextInput",Pressable:"Pressable",ScrollView:"ScrollView",ActivityIndicator:"ActivityIndicator",KeyboardAvoidingView:"KeyboardAvoidingView",RefreshControl:"RefreshControl",Modal:"Modal",Platform:{OS:options.platform || "web"},StyleSheet:{create:x=>x},Animated:{Value:class{setValue(){}},sequence:()=>({start(){}}),timing:()=>({})},useWindowDimensions:()=>({width:options.width || 390,height:options.height || 844})};
    if(name==="react-native-safe-area-context")return{SafeAreaView:"SafeAreaView",useSafeAreaInsets:()=>options.insets || ({top:0,bottom:0,left:0,right:0})};
    if(name==="@clerk/clerk-expo")return{useAuth:()=>({userId,sessionId:`session-${userId}`}),useUser:()=>({isLoaded:true,user:{id:userId}}),useClerk:()=>({signOut:async()=>{}})};
    if(name==="expo-router")return{useRouter:()=>router,useLocalSearchParams:()=>params};
    if(name==="@react-navigation/native")return{useIsFocused:()=>focused,useFocusEffect:fn=>react.useEffect(()=>focused?fn():undefined,[fn,focused])};
    if(name.includes("module0View"))return view;
    if(name.includes("sessionToken"))return{captureSession:expected=>{if(!sessionValid)throw new Error("Session expired");const captured=userId;return()=>{if(!sessionValid||expected!==userId||captured!==userId)throw new Error("Account changed");};}};
    if(name.includes("api/client"))return{api};
    if(name.includes("useVoicePreference"))return{useVoicePreference:()=>{const [voiceEnabled,setVoiceEnabled]=react.useState(options.voiceEnabled ?? true);return {voiceEnabled,setVoiceEnabled};}};
    if(name.includes("useSpeechPlayback"))return{useSpeechPlayback:()=>speech};
    if(name.includes("useEnglishSpeechTranscription"))return{useEnglishSpeechTranscription:options=>{recordedText=options.onText;return{isRecording:false,transcribing:false,recordingBusy:false,...transcriptionState,toggleRecording(){recordings.push(true);}};}};
    if(name.includes("ClinicalsChatComposer"))return{ClinicalsChatComposer:"Composer"};
    if(name.includes("MentorAvatar"))return{MentorAvatar:"MentorAvatar"};
    if(name.includes("AccountSettingsButton"))return{AccountSettingsButton:"AccountSettingsButton"};
    if(name.includes("ProgressHeader"))return{ProgressHeader:"ProgressHeader",progressLayout:{scroll:{}}};
    if(name.includes("LearnerStatusCard"))return{LearnerStatusCard:"LearnerStatusCard"};
    if(name.endsWith("learnerStatus"))return compile("src/components/learnerStatus.ts",requireFn);
    if(name.includes("today/TodayPresentation"))return{TodayHeader:"TodayHeader",TodayContent:"TodayContent",todayStyles:{}};
    if(name.includes("today/model"))return compile("src/components/today/model.ts",requireFn);
    if(name.includes("roadmap/JourneyConnections"))return{JourneyCanvas:"JourneyCanvas"};
    if(name.includes("roadmap/RoadmapJourney"))return{RoadmapFoundation:"RoadmapFoundation",RoadmapHeader:"RoadmapHeader",RoadmapJourney:"RoadmapJourney",roadmapStyles:{}};
    if(name.includes("roadmap/useRoadmapFocus"))return compile("src/components/roadmap/useRoadmapFocus.ts",requireFn,{requestAnimationFrame:fn=>schedule(fn,0)});
    if(name.includes("roadmap/focus") || name === "./focus")return compile("src/components/roadmap/focus.ts",requireFn);
    if(name === "./journey")return compile("src/components/roadmap/journey.ts",requireFn);
    if(name.includes("roadmap/journey"))return compile("src/components/roadmap/journey.ts",requireFn);
    if(name.includes("Module0Card"))return{Module0Card:"Module0Card"};
    if(name.includes("CompactJourneyCard"))return{CompactJourneyCard:"JourneyCard"};
    if(name.includes("RotationCard"))return{RotationCard:"RotationCard",rotationComplete:()=>false};
    if(name.includes("MeetPreceptor"))return compile("src/components/MeetPreceptor.tsx",requireFn);
    if(name.includes("PatientBrief"))return compile("src/components/PatientBrief.tsx",requireFn);
    if(name.includes("PatientAvatar"))return{PatientAvatar:"PatientAvatar"};
    if(name.includes("storage"))return{getItemAsync:async()=>null,setItemAsync:async()=>{}};
    if(name.includes("clinicalDisplay"))return compile("src/utils/clinicalDisplay.ts",requireFn);
    if(name.includes("portfolio/IllustratedPortfolio"))return compile("src/components/portfolio/IllustratedPortfolio.tsx",name=>name==="react"?{...react,useState:initial=>[initial,()=>{}]}:requireFn(name));
    if(name === "./gallery" || name.endsWith("portfolio/gallery"))return compile("src/components/portfolio/gallery.ts",requireFn);
    if(name.endsWith("portfolio/presentation"))return compile("src/components/portfolio/presentation.ts",requireFn);
    if(name.includes("ClinicalPerformance"))return compile("src/components/portfolio/ClinicalPerformance.tsx",name=>name==="react"?{...react,useState:initial=>[initial,()=>{}]}:requireFn(name));
    if(name === "./performance" || name.endsWith("portfolio/performance"))return compile("src/components/portfolio/performance.ts",requireFn);
    if(name.includes("CompetencyProfileTab"))return{CompetencyProfileTab:"CompetencyProfileTab"};
    if(name.includes("Sparkline"))return{Sparkline:"Sparkline"};
    if(name.includes("TimelineEvent"))return{TimelineEvent:"TimelineEvent"};
    if(name.includes("styles"))return{portfolioStyles:{},casesStyles:{}};
    if(name==="@expo/vector-icons")return{MaterialCommunityIcons:"Icon",Ionicons:"Icon"};
    throw new Error(`Unexpected frontend dependency ${name}`);
  }
  const composerComponent=compile("src/components/ClinicalsChatComposer.tsx",requireFn).ClinicalsChatComposer;
  const exported=compile(file,requireFn, options.fakeTimers ? {setTimeout:schedule,clearTimeout:id=>timers.delete(id),Date:class extends Date {static now(){return clock;}}} : {});
  function render(){cursor=0;effects=[];dirty=false;const element=exported.default();
    if(typeof element.type==="function"){instance=element.type;cursor=0;root=instance(element.props);}else root=element;
    for(const effect of effects)effect();return root;
  }
  async function settle(){for(let i=0;i<12;i++){await new Promise(resolve=>setImmediate(resolve));if(dirty)render();}return root;}
  function unmount(){for(const slot of slots)slot?.cleanup?.();slots=[];}
  function nodes(node,result=[]){if(arguments.length===0)node=root;if(!node)return result;if(Array.isArray(node)){for(const child of node)nodes(child,result);return result;}if(typeof node!=="object")return result;result.push(node);if(node.type==="Composer")nodes(composerComponent(node.props),result);else if(typeof node.type==="function")nodes(node.type(node.props),result);else nodes(node.props?.children,result);return result;}
  function text(node){if(node===undefined||node===null||typeof node==="boolean")return"";if(Array.isArray(node))return node.map(text).join(" ");if(typeof node!=="object")return String(node);return typeof node.type==="function" ? text(node.type(node.props)) : text(node.props?.children);}
  return{render,settle,unmount,nodes,text,service,navigation,speeches,stops,recordings,
    input:()=>nodes().find(n=>n.type==="TextInput"),
    dictate:text=>recordedText(text),
    advance:async ms=>{clock+=ms;for(const [id,timer] of [...timers])if(timer.at<=clock){timers.delete(id);timer.fn();}await settle();},
    setEvaluate:fn=>{evaluate=fn;}, expireSession:()=>{sessionValid=false;}, refreshSession:()=>{sessionValid=true;},
    setSpeaking:value=>{speech.isSpeaking=value;render();},
    setGet:fn=>{get=fn;},setPost:fn=>{post=fn;},setFocused:value=>{focused=value;render();},
    switchUser:value=>{unmount();userId=value;render();},
    find:label=>nodes().find(n=>n.type==="Pressable"&&(text(n).replace(/\s+/g," ").includes(label) || n.props.accessibilityLabel?.includes(label))),
    composer:()=>nodes().find(n=>n.type==="Composer"),
  };
}

async function continueFeedback(h) {
  assert.ok(h.find("Continue →"), "saved feedback is visible before advancement");
  assert.equal(h.input(), undefined, "next exercise input is not displayed on feedback");
  h.find("Continue →").props.onPress(); h.render(); await h.settle();
  await finishTeaching(h);
}

async function finishTeaching(h) {
 if(h.render().props.screen === "introduction"){h.find("Begin").props.onPress();h.render();await h.settle();}
 if (h.find("Learn OLD CARTS")) {h.find("Learn OLD CARTS").props.onPress();h.render();await h.settle();}
 const panels=teaching.conceptPanelsFor(h.render().props.step);
 for(let i=0;i<panels.length && ["old-carts-teach","teach"].includes(h.render().props.screen);i++){ (h.find("Practice with Mr. Jones") || h.find("Got it") || h.find("Practice →") || h.find("Continue →")).props.onPress();h.render();await h.settle();}
}
function selectSoap(h,values=["S","O","A","P"]) {
 values.forEach((value,index)=>{h.nodes().filter(n=>n.type === "select")[index].props.onChange({target:{value}});h.render();});
}

async function returnToSelection(h) {
 for(let i=0;i<25 && h.render().props.screen!=="review";i++){h.find("Back").props.onPress();h.render();await h.settle();}
 assert.equal(h.render().props.screen,"review");
}
async function reviewOpening(h) {
 if(!h.find("Activities and reviews")){await finishTeaching(h);}
 if(!h.find("✓ Review 1") && !h.find("Review: Open the Interview")){h.find("Activities and reviews").props.onPress();h.render();await h.settle();}
 (h.find("✓ Review 1") || h.find("Review: Open the Interview")).props.onPress();h.render();await h.settle();
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
test("Roadmap retains overview, evaluation, case-wide history, preceptor chat and encounter launch",async t=>{
  const session={id:"s",slug:"first-patient-hpi",title:"Taylor Reed: Complete Clinical Encounter",status:"available"};
  const calls=[];
  const h=harness("app/(tabs)/cases.tsx",{}, {api:{
    getLearningPaths:async()=>[{id:"p",title:"Path",units:[{id:"u",title:"Rotation",slug:"u",sessions:[session]}]}],
    getPatientSessionOverview:async(slug,headers)=>{calls.push({slug,headers});return{...session,achievements:[{id:"a",title:"History",weightPercent:100}],badgeThresholds:{gold:84,silver:50,bronze:1},estimatedTime:{min:3,max:5},linkedCase:{caseId:"shared-case",title:"Case"},workflow:{requiresHpi:true}};},
    sendPreceptorChatMessage:async(slug,payload,headers)=>{calls.push({slug,payload,headers});return{reply:"Synthetic mentor answer"};},
  }});t.after(h.unmount);h.render();await h.settle();
  await h.nodes().find(n=>n.type==="RoadmapJourney").props.onSessionPress(session);await h.settle();
  assert.match(h.text(h.render()),/YOUR MISSION/);
  h.find("Show evaluation details").props.onPress();h.render();assert.match(h.text(h.render()),/Performance Levels/);
  h.find("View Previous Attempts").props.onPress();h.render();assert.equal(JSON.stringify(h.navigation.at(-1).params),JSON.stringify({caseId:"shared-case"}));
  await h.nodes().find(n=>n.type==="RoadmapJourney").props.onSessionPress(session);await h.settle();
  h.find("Meet Preceptor").props.onPress();h.render();await h.settle();
  await h.find("What is a chief complaint?").props.onPress();await h.settle();
  assert.match(h.text(h.render()),/Synthetic mentor answer/);
  assert.equal(calls.at(-1).headers.expectedUserId,"A");
  h.find("Meet Patient").props.onPress();h.render();
  const destination=h.navigation.at(-1);assert.equal(destination.pathname,"/(tabs)/level1");
  assert.equal(destination.params.caseId,"shared-case");assert.equal(destination.params.patientSessionSlug,session.slug);
  assert.equal(destination.params.requiresHpi,"true");
});

test("Roadmap direct links and refreshed entry respect backend locked and Module 0 blocked status",async t=>{
  for(const [status,entryBlocked,expected] of [["available",false,1],["locked",false,0],["completed",true,0]]){
    let opened=0;const session={id:"s",slug:"direct",title:"Synthetic",status,entryBlocked};
    const h=harness("app/(tabs)/cases.tsx",{focusSessionSlug:"direct",focusSessionToken:"refresh"},{api:{
      getLearningPaths:async()=>[{id:"p",title:"Path",units:[{id:"u",sessions:[session]}]}],
      getPatientSessionOverview:async()=>{opened++;throw new Error("Synthetic overview unavailable");},
    }});t.after(h.unmount);h.render();await h.settle();assert.equal(opened,expected);
  }
});

test("Roadmap overview errors are visible; account changes cannot reuse an old Roadmap",async t=>{
  const h=harness("app/(tabs)/cases.tsx",{}, {api:{getLearningPaths:async()=>{throw new Error("Synthetic roadmap failure");}}});
  t.after(h.unmount);h.render();await h.settle();assert.match(h.text(h.render()),/Synthetic roadmap failure/);assert.ok(h.find("Retry"));
  h.switchUser("B");await h.settle();assert.equal(h.nodes().some(n=>n.type==="RoadmapJourney"),false);
});

test("Roadmap rejects delayed data after switching accounts and preserves loading and empty states",async t=>{
  let finish;const h=harness("app/(tabs)/cases.tsx",{}, {api:{getLearningPaths:headers=>headers.expectedUserId==="A"
    ? new Promise(resolve=>{finish=resolve;}) : Promise.resolve([{id:"B",title:"B-only path",units:[]}])}});
  t.after(h.unmount);h.render();await h.settle();assert.equal(h.nodes().some(n=>n.type==="ActivityIndicator"),true);
  h.switchUser("B");await h.settle();finish([{id:"A",title:"A-private path",units:[]}]);await h.settle();
  const journey=h.nodes().find(n=>n.type==="RoadmapJourney");assert.equal(journey.props.paths[0].id,"B");
  const empty=harness("app/(tabs)/cases.tsx",{}, {api:{getLearningPaths:async()=>[]}});t.after(empty.unmount);empty.render();await empty.settle();assert.match(empty.text(empty.render()),/No learning paths found/);
});

test("Today keeps Module 0 as primary focus; Roadmap preserves foundation ordering",async t=>{
 const h=harness("app/(tabs)/index.tsx");t.after(h.unmount);h.render();await h.settle();const content=h.nodes().find(n=>n.type==="TodayContent");assert.equal(content.props.data.module0.completed,false);content.props.onContinue();assert.equal(h.navigation.at(-1),"/module-0");
 const r=harness("app/(tabs)/cases.tsx");t.after(r.unmount);r.render();await r.settle();const nodes=r.nodes();assert.ok(nodes.findIndex(n=>n.type==="RoadmapJourney")>nodes.findIndex(n=>n.type==="RoadmapFoundation"));
});
test("Today recommendation keeps overview navigation and isolates late account responses",async t=>{
 const make=id=>({identity:{xp:100},module0:{completed:true,entryBlocked:false},recommendedEncounter:{patientSessionSlug:id,status:"completed"}});
 let finish;const h=harness("app/(tabs)/index.tsx",{}, {api:{getToday:headers=>headers.expectedUserId==="A"?new Promise(resolve=>{finish=resolve;}):Promise.resolve(make("B-session"))}});
 t.after(h.unmount);h.render();await h.settle();h.switchUser("B");await h.settle();finish(make("A-private"));await h.settle();const content=h.nodes().find(n=>n.type==="TodayContent");assert.equal(content.props.data.recommendedEncounter.patientSessionSlug,"B-session");content.props.onContinue();const route=h.navigation.at(-1);assert.equal(route.params.focusSessionSlug,"B-session");assert.ok(route.params.focusSessionToken);content.props.onRoadmap();assert.equal(h.navigation.at(-1),"/(tabs)/cases");
});

test("Module 0 opens the exact unfinished step, saves weak feedback, advances, and permits completed review",async t=>{
  const h=harness();t.after(h.unmount);h.render();await h.settle();
  const c=h.composer();assert.ok(c);c.props.onChangeText("What brings you to the clinic today?");h.render();await h.settle();
  await h.composer().props.onSubmit();await h.settle();
  await continueFeedback(h);
  assert.equal(h.render().props.progress.completedCount,1);assert.match(h.text(h.render()),/Summarize the symptoms/);
  assert.equal((await h.service.getProgress("A")).completedCount,1);
  await reviewOpening(h);assert.match(h.text(h.render()),/Your saved response/);assert.match(h.text(h.render()),/Optional targeted practice/);
  assert.equal((await h.service.getProgress("A")).completedCount,1);
});
test("independent activity navigation cancels delayed replies and their audio without losing server progress",async t=>{
  const h=harness();t.after(h.unmount);h.render();await h.settle();let finish;
  h.setPost(payload=>new Promise(resolve=>{finish=async()=>resolve(await h.service.submit("A",payload));}));
  h.composer().props.onChangeText("What brings you to the clinic today?");h.render();h.composer().props.onSubmit();
  await h.settle();const previousSpeech=h.speeches.at(-1);
  h.find("Activities and reviews").props.onPress();h.render();await h.settle();h.find("Organizing Clinical Information").props.onPress();h.render();await h.settle();assert.equal(previousSpeech.valid(),false);
  await finish();await h.settle();assert.match(h.text(h.render()),/SOAP and Data Types/);await finishTeaching(h);assert.match(h.text(h.render()),/Identify the SOAP Components/);
  assert.equal((await h.service.getProgress("A")).completedCount,1);assert.ok(h.stops.length);
});
test("leaving and reopening resumes durable progress; account switching cannot display a previous learner response",async t=>{
  const h=harness();t.after(h.unmount);h.render();await h.settle();
  const p=await h.service.getProgress("A");await h.service.submit("A",{activityId:catalog.activities[2].id,stepId:catalog.activities[2].steps[0].id,kind:"required",response:"I would examine respiratory findings and vital signs.",requestId:"persisted-response",expectedRevision:p.revision});
  h.unmount();h.render();await h.settle();await finishTeaching(h);assert.match(h.text(h.render()),/working possibility and an alternative/);
  h.switchUser("B");await h.settle();assert.equal(h.render().props.progress.completedCount,0);assert.doesNotMatch(h.text(h.render()),/I would examine respiratory findings/);
});
test("storage setup failure is visible and never masquerades as completion",async t=>{
  const h=harness();t.after(h.unmount);h.setGet(async()=>{throw{status:503,data:{error:"MODULE_STORAGE_UNAVAILABLE"}};});h.render();await h.settle();
  assert.match(h.text(h.render()),/not available yet/);assert.equal(h.composer(),undefined);
});

test("completed Module 0 opens review and optional practice never resets completion",async t=>{
  const h=harness();t.after(h.unmount);let revision=0;
  for(const activity of catalog.activities)for(const step of activity.steps)revision=(await h.service.submit("A",{activityId:activity.id,stepId:step.id,kind:"required",response:"A concise synthetic attempted response.",requestId:`completed-${step.id}`,expectedRevision:revision})).progress.revision;
  const before=await h.service.getProgress("A");h.render();await h.settle();assert.equal(h.render().props.progress.completed,true);assert.match(h.text(h.render()),/Your saved response/);
  h.find("Optional targeted practice").props.onPress();h.render();await h.settle();h.composer().props.onChangeText("What brings you to the clinic today?");h.render();h.composer().props.onSubmit();await h.settle();
  const after=await h.service.getProgress("A");assert.equal(after.completedCount,9);assert.deepEqual(after.completedAt,before.completedAt);
  await continueFeedback(h);
  h.find("Activities and reviews").props.onPress();h.render();await h.settle();h.find("Presenting to the Preceptor").props.onPress();h.render();await h.settle();assert.match(h.text(h.render()),/Give a brief SBAR/);assert.match(h.text(h.render()),/Your saved response/);
});
test("completed-step clarification retains completion and returns to the same exercise",async t=>{
  const h=harness();t.after(h.unmount);await h.service.submit("A",{activityId:catalog.activities[0].id,stepId:catalog.activities[0].steps[0].id,kind:"required",response:"What brings you to the clinic today?",requestId:"saved-review-step",expectedRevision:0});
  h.render();await h.settle();await reviewOpening(h);h.find("Ask Dr. Martinez").props.onPress();h.render();await h.settle();h.input().props.onChangeText("How does an open question help?");h.render();h.nodes().find(n=>n.props?.accessibilityLabel==="Send clarification question").props.onPress();await h.settle();
  assert.match(h.text(h.render()),/An open question invites/);
  h.find("Back").props.onPress();h.render();await h.settle();
  assert.equal((await h.service.getProgress("A")).completedCount,1);assert.match(h.text(h.render()),/What would you ask first\?/);
});
test("Module 0 card navigates to start, independent activities, and completed review",()=>{
  const navigation=[];const jsx=(type,props)=>({type,props});
  const component=compile("src/components/Module0Card.tsx",name=>name==="react/jsx-runtime"?{jsx,jsxs:jsx}:name==="react-native"?{View:"View",Text:"Text",Pressable:"Pressable",StyleSheet:{create:x=>x}}:name==="expo-router"?{useRouter:()=>({push:r=>navigation.push(r)})}:view);
  const summary={storageReady:true,completed:false,completedCount:0,requiredCount:9,activities:catalog.activities.map(a=>({id:a.id,title:a.title,completedCount:0,requiredCount:a.steps.length}))};
  const collect=(node)=>!node||typeof node!=="object"?[]:Array.isArray(node)?node.flatMap(collect):[node,...collect(node.props?.children)];
  const root=component.Module0Card({summary});const buttons=collect(root).filter(n=>n.type==="Pressable");buttons[0].props.onPress();buttons.at(-1).props.onPress();
  assert.equal(navigation[0].pathname,"/module-0");assert.equal(navigation[0].params.activityId,catalog.activities[0].id);assert.equal(navigation[1],"/module-0");
  const done=collect(component.Module0Card({summary:{...summary,completed:true,completedCount:9}}));assert.ok(done.some(n=>n.props.children==="Review Module 0"));
  done.filter(n=>n.type==="Pressable").at(-1).props.onPress();assert.equal(navigation.at(-1).pathname,"/module-0");assert.equal(navigation.at(-1).params.mode,"review");
});


test("actual composer input unlocks after leaving during submission and returning without server pending",async t=>{
  const h=harness();t.after(h.unmount);h.render();await h.settle();
  const input=()=>h.nodes().find(n=>n.type==="TextInput");
  assert.equal(input().props.editable,true);
  input().props.onChangeText("What brings you to the clinic today?");h.render();
  h.setPost(()=>new Promise(()=>{}));
  h.find("Submit").props.onPress();h.render();await h.settle();
  assert.equal(input().props.editable,false);
  h.setFocused(false);await h.settle();h.setFocused(true);await h.settle();
  assert.equal((await h.service.getProgress("A")).pending,null);
  assert.equal(input().props.editable,true);
});

test("real composer button dispatches once, displays processing and weak feedback, then unlocks the next input",async t=>{
  const h=harness();t.after(h.unmount);h.render();await h.settle();let finish,calls=0;
  h.setEvaluate(({response})=>new Promise(resolve=>{finish=()=>resolve({label:"Needs More Practice",feedback:"Connect your opening question to the patient's concern.",evidence:[response.slice(0,20)]});}));
  h.setPost((payload,headers,signal)=>{calls++;assert.equal(headers.expectedUserId,"A");assert.equal(signal.aborted,false);return h.service.submit("A",payload);});
  h.setSpeaking(true);assert.equal(h.input().props.editable,true,"TTS does not lock typing");
  h.input().props.onChangeText("What brings you to the clinic today?");h.render();
  const press=h.find("Submit").props.onPress;press();press();assert.equal(h.input().props.onSubmitEditing,undefined);
  h.render();await h.settle();assert.equal(calls,1);assert.equal(h.input().props.editable,false);
  assert.match(h.text(h.render()),/Submitting your answer and preparing feedback/);
  assert.ok((await h.service.getProgress("A")).pending,"answer saved before evaluation");
  finish();await h.settle();assert.match(h.text(h.render()),/Needs More Practice/);
  await continueFeedback(h);
  assert.equal(h.render().props.progress.completedCount,1);assert.equal(h.input().props.editable,true);
});

test("failed evaluation restores its saved answer, explains retry delay and completes safely on retry",async t=>{
  const h=harness("app/module-0.tsx",{}, {fakeTimers:true});t.after(h.unmount);
  h.setEvaluate(()=>{throw new Error("synthetic evaluation failure");});h.render();await h.settle();
  h.input().props.onChangeText("What brings you to the clinic today?");h.render();h.find("Submit").props.onPress();await h.settle();
  assert.match(h.text(h.render()),/Your answer is saved and awaiting feedback/);
  assert.match(h.text(h.render()),/Feedback could not be completed/);
  assert.match(h.text(h.render()),/Retry is available in about/);
  const rendered=h.nodes();
  const facts=rendered.findIndex(n=>n.type==="Text"&&h.text(n)==="Mr. Jones · Instructional facts");
  const recovery=rendered.findIndex(n=>n.type==="Text"&&h.text(n).includes("Your answer is saved and awaiting feedback"));
  const composer=rendered.findIndex(n=>n.type==="Composer");
  assert.ok(facts<recovery&&recovery<composer,"recovery is beside the answer controls, after the long lesson content");
  const before=await h.service.getProgress("A");assert.equal(before.completedCount,0);
  assert.equal(h.input().props.editable,false);assert.equal(h.find("Retry feedback").props.disabled,true);
  h.unmount();h.render();await h.settle();assert.match(h.text(h.render()),/What brings you to the clinic today/);
  assert.match(h.text(h.render()),/Your answer is saved and awaiting feedback/);
  h.setEvaluate(({response})=>({label:"Ready",feedback:"You invited the patient's narrative.",evidence:[response.slice(0,20)]}));
  await h.advance(6000);assert.equal(h.find("Retry feedback").props.disabled,false);
  h.find("Retry feedback").props.onPress();await h.settle();
  const after=await h.service.getProgress("A");assert.equal(after.completedCount,1);
  assert.equal(after.activities[0].steps[0].saved.requestId,before.pending.requestId);
  assert.match(h.text(h.render()),/You invited the patient's narrative/);
  await continueFeedback(h);assert.equal(h.input().props.editable,true);
});

test("transport timeout refreshes authoritative pending state and polling recovers completed feedback",async t=>{
  const h=harness("app/module-0.tsx",{}, {fakeTimers:true});t.after(h.unmount);let finish,worker;
  h.setEvaluate(({response})=>new Promise(resolve=>{finish=()=>resolve({label:"Ready",feedback:"Your question invites the patient's narrative.",evidence:[response.slice(0,20)]});}));
  h.setPost(async payload=>{worker=h.service.submit("A",payload);while(!finish)await new Promise(resolve=>setImmediate(resolve));throw{code:"REQUEST_TIMEOUT"};});
  h.render();await h.settle();h.input().props.onChangeText("What brings you to the clinic today?");h.render();h.find("Submit").props.onPress();await h.settle();
  assert.match(h.text(h.render()),/Feedback took longer than expected/);
  assert.match(h.text(h.render()),/Your answer is saved and awaiting feedback/);assert.equal(h.input().props.editable,false);
  finish();await worker;await h.advance(3000);
  assert.match(h.text(h.render()),/Your question invites/);
  await continueFeedback(h);assert.equal(h.render().props.progress.completedCount,1);
  assert.equal(h.input().props.editable,true);assert.doesNotMatch(h.text(h.render()),/Feedback took longer/);
});

test("failed submission without a persisted answer has an actionable error and editable input",async t=>{
  const h=harness();t.after(h.unmount);h.setPost(async()=>{throw{status:400,data:{error:"RESPONSE_ATTEMPT_REQUIRED"}};});h.render();await h.settle();
  h.input().props.onChangeText("synthetic attempt");h.render();h.find("Submit").props.onPress();await h.settle();
  assert.match(h.text(h.render()),/Please make an attempt/);assert.ok(h.find("Refresh saved progress"));
  assert.equal(h.input().props.editable,true);assert.equal(h.input().props.value,"synthetic attempt");
  assert.equal((await h.service.getProgress("A")).pending,null);
});

test("leaving and returning during evaluation resumes the next unfinished step after the server completes",async t=>{
  const h=harness();t.after(h.unmount);let finish,worker;
  h.setEvaluate(({response})=>new Promise(resolve=>{finish=()=>resolve({label:"Ready",feedback:"You invited the patient's narrative.",evidence:[response.slice(0,20)]});}));
  h.setPost(payload=>{worker=h.service.submit("A",payload);return worker;});h.render();await h.settle();
  h.input().props.onChangeText("What brings you to the clinic today?");h.render();h.find("Submit").props.onPress();await h.settle();
  h.setFocused(false);await h.settle();finish();await worker;await h.settle();
  h.setFocused(true);await h.settle();
  await continueFeedback(h);
  assert.match(h.text(h.render()),/Summarize the symptoms/);assert.equal(h.input().props.editable,true);
  assert.equal((await h.service.getProgress("A")).completedCount,1);
});

test("leaving and returning while evaluation remains pending shows recovery rather than an unexplained lock",async t=>{
  const h=harness("app/module-0.tsx",{}, {fakeTimers:true});t.after(h.unmount);let finish;
  h.setEvaluate(({response})=>new Promise(resolve=>{finish=()=>resolve({label:"Ready",feedback:"You attempted the exercise.",evidence:[response.slice(0,20)]});}));
  h.render();await h.settle();h.input().props.onChangeText("What brings you to the clinic today?");h.render();h.find("Submit").props.onPress();await h.settle();
  h.setFocused(false);await h.settle();h.setFocused(true);await h.settle();
  assert.equal(h.input().props.editable,false);assert.match(h.text(h.render()),/Your answer is saved and awaiting feedback/);
  finish();await h.settle();await h.advance(3000);await continueFeedback(h);assert.equal(h.input().props.editable,true);
});

test("missing local session on submit is visible and cannot silently swallow the answer",async t=>{
  const h=harness();t.after(h.unmount);let calls=0;h.setPost(async()=>{calls++;});h.render();await h.settle();
  h.input().props.onChangeText("What brings you to the clinic today?");h.render();h.expireSession();h.find("Submit").props.onPress();await h.settle();
  assert.equal(calls,0);assert.match(h.text(h.render()),/Your session expired/);assert.equal(h.input().props.value,"What brings you to the clinic today?");
});

test("expired API session reports an actionable error and preserves the draft",async t=>{
  const h=harness();t.after(h.unmount);h.setPost(async()=>{throw{status:401};});h.render();await h.settle();
  h.input().props.onChangeText("What brings you to the clinic today?");h.render();h.find("Submit").props.onPress();await h.settle();
  assert.match(h.text(h.render()),/Your session expired/);assert.equal(h.input().props.editable,true);
  assert.equal(h.input().props.value,"What brings you to the clinic today?");
});

test("completed-step review offers a direct return to the active exercise",async t=>{
  const h=harness();t.after(h.unmount);
  await h.service.submit("A",{activityId:catalog.activities[0].id,stepId:catalog.activities[0].steps[0].id,kind:"required",response:"What brings you to the clinic today?",requestId:"review-completed",expectedRevision:0});
  h.render();await h.settle();await reviewOpening(h);
  assert.equal(h.input(),undefined);h.find("Continue to the next unfinished exercise").props.onPress();h.render();await h.settle();await finishTeaching(h);
  assert.equal(h.input().props.editable,true);assert.match(h.text(h.render()),/Summarize the symptoms/);
});

test("polling cannot replace newer saved progress with an older read",async t=>{
  const h=harness("app/module-0.tsx",{}, {fakeTimers:true});t.after(h.unmount);
  h.render();await h.settle();const stale=await h.service.getProgress("A");let read;
  h.setGet(()=>new Promise(resolve=>{read=()=>resolve(stale);}));
  h.input().props.onChangeText("What brings you to the clinic today?");h.render();
  // Hold submission while a pre-save GET is in flight.
  let post;h.setPost(payload=>new Promise(resolve=>{post=async()=>resolve(await h.service.submit("A",payload));}));
  h.find("Submit").props.onPress();h.render();await h.settle();await h.advance(3000);
  await post();await h.settle();read();await h.settle();
  await continueFeedback(h);
  assert.equal(h.render().props.progress.completedCount,1);assert.equal(h.input().props.editable,true);
});

test("leaving before submission and reopening keeps the unanswered input editable without creating progress",async t=>{
  const h=harness();t.after(h.unmount);h.render();await h.settle();
  h.input().props.onChangeText("An unsubmitted synthetic draft");h.render();
  h.setFocused(false);await h.settle();h.setFocused(true);await h.settle();assert.equal(h.input().props.editable,true);
  h.unmount();h.render();await h.settle();assert.equal(h.input().props.editable,true);
  assert.equal((await h.service.getProgress("A")).completedCount,0);
  assert.equal((await h.service.getProgress("A")).pending,null);
});

test("account switching during submission discards old UI feedback and audio while preserving only the original learner's answer",async t=>{
  const h=harness();t.after(h.unmount);let finish,signal;
  h.setEvaluate(({response})=>new Promise(resolve=>{finish=()=>resolve({label:"Ready",feedback:"Synthetic account A feedback.",evidence:[response.slice(0,20)]});}));
  h.setPost((payload,headers,abortSignal)=>{assert.equal(headers.expectedUserId,"A");signal=abortSignal;return h.service.submit("A",payload);});
  h.render();await h.settle();h.input().props.onChangeText("Synthetic account A opening question");h.render();h.find("Submit").props.onPress();await h.settle();
  const oldAudio=h.speeches.at(-1);h.switchUser("B");await h.settle();
  assert.equal(signal.aborted,true);assert.equal(oldAudio.valid(),false);finish();await h.settle();
  assert.equal(h.render().props.progress.completedCount,0);assert.doesNotMatch(h.text(h.render()),/Synthetic account A/);
  assert.equal(h.input().props.editable,true);assert.equal((await h.service.getProgress("A")).completedCount,1);
  assert.equal((await h.service.getProgress("B")).completedCount,0);
});

test("a completed activity has an obvious continue action and reopening does not trap the learner in review",async t=>{
  const h=harness();t.after(h.unmount);let revision=0;
  for(const step of catalog.activities[0].steps)revision=(await h.service.submit("A",{activityId:catalog.activities[0].id,stepId:step.id,kind:"required",response:"A concise synthetic attempted response",requestId:`activity-done-${step.id}`,expectedRevision:revision})).progress.revision;
  h.render();await h.settle();if(!h.find("Activities and reviews")){await finishTeaching(h);}h.find("Activities and reviews").props.onPress();h.render();await h.settle();(h.find("Starting the Encounter") || h.find("Review: Open the Interview")).props.onPress();h.render();await h.settle();
  assert.match(h.text(h.render()),/Activity complete/);assert.equal(h.input(),undefined);
  h.find("Continue to the next unfinished activity").props.onPress();h.render();await h.settle();
  await finishTeaching(h);assert.equal(h.nodes().filter(n=>n.type === "select").length,4);assert.match(h.text(h.render()),/Identify the SOAP Components/);
  h.setFocused(false);await h.settle();h.setFocused(true);await h.settle();assert.ok(h.nodes().filter(n=>n.type === "select").every(n=>!n.props.disabled));
  assert.equal((await h.service.getProgress("A")).completedCount,2);
});

test("known failed feedback stops GET polling but its local timer enables same-answer retry",async t=>{
  const h=harness("app/module-0.tsx",{}, {fakeTimers:true});t.after(h.unmount);let reads=0;
  h.setGet(async()=>{reads++;return h.service.getProgress("A");});
  h.setEvaluate(()=>{throw new Error("synthetic evaluation failure");});h.render();await h.settle();
  h.input().props.onChangeText("What brings you in today?");h.render();h.find("Submit").props.onPress();await h.settle();
  const failed=await h.service.getProgress("A");assert.equal(failed.pending.status,"failed");
  const before=reads;await h.advance(6000);await h.advance(12000);await h.advance(12000);
  assert.equal(reads,before,"no indefinite failed-state GET polling");
  assert.match(h.text(h.render()),/Automatic checks have stopped/);assert.equal(h.find("Retry feedback").props.disabled,false);
  h.setEvaluate(({response})=>({label:"Ready",feedback:"You invited the patient's narrative.",evidence:[response]}));
  h.find("Retry feedback").props.onPress();await h.settle();
  const saved=await h.service.getProgress("A");assert.equal(saved.completedCount,1);
  assert.equal(saved.activities[0].steps[0].saved.requestId,failed.pending.requestId);
});

test("expired evaluating lease stops automatic GET checks and exposes retry without resetting progress",async t=>{
  const h=harness("app/module-0.tsx",{}, {fakeTimers:true});t.after(h.unmount);let reads=0,finish;
  h.setGet(async()=>{reads++;return h.service.getProgress("A");});
  h.setEvaluate(({response})=>new Promise(resolve=>{finish=()=>resolve({label:"Ready",feedback:"You attempted the exercise.",evidence:[response]});}));
  const worker=h.service.submit("A",{activityId:catalog.activities[0].id,stepId:catalog.activities[0].steps[0].id,kind:"required",response:"What brings you in today?",requestId:"expired-worker-answer",expectedRevision:0});
  await h.settle();h.render();await h.settle();assert.match(h.text(h.render()),/Saved progress refreshes automatically/);
  await h.advance(120001);const before=reads;await h.advance(6000);await h.advance(6000);
  assert.equal(reads,before);assert.match(h.text(h.render()),/Automatic checks have stopped/);
  assert.equal(h.find("Retry feedback").props.disabled,false);
  finish();await worker;
  h.find("Refresh saved progress").props.onPress();await h.settle();await continueFeedback(h);assert.equal(h.render().props.progress.completedCount,1);
});

async function openingPractice(h) {
  h.render();await h.settle();
  for(const label of ["Let's start","Begin","Got it"]){h.find(label).props.onPress();h.render();await h.settle();}
}
function selectChoice(h, choice) { h.nodes().find(n=>n.type==="Pressable"&&n.props.accessibilityLabel===choice).props.onPress(); }
test("approved flow submits provisional text through unchanged grading and holds feedback before advancing",async t=>{
  const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);await openingPractice(h);
  assert.equal(h.find("Check answer").props.disabled,true);selectChoice(h,"Is your chest hurting?");h.render();await h.settle();
  let submitted;h.setPost(payload=>{submitted=payload;return h.service.submit("A",payload);});
  h.find("Check answer").props.onPress();await h.settle();
  assert.equal(submitted.response,"Is your chest hurting?");assert.equal(submitted.stepId,"open-the-interview");assert.equal(submitted.kind,"required");
  assert.match(h.text(h.render()),/Needs More Practice/);assert.equal((await h.service.getProgress("A")).completedCount,1);
  await continueFeedback(h);assert.match(h.text(h.render()),/Summarize the symptoms/);assert.ok(h.composer());
});
test("approved choices preserve drafts when returning to free text without saving presentation navigation",async t=>{
  const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);await openingPractice(h);
  selectChoice(h,"What brings you in today?");h.render();assert.equal(h.find("Use free text"),undefined);
  assert.equal(h.nodes().find(n=>n.props?.accessibilityLabel === "What brings you in today?").props.accessibilityState.checked,true);assert.equal((await h.service.getProgress("A")).completedCount,0);
  assert.equal((await h.service.getProgress("A")).pending,null);
  for(const a of catalog.activities)for(const step of a.steps)assert.equal(presentation.hasApprovedChoices(a,{...step,completed:false}),step.id==="open-the-interview");
});
test("approved choice evaluation failure returns to durable recovery without losing the answer",async t=>{
  const h=harness("app/module-0.tsx",{}, {approvedUI:true,fakeTimers:true});t.after(h.unmount);h.setEvaluate(()=>{throw new Error("synthetic failure");});await openingPractice(h);
  selectChoice(h,"What brings you in today?");h.render();h.find("Check answer").props.onPress();await h.settle();
  const saved=await h.service.getProgress("A");assert.equal(saved.pending.response,"What brings you in today?");assert.equal(saved.completedCount,0);
  assert.match(h.text(h.render()),/Your answer is saved and awaiting feedback/);assert.ok(h.find("Retry feedback"));
});
test("Feedback stays on the submitted exercise through focus refresh with companion narration",async t=>{
  const h=harness();t.after(h.unmount);h.render();await h.settle();
  h.setEvaluate(({response})=>({label:"Ready",feedback:"Exact first-exercise feedback.",evidence:[response]}));
  h.input().props.onChangeText("Synthetic first attempt");h.render();h.find("Submit").props.onPress();await h.settle();
  assert.match(h.text(h.render()),/Exact first-exercise feedback/);assert.doesNotMatch(h.text(h.render()),/Summarize the symptoms/);
  assert.equal(h.render().props.narration,"Exact first-exercise feedback.");
  h.find("Play narration").props.onPress();assert.equal(h.speeches.at(-1).text,"Exact first-exercise feedback.");const oldAudio=h.speeches.at(-1);
  h.setFocused(false);await h.settle();assert.equal(oldAudio.valid(),false);h.setFocused(true);await h.settle();
  assert.match(h.text(h.render()),/Exact first-exercise feedback/);assert.equal(h.input(),undefined);
  await continueFeedback(h);assert.match(h.text(h.render()),/Summarize the symptoms/);
});
test("Clarify uses the submitted question and server reply, retains draft, and never advances required progress",async t=>{
  const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);await openingPractice(h);
  selectChoice(h,"Is your chest hurting?");h.render();h.find("Ask Dr. Martinez").props.onPress();h.render();await h.settle();
  h.input().props.onChangeText("A synthetic question about this concept?");h.render();h.nodes().find(n=>n.props?.accessibilityLabel==="Send clarification question").props.onPress();await h.settle();
  assert.match(h.text(h.render()),/A synthetic question about this concept/);assert.match(h.text(h.render()),/An open question invites the patient narrative/);
  assert.equal((await h.service.getProgress("A")).completedCount,0);assert.equal(h.render().props.narration,"An open question invites the patient narrative.");
  h.find("Play narration").props.onPress();assert.equal(h.speeches.at(-1).text,teaching.narrationFor("clarify",h.render().props.step,h.render().props.result));
  h.find("Back").props.onPress();h.render();await h.settle();
  assert.equal(h.nodes().find(n=>n.props?.accessibilityLabel==="Is your chest hurting?").props.accessibilityState.checked,true);
});
test("Resume shows actual server count and next exercise without creating progress",async t=>{
  const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);
  await h.service.submit("A",{activityId:catalog.activities[0].id,stepId:catalog.activities[0].steps[0].id,kind:"required",response:"Synthetic opening attempt",requestId:"resume-server",expectedRevision:0});
  const before=await h.service.getProgress("A");h.render();await h.settle();
  assert.match(h.text(h.render()),/1\s+of\s+9\s+complete/);assert.match(h.text(h.render()),/Organize OLD CARTS/);assert.equal(h.input(),undefined);
  h.find("Resume →").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"old-carts-teach");await finishTeaching(h);assert.match(h.text(h.render()),/Summarize the symptoms/);assert.ok(h.composer());
  assert.equal((await h.service.getProgress("A")).revision,before.revision);
});
test("all nine required submissions show feedback before activity and module completion; completion remains reviewable",async t=>{
  const h=harness();t.after(h.unmount);h.render();await h.settle();let count=0;
  for(const activity of catalog.activities){
    for(const step of activity.steps){
      await finishTeaching(h);if(step.id === "soap-and-data-types")selectSoap(h);else {assert.ok(h.composer(),step.id);h.input().props.onChangeText("Synthetic attempted response for "+step.id);}h.render();h.find("Submit").props.onPress();await h.settle();
      count++;assert.equal((await h.service.getProgress("A")).completedCount,count);assert.match(h.text(h.render()),/Needs More Practice/);
      assert.equal(h.render().props.result.activityId,activity.id);assert.equal(h.render().props.result.stepId,step.id);
      assert.doesNotMatch(h.text(h.render()),/Activity complete!|Module 0 Complete!/);await continueFeedback(h);
    }
    assert.match(h.text(h.render()),/Activity complete!/);assert.equal(h.input(),undefined);
    if(count<9){h.find("Next activity").props.onPress();h.render();await h.settle();}
  }
  const before=await h.service.getProgress("A");h.find("View module completion").props.onPress();h.render();await h.settle();
  assert.match(h.text(h.render()),/Module 0 Complete!/);assert.match(h.text(h.render()),/4 activities/);assert.match(h.text(h.render()),/9 exercises/);
  h.find("Review completed exercises").props.onPress();h.render();await h.settle();assert.match(h.text(h.render()),/Review & Practice/);h.find("Review: Open the Interview").props.onPress();h.render();await h.settle();await finishTeaching(h);assert.match(h.text(h.render()),/Your saved response/);assert.ok(h.find("Optional targeted practice"));
  assert.equal((await h.service.getProgress("A")).revision,before.revision);
});
test("completed landing uses server completion and routes to the existing roadmap",async t=>{
  const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);let revision=0;
  for(const a of catalog.activities)for(const step of a.steps)revision=(await h.service.submit("A",{activityId:a.id,stepId:step.id,kind:"required",response:"Synthetic completion attempt",requestId:"landing-"+step.id,expectedRevision:revision})).progress.revision;
  h.render();await h.settle();assert.match(h.text(h.render()),/Module 0 Complete!/);assert.equal(h.input(),undefined);
  h.find("Continue to Rotation 1").props.onPress();assert.equal(h.navigation.at(-1),"/(tabs)/cases");
});


test("a reply for another request cannot become Feedback; recovery uses the exact saved submission",async t=>{
  const h=harness();t.after(h.unmount);h.render();await h.settle();
  h.setPost(async payload=>{const saved=await h.service.submit("A",payload);return {...saved,result:{...saved.result,requestId:"wrong-request",stepId:"organize-old-carts",evaluation:{label:"Ready",feedback:"Wrong exercise feedback"}}};});
  h.input().props.onChangeText("Synthetic exact answer");h.render();h.find("Submit").props.onPress();await h.settle();
  assert.doesNotMatch(h.text(h.render()),/Wrong exercise feedback/);assert.match(h.text(h.render()),/Your response is an attempt/);
  assert.equal(h.input(),undefined);await continueFeedback(h);assert.match(h.text(h.render()),/Summarize the symptoms/);
});

test("free-text exercises and saved review use the approved presentation instead of the legacy page",async t=>{
  const h=harness();t.after(h.unmount);h.render();await h.settle();
  assert.equal(h.render().type.name,"ApprovedScreens");assert.equal(h.render().props.textMode,true);
  h.input().props.onChangeText("What brings you to the clinic today?");h.render();h.find("Submit").props.onPress();await h.settle();
  await continueFeedback(h);assert.equal(h.render().type.name,"ApprovedScreens");assert.equal(h.render().props.step.id,"organize-old-carts");assert.ok(h.composer());
  await reviewOpening(h);assert.equal(h.render().type.name,"ApprovedScreens");assert.match(h.text(h.render()),/Your saved response/);
});
test("failed-answer recovery uses approved styling while preserving request identity and disabled input",async t=>{
  const h=harness("app/module-0.tsx",{}, {fakeTimers:true});t.after(h.unmount);h.setEvaluate(()=>{throw new Error("synthetic failure");});h.render();await h.settle();
  h.input().props.onChangeText("What brings you to the clinic today?");h.render();h.find("Submit").props.onPress();await h.settle();
  const before=await h.service.getProgress("A");assert.equal(h.render().type.name,"ApprovedScreens");assert.equal(h.render().props.textMode,true);
  assert.equal(h.input().props.editable,false);assert.match(h.text(h.render()),/Your answer is saved and awaiting feedback/);
  await h.advance(6000);h.setEvaluate(({response})=>({label:"Ready",feedback:"You invited a narrative.",evidence:[response]}));h.find("Retry feedback").props.onPress();await h.settle();
  const after=await h.service.getProgress("A");assert.equal(after.activities[0].steps[0].saved.requestId,before.pending.requestId);assert.ok(h.find("Continue →"));
});

test("manual corrections preserve transition, captions, mute, Back draft and pending evaluation",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);h.render();await h.settle();
 h.find("Let's start").props.onPress();h.render();await h.settle();assert.match(h.speeches.at(-1).text,/Welcome to Starting the Encounter/);
 const count=h.speeches.length;h.find("Show captions").props.onPress();h.render();await h.settle();assert.match(h.text(h.render()),/Welcome to Starting the Encounter/);
 h.find("Mute").props.onPress();h.render();await h.settle();assert.equal(h.speeches.length,count);h.find("Unmute").props.onPress();h.render();await h.settle();assert.equal(h.speeches.length,count);
 assert.equal(h.find("Replay"),undefined);assert.ok(h.find("Play narration"));assert.equal(h.speeches.length,count);
 h.find("Begin").props.onPress();h.render();await h.settle();h.find("Got it").props.onPress();h.render();await h.settle();
 selectChoice(h,"What brings you in today?");h.render();h.find("Check answer").props.onPress();await h.settle();
 h.find("Continue →").props.onPress();h.render();await h.settle();assert.match(h.text(h.render()),/Exercise\s+1\s+complete!/);assert.doesNotMatch(h.text(h.render()),/Activity complete!/);
 const saved=await h.service.getProgress("A");h.find("Back").props.onPress();h.render();await h.settle();assert.match(h.text(h.render()),/Needs More Practice/);assert.equal((await h.service.getProgress("A")).revision,saved.revision);
 await continueFeedback(h);h.input().props.onChangeText("Synthetic OLD CARTS draft");h.render();h.find("Back").props.onPress();h.render();await h.settle();assert.match(h.text(h.render()),/Patient words to clinical qualifiers/);h.find("Practice with Mr. Jones").props.onPress();h.render();await h.settle();assert.equal(h.input().props.value,"Synthetic OLD CARTS draft");
 let finish;h.setEvaluate(({response})=>new Promise(resolve=>{finish=()=>resolve({label:"Ready",feedback:"Synthetic feedback",evidence:[response]});}));h.find("Submit").props.onPress();await h.settle();assert.equal(h.find("Back").props.disabled,true);finish();await h.settle();await continueFeedback(h);assert.match(h.text(h.render()),/Activity complete!/);
});

test("refined controls have accessible states and captions use only companion narration",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);await openingPractice(h);
 const play=h.find("Play narration");assert.equal(play.props.accessibilityState.disabled,false);const size=play.props.style({pressed:false})[0];assert.ok(size.width>=44&&size.height>=44);
 h.find("Show captions").props.onPress();h.render();await h.settle();const caption=h.nodes().find(n=>n.props.accessibilityLabel==="Narration captions");assert.equal(h.text(caption),h.render().props.narration);assert.notEqual(h.text(caption),h.render().props.step.teach+" "+h.render().props.step.question);
 h.setSpeaking(true);h.find("Pause narration").props.onPress();h.render();assert.ok(h.find("Play narration").props.accessibilityState.selected);h.find("Play narration").props.onPress();h.render();assert.ok(h.find("Pause narration"));
 h.find("Mute narration").props.onPress();h.render();assert.ok(h.find("Unmute narration").props.accessibilityState.selected);assert.ok(h.find("Hide captions").props.accessibilityState.selected);
});
test("Close exits to Today and preserves completed work",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);await h.service.submit("A",{activityId:catalog.activities[0].id,stepId:catalog.activities[0].steps[0].id,kind:"required",response:"Synthetic saved opening",requestId:"close-saved",expectedRevision:0});h.render();await h.settle();h.find("Resume →").props.onPress();h.render();await h.settle();const before=await h.service.getProgress("A");h.find("Close lesson").props.onPress();assert.equal(h.navigation.at(-1),"/(tabs)");assert.deepEqual(await h.service.getProgress("A"),before);
});
test("Close during pending feedback exits while preserving the same recoverable request",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true,fakeTimers:true});t.after(h.unmount);h.setEvaluate(()=>{throw Error("Synthetic failure")});await openingPractice(h);selectChoice(h,"What brings you in today?");h.render();h.find("Check answer").props.onPress();await h.settle();const before=await h.service.getProgress("A");h.find("Close lesson").props.onPress();assert.equal(h.navigation.at(-1),"/(tabs)");h.unmount();h.render();await h.settle();assert.equal((await h.service.getProgress("A")).pending.requestId,before.pending.requestId);assert.equal((await h.service.getProgress("A")).revision,before.revision);
});

test("exercise numbering follows curriculum order across activity boundaries",()=>{
 const activities=catalog.activities.map(a=>({...a,steps:a.steps}));const progress={activities,requiredCount:9,completedCount:2};const second=presentation.lessonPosition(progress,activities[0],activities[0].steps[1]);assert.deepEqual(JSON.parse(JSON.stringify(second)),{activityNumber:1,activityTotal:4,exerciseNumber:2,exerciseTotal:9,completedCount:2});
 const next=presentation.lessonPosition(progress,activities[1],activities[1].steps[0]);assert.equal(next.exerciseNumber,3);assert.equal(next.activityNumber,2);
 const changed={activities:activities.slice(0,2),requiredCount:5,completedCount:1};assert.equal(presentation.lessonPosition(changed,activities[1],activities[1].steps[2]).exerciseTotal,5);
});
test("Back from the first teaching panel returns to its exercise transition",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);await openingPractice(h);selectChoice(h,"What brings you in today?");h.render();h.find("Check answer").props.onPress();await h.settle();h.find("Continue →").props.onPress();h.render();await h.settle();h.find("Learn OLD CARTS").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"old-carts-teach");h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"exercise-transition");h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"feedback");assert.ok(h.render().props.result);assert.equal((await h.service.getProgress("A")).completedCount,1);
});

test("Close while submission is evaluating discards stale UI replies without repeating the answer",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true,fakeTimers:true});t.after(h.unmount);let finish,posts=0;
 h.setPost(payload=>{posts++;return h.service.submit("A",payload);});h.setEvaluate(({response})=>new Promise(resolve=>{finish=()=>resolve({label:"Ready",feedback:"Synthetic accepted feedback",evidence:[response]});}));
 await openingPractice(h);selectChoice(h,"What brings you in today?");h.render();h.find("Check answer").props.onPress();await h.settle();assert.equal(h.render().props.busy,true);h.find("Close lesson").props.onPress();h.render();if(h.render().props.exitPrompt)h.render().props.onConfirmExit();assert.equal(h.navigation.at(-1),"/(tabs)");h.unmount();h.render();await h.settle();assert.equal(h.render().props.screen,"practice");assert.ok((await h.service.getProgress("A")).pending);const requestId=(await h.service.getProgress("A")).pending.requestId;
 finish();await h.settle();h.find("Refresh saved progress").props.onPress();h.render();await h.settle();await h.advance(3000);assert.equal(posts,1);const saved=await h.service.getProgress("A");assert.equal(saved.activities[0].steps[0].saved.requestId,requestId);assert.equal(saved.completedCount,1);assert.equal(h.navigation.length,1);
});


test("introduction omits duplicate mentor portrait; OLD CARTS switches from teaching to saved exercise progress",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);h.render();await h.settle();h.find("Let's start").props.onPress();h.render();await h.settle();
 assert.equal(h.nodes().filter(n=>n.props.accessibilityLabel==="Dr. Martinez").length,0);assert.ok(h.find("Play narration"));assert.ok(h.find("Begin"));
 h.find("Begin").props.onPress();h.render();await h.settle();h.find("Got it").props.onPress();h.render();await h.settle();selectChoice(h,"What brings you in today?");h.render();h.find("Check answer").props.onPress();await h.settle();h.find("Continue →").props.onPress();h.render();await h.settle();h.find("Learn OLD CARTS").props.onPress();h.render();await h.settle();
 const before=await h.service.getProgress("A");let bars=h.nodes().filter(n=>n.props.accessibilityRole==="progressbar");assert.equal(bars.length,1);assert.equal(bars[0].props.accessibilityLabel,"Teaching panel progress");assert.equal(bars[0].props.accessibilityValue.now,1);assert.equal(bars[0].props.accessibilityValue.max,teaching.oldCartsPanels.length);assert.doesNotMatch(h.text(h.render()),/Activity.*of.*Exercise/);
 const illustration=h.nodes().find(n=>n.type==="Image"&&n.props.style?.width>200);assert.ok(illustration);
 h.find("Continue →").props.onPress();h.render();await h.settle();bars=h.nodes().filter(n=>n.props.accessibilityRole==="progressbar");assert.equal(bars[0].props.accessibilityValue.now,2);assert.equal((await h.service.getProgress("A")).revision,before.revision);
 await finishTeaching(h);const root=h.render();assert.equal(root.props.step.question,catalog.activities[0].steps[1].question);assert.match(h.text(root),/Summarize the symptoms/);assert.doesNotMatch(h.text(root),/Using the visible Mr. Jones facts/);
 const card=h.nodes().find(n=>n.type==="View"&&h.text(n).startsWith("Mr. Jones · Patient facts"));assert.ok(card);const renderedFacts=h.text(card.props.children[1].props.children[0]);assert.equal(renderedFacts,root.props.progress.scenario.text);assert.ok(h.input());assert.ok(h.find("Start microphone recording"));bars=h.nodes().filter(n=>n.props.accessibilityRole==="progressbar");assert.equal(bars.length,1);assert.equal(bars[0].props.accessibilityLabel,"Saved exercise progress");assert.deepEqual(JSON.parse(JSON.stringify(bars[0].props.accessibilityValue)),{min:0,max:root.props.progress.requiredCount,now:root.props.progress.completedCount});assert.equal((await h.service.getProgress("A")).revision,before.revision);
});


test("Ask from a teaching panel sends its context and returns to the exact panel with draft and navigation intact",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);
 await h.service.submit("A",{activityId:catalog.activities[0].id,stepId:catalog.activities[0].steps[0].id,kind:"required",response:"Existing opening",requestId:"concept-teach-origin",expectedRevision:0});h.render();await h.settle();h.find("Resume →").props.onPress();h.render();await h.settle();
 const index=teaching.oldCartsPanels.findIndex(p=>p.title==="Describe the symptom");for(let i=0;i<index;i++){h.find("Continue →").props.onPress();h.render();await h.settle();}
 h.render().props.onSelect("Unsubmitted summary draft");h.render();h.render().props.onToggleNavigation();h.render();const before=h.render().props;const speech=h.speeches.at(-1);let request;
 h.setPost(payload=>{request=payload;return h.service.submit("A",payload);});h.find("Ask Dr. Martinez").props.onPress();h.render();await h.settle();assert.equal(speech.valid(),false);assert.equal(h.render().props.screen,"clarify");assert.equal(h.render().props.clarificationContext.panelTitle,"Describe the symptom");assert.equal(h.render().props.clarificationContext.activityId,before.activity.id);assert.equal(h.render().props.clarificationContext.stepId,before.step.id);
 h.input().props.onChangeText("What does pleuritic mean?");h.render();h.find("Send clarification question").props.onPress();await h.settle();assert.equal(request.kind,"clarify");assert.equal(request.activityId,before.activity.id);assert.equal(request.stepId,before.step.id);assert.match(request.response,/Describe the symptom/);assert.match(request.response,/What does pleuritic mean/);assert.deepEqual(Object.keys(request).sort(),["activityId","expectedRevision","kind","requestId","response","stepId"]);
 h.find("Back").props.onPress();h.render();await h.settle();const after=h.render().props;assert.equal(after.screen,before.screen);assert.equal(after.teachingPanel,index);assert.equal(after.selected,before.selected);assert.equal(after.navigationOpen,true);assert.equal(after.kind,before.kind);assert.equal(after.narration,teaching.oldCartsPanels[index].narration);assert.equal(after.progress.completedCount,1);assert.equal(after.progress.activities[0].steps[0].saved.requestId,"concept-teach-origin");
});

test("Ask from Practice preserves its response draft and does not mix narration controls with clarification",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);await openingPractice(h);selectChoice(h,"Is your chest hurting?");h.render();const before=h.render().props;const count=h.speeches.length;
 h.find("Mute narration").props.onPress();h.render();assert.equal(h.render().props.screen,"practice");assert.equal(h.speeches.length,count);assert.doesNotMatch(h.text(h.render()),/Narration is muted/);h.find("Unmute narration").props.onPress();h.render();h.find("Show captions").props.onPress();h.render();assert.equal(h.render().props.screen,"practice");assert.equal(h.speeches.length,count);
 const ask=h.find("Ask Dr. Martinez");assert.equal(ask.props.accessibilityState.disabled,false);const style=ask.props.style({pressed:false})[0];assert.ok(style.minHeight>=44);assert.equal(h.nodes().filter(n=>n.type==="Pressable"&&n.props.accessibilityLabel==="Ask Dr. Martinez").length,1);
 ask.props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"clarify");h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,before.screen);assert.equal(h.render().props.selected,before.selected);assert.equal((await h.service.getProgress("A")).completedCount,0);
});

test("Ask from Feedback returns to the same saved submission even though server next has advanced",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);await openingPractice(h);selectChoice(h,"What brings you in today?");h.render();h.find("Check answer").props.onPress();await h.settle();const before=h.render().props;assert.equal(before.screen,"feedback");assert.ok(before.result);const savedId=before.result.requestId;
 h.find("Ask Dr. Martinez").props.onPress();h.render();await h.settle();h.input().props.onChangeText("How can I improve this opening?");h.render();h.find("Send clarification question").props.onPress();await h.settle();assert.equal(h.render().props.result.kind,"clarify");h.find("Back").props.onPress();h.render();await h.settle();const after=h.render().props;assert.equal(after.screen,"feedback");assert.equal(after.step.id,before.step.id);assert.equal(after.result.requestId,savedId);assert.equal(after.kind,"required");assert.equal(after.progress.completedCount,1);assert.equal(after.progress.next.stepId,"organize-old-carts");assert.ok(h.find("Continue →"));
});

test("history teaching panels keep all curriculum domains and navigate without progress writes",async t=>{
 const activity=catalog.activities[1];const h=harness("app/module-0.tsx",{activityId:activity.id},{approvedUI:true});t.after(h.unmount);
 await h.service.submit("A",{activityId:activity.id,stepId:activity.steps[0].id,kind:"required",response:"Synthetic SOAP answer",requestId:"history-source",expectedRevision:0});h.render();await h.settle();assert.equal(h.render().props.screen,"introduction");h.find("Begin").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"teach");assert.equal(h.render().props.step.id,"history-and-context");assert.match(h.text(h.render()),/Why history matters/);const before=await h.service.getProgress("A");
 h.find("Continue →").props.onPress();h.render();await h.settle();assert.equal(h.render().props.teachingPanel,1);h.find("Ask Dr. Martinez").props.onPress();h.render();await h.settle();assert.equal(h.render().props.clarificationContext.panelTitle,"Review medical history");h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.teachingPanel,1);
 const text=teaching.historyPanels.map(p=>p.text).join(" ");for(const domain of ["medications","allergies","immunizations","medical","surgical","family","social","substance use","occupation","living situation","financial security","support","diet","activity","cultural","spiritual"])assert.match(text.toLowerCase(),new RegExp(domain));await finishTeaching(h);assert.ok(h.input());assert.equal(h.render().props.step.question,activity.steps[1].question);assert.equal((await h.service.getProgress("A")).revision,before.revision);
});

test("clinical example italics distinguish patient and clinical text without restyling quoted feedback",async t=>{
 const all=teaching.oldCartsPanels.flatMap(p=>p.rows);assert.ok(all.some(r=>r.label==="C · Character"&&r.patient.includes("stabbing knife")&&r.clinical.includes("pleuritic")));
 for(const category of ["O ·","L ·","D ·","C ·","A ·","R ·","T ·","S ·"])assert.ok(all.some(r=>r.label.includes(category)),category);
 const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);await openingPractice(h);selectChoice(h,"What brings you in today?");h.render();h.find("Check answer").props.onPress();await h.settle();h.find("Continue →").props.onPress();h.render();await h.settle();h.find("Learn OLD CARTS").props.onPress();h.render();await h.settle();
 const index=teaching.oldCartsPanels.findIndex(p=>p.title==="Describe the symptom");for(let i=0;i<index;i++){h.find("Continue →").props.onPress();h.render();await h.settle();}const row=teaching.oldCartsPanels[index].rows[0];const quote=h.nodes().find(n=>n.type==="Text"&&h.text(n)===row.patient);assert.ok(quote.props.style.some(s=>s.fontStyle==="italic"));const clinical=h.nodes().find(n=>n.type==="Text"&&h.text(n)===row.clinical);assert.equal(clinical.props.style.fontStyle,"italic");
 await finishTeaching(h);const feedback='This “quoted feedback” keeps its ordinary typography.';h.setEvaluate(()=>({label:"Ready",feedback,evidence:[]}));h.input().props.onChangeText("Synthetic clinical summary");h.render();h.find("Submit").props.onPress();await h.settle();const displayed=h.nodes().find(n=>n.type==="Text"&&h.text(n)===feedback);assert.ok(displayed);assert.notEqual(displayed.props.style.fontStyle,"italic");
});


test("failed clarification keeps its context through durable retry and restores the source draft",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true,fakeTimers:true});t.after(h.unmount);await openingPractice(h);selectChoice(h,"What brings you in today?");h.render();h.find("Ask Dr. Martinez").props.onPress();h.render();await h.settle();
 h.setEvaluate(()=>{throw new Error("synthetic guidance failure")});h.input().props.onChangeText("Why is an open question useful?");h.render();h.find("Send clarification question").props.onPress();await h.settle();const before=await h.service.getProgress("A");assert.equal(before.pending.kind,"clarify");assert.equal(h.find("Back").props.disabled,true);assert.equal(h.find("Ask Dr. Martinez").props.disabled,true);
 await h.advance(6000);h.setEvaluate(()=>({reply:"It lets the patient describe their concern."}));h.find("Retry feedback").props.onPress();await h.settle();assert.equal(h.render().props.screen,"clarify");assert.equal(h.render().props.result.requestId,before.pending.requestId);h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"practice");assert.equal(h.render().props.selected,"What brings you in today?");assert.equal((await h.service.getProgress("A")).completedCount,0);
});
test("Module 0 speech changes only the exact OLD CARTS and SBAR phrases and leaves captions and clinical acronyms intact",()=>{
 const source="Use OLD CARTS, then SOAP, SBAR, SNAPPs and OLD CARTS-like summaries.";
 assert.equal(teaching.module0SpeechText(source),"Use old carts, then SOAP, s-bar, SNAPPs and old carts-like summaries.");
 assert.equal(teaching.module0SpeechText("BOLD CARTS OLD CARTScase old carts"),"BOLD CARTS OLD CARTScase old carts");
 assert.equal(teaching.module0SpeechText("Old CARTS and SOAP"),"old carts and SOAP");
 assert.match(teaching.exerciseNarration?.["organize-old-carts"] || teaching.oldCartsPanels.map(p=>p.narration).join(" "),/OLD CARTS/);
});

test("shared lesson composer gives microphone and submission separate accessible actions and guards recording",()=>{
 const jsx=(type,props)=>({type,props:props || {}});
 const Composer=compile("src/components/ClinicalsChatComposer.tsx",name=>name==="react/jsx-runtime"?{jsx,jsxs:jsx}:name==="react-native"?{View:"View",Text:"Text",TextInput:"TextInput",Pressable:"Pressable",StyleSheet:{create:x=>x}}:name==="@expo/vector-icons"?{MaterialCommunityIcons:"Icon"}:name.includes("module0/tokens")?compile("src/components/module0/tokens.ts",()=>({})):{}).ClinicalsChatComposer;
 const flatten=(n)=>!n?[]:Array.isArray(n)?n.flatMap(flatten):typeof n!=="object"?[]:[n,...flatten(n.props?.children)];
 let sent=0,mics=0;
 const props={lesson:true,value:"Editable dictated draft",onChangeText(){},onSubmit(){sent++;},onMicPress(){mics++;},submitLabel:"Submit",placeholder:"Your clinical summary"};
 let nodes=flatten(Composer(props));const mic=nodes.find(n=>n.props.accessibilityLabel==="Start microphone recording");
 mic.props.onPress();assert.equal(mics,1);assert.equal(sent,0);assert.equal(mic.props.style({pressed:false})[0].width,44);assert.equal(mic.props.style({pressed:false})[0].height,44);
 const input=nodes.find(n=>n.type==="TextInput");assert.equal(input.props.placeholder,"Your clinical summary");assert.equal(input.props.editable,true);
 nodes.find(n=>n.props.accessibilityLabel==="Submit").props.onPress();assert.equal(sent,1);
 for(const state of [{isRecording:true},{transcribing:true},{sendDisabled:true},{value:"  "}]){nodes=flatten(Composer({...props,...state}));nodes.find(n=>n.type==="TextInput").props.onSubmitEditing();nodes.find(n=>n.props.accessibilityLabel==="Submit").props.onPress();assert.equal(sent,1);}
 nodes=flatten(Composer({...props,submitLabel:"Send",submitAccessibilityLabel:"Send clarification question",placeholder:"Ask Dr. Martinez a question…"}));assert.ok(nodes.find(n=>n.props.accessibilityLabel==="Send clarification question"));
});
test("dictated mentor question stays editable before Send and OLD CARTS response uses unchanged grading request",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);
 const p=await h.service.getProgress("A");await h.service.submit("A",{activityId:p.next.activityId,stepId:p.next.stepId,kind:"required",response:"What brings you in today?",requestId:"shared-input-origin",expectedRevision:p.revision});
 h.render();await h.settle();h.find("Resume →").props.onPress();h.render();await h.settle();await finishTeaching(h);assert.match(h.text(h.render()),/Summarize the symptoms/);assert.doesNotMatch(h.text(h.render()),/Answer exercise/);
 h.input().props.onChangeText("Preserved clinical summary draft");h.render();h.find("Ask Dr. Martinez").props.onPress();h.render();await h.settle();
 const before=await h.service.getProgress("A");h.dictate("A dictated conceptual question");h.render();assert.equal(h.input().props.value,"A dictated conceptual question");assert.equal((await h.service.getProgress("A")).revision,before.revision);
 h.input().props.onChangeText("An edited dictated conceptual question");h.render();h.find("Send clarification question").props.onPress();await h.settle();assert.equal(h.render().props.result.response,"An edited dictated conceptual question");
 h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.input().props.value,"Preserved clinical summary draft");
 let request;h.setPost(async payload=>{request=payload;return h.service.submit("A",payload);});
 h.dictate("An editable dictated clinical summary");h.render();assert.equal(h.input().props.value,"Preserved clinical summary draft An editable dictated clinical summary");h.input().props.onChangeText("Edited clinical summary for grading");h.render();h.find("Submit").props.onPress();await h.settle();
 assert.equal(request.kind,"required");assert.equal(request.response,"Edited clinical summary for grading");assert.equal(request.stepId,"organize-old-carts");assert.deepEqual(Object.keys(request).sort(),["activityId","expectedRevision","kind","requestId","response","stepId"]);
 assert.equal(h.render().props.screen,"feedback");assert.match(h.text(h.render()),/Needs More Practice/);assert.match(h.text(h.render()),/Your response is an attempt. Connect it to the visible facts./);
});
test("Needs More Practice presentation preserves exact server paragraphs and uses readable left aligned feedback",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);await openingPractice(h);
 const feedback="Your response is an attempt.\n\nConnect it to the visible facts.\nUse the patient information shown above.";
 h.setEvaluate(({response})=>({label:"Needs More Practice",feedback,evidence:[response]}));selectChoice(h,"What brings you in today?");h.render();h.find("Check answer").props.onPress();await h.settle();
 assert.equal(h.render().props.result.evaluation.feedback,feedback);assert.match(h.text(h.render()),/Needs More Practice/);
 for(const paragraph of feedback.split(/\n\s*\n/)){const node=h.nodes().find(n=>n.type==="Text"&&n.props.children===paragraph);assert.ok(node);assert.equal(node.props.style.textAlign,"left");assert.equal(node.props.style.lineHeight,30);}
 assert.doesNotMatch(h.text(h.render()),/Synthetic learner response/);assert.ok(h.find("Continue →"));assert.ok(h.find("Ask Dr. Martinez"));
});
test("all four activity introductions and nine teaching mappings follow authoritative curriculum IDs",async()=>{
 assert.deepEqual(Object.keys(presentation.exerciseTitles),catalog.activities.flatMap(a=>a.steps.map(s=>s.id)));
 assert.deepEqual(Object.keys(presentation.activityIntroductions),catalog.activities.map(a=>a.id));
 for(const activity of catalog.activities){
  const h=harness("app/module-0.tsx",{activityId:activity.id},{approvedUI:true});
  try{h.render();await h.settle();assert.equal(h.render().props.screen,"introduction");assert.equal(h.render().props.activity.id,activity.id);
   assert.match(h.text(h.render()),new RegExp(presentation.activityIntroductions[activity.id].replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
   const titles=activity.steps.map(s=>presentation.exerciseTitle(s,activity));assert.deepEqual(h.nodes().filter(n=>n.type==="Text"&&titles.includes(n.props.children)).map(n=>n.props.children),titles);
   if(activity.id!==catalog.activities[0].id)assert.doesNotMatch(h.text(h.render()),/Organize OLD CARTS|open a patient interview/);
   h.find("Begin").props.onPress();h.render();await h.settle();assert.equal(h.render().props.step.id,activity.steps[0].id);assert.equal(h.render().props.screen,"teach");
   for(const step of activity.steps){const panels=teaching.conceptPanelsFor(step);assert.ok(panels.length,step.id);assert.equal(teaching.conceptTitle(step,activity),presentation.exerciseTitle(step,activity));
    if(step.id!=="organize-old-carts")assert.notEqual(panels,teaching.oldCartsPanels);
    for(let i=0;i<panels.length;i++)assert.equal(teaching.narrationFor("teach",step,null,i,activity),panels[i].narration);
   }
   assert.equal((await h.service.getProgress("A")).revision,0);
  }finally{h.unmount();}
 }
 const ros=teaching.conceptPanelsFor(catalog.activities[1].steps[2])[0];assert.deepEqual(ros.text.split("\n\n"),["The review of systems asks about patient-reported symptoms that may have been overlooked.","It adds context to the history; it is not a physical examination or a diagnostic test."]);
 assert.equal(teaching.conceptPanelsFor({id:"unrecognized",teach:"Unknown"}).length,0);
});

test("Activity 1 completion enters Activity 2 introduction and SOAP teaching with matching requests and feedback",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);await openingPractice(h);selectChoice(h,"What brings you in today?");h.render();h.find("Check answer").props.onPress();await h.settle();await continueFeedback(h);
 assert.equal(h.render().props.step.id,"organize-old-carts");assert.equal(teaching.oldCartsPanels.length,10);
 h.input().props.onChangeText("Synthetic OLD CARTS summary");h.render();h.find("Submit").props.onPress();await h.settle();assert.equal(h.render().props.result.stepId,"organize-old-carts");h.find("Continue →").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"activity-complete");assert.equal(h.render().props.progress.next.stepId,"soap-and-data-types");
 h.find("Next activity").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"introduction");assert.equal(h.render().props.activity.id,"organizing-clinical-information");assert.doesNotMatch(h.text(h.render()),/OLD CARTS/);
 h.find("Begin").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"teach");assert.match(h.text(h.render()),/SOAP means Subjective/);await finishTeaching(h);
 let request;h.setPost(async payload=>{request=payload;return h.service.submit("A",payload);});selectSoap(h);h.render();h.find("Submit").props.onPress();await h.settle();assert.equal(request.activityId,"organizing-clinical-information");assert.equal(request.stepId,"soap-and-data-types");assert.equal(h.render().props.result.stepId,request.stepId);assert.equal(h.render().props.progress.completedCount,3);
});
test("completed OLD CARTS review restores only its teaching and leaves authoritative progress unchanged",async t=>{
 const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);let revision=0;
 for(const step of catalog.activities[0].steps)revision=(await h.service.submit("A",{activityId:catalog.activities[0].id,stepId:step.id,kind:"required",response:"Synthetic saved answer",requestId:"review-mapping-"+step.id,expectedRevision:revision})).progress.revision;
 h.render();await h.settle();h.find("Activities and reviews").props.onPress();h.render();await h.settle();h.find("Review: Organize OLD CARTS").props.onPress();h.render();await h.settle();assert.equal(h.render().props.step.id,"organize-old-carts");h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"old-carts-teach");assert.equal(h.render().props.teachingPanel,teaching.oldCartsPanels.length-1);assert.match(h.text(h.render()),/Sharp and pleuritic/);assert.equal((await h.service.getProgress("A")).revision,revision);
 const p=await h.service.getProgress("A");assert.equal(view.module0Selection(p).step.id,"soap-and-data-types");assert.equal(view.module0Selection(p,"organizing-clinical-information","organize-old-carts").step.id,"soap-and-data-types");
});
async function completedReviewHarness(t,params={}) {
 const h=harness("app/module-0.tsx",params,{approvedUI:true});t.after(h.unmount);let revision=0;
 for(const a of catalog.activities)for(const step of a.steps)revision=(await h.service.submit("A",{activityId:a.id,stepId:step.id,kind:"required",response:"Original saved response for "+step.id,requestId:"review-original-"+step.id,expectedRevision:revision})).progress.revision;
 return h;
}
test("every Practice entry selects its required or targeted optional task narration",async t=>{
 const h=await completedReviewHarness(t,{mode:"review"});h.render();await h.settle();const before=await h.service.getProgress("A");
 for(const activity of catalog.activities)for(const step of activity.steps){
  for(const optional of [false,true]){
   h.find((optional ? "Practice Again: " : "Review: ")+presentation.exerciseTitle(step,activity)).props.onPress();h.render();await h.settle();
   assert.equal(h.render().props.teachingPanel,0);
   assert.equal(h.render().props.screen,optional ? "practice" : step.id === "organize-old-carts" ? "old-carts-teach" : "teach");
   if(!optional)await finishTeaching(h);
   assert.equal(h.render().props.kind,optional ? "practice" : "required");
   assert.equal(h.render().props.narration,(optional ? teaching.optionalPracticeNarration : teaching.requiredPracticeNarration)[step.id]);
   assert.equal(h.render().props.caseFactsExpanded,false);
   if(optional){
    assert.equal(h.find("Answer exercise"),undefined);
    assert.match(h.text(h.render()),new RegExp(step.optionalPracticeQuestion.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
    assert.equal(h.input().props.placeholder,"Answer here");assert.equal(h.input().props.accessibilityLabel,"Your exercise response");
    assert.equal(h.render().props.step.answerHint,step.answerHint);assert.equal(h.nodes().filter(n=>n.type==="Text"&&h.text(n)===step.answerHint).length,0);
    assert.equal(h.find("What brings you in today?"),undefined);
   }else assert.equal(h.input(),undefined);
   await returnToSelection(h);
  }
 }
 assert.deepEqual(await h.service.getProgress("A"),before);
});
test("new Feedback narrates once and Clarify remains manual, retain controls, captions, identity and drafts",async t=>{
 for(const outcome of ["Ready","Needs More Practice","clarify"]){
  const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);await openingPractice(h);
  const returned="Returned SBAR response.\n\nThis is the actual second paragraph.";
  let evaluations=0;h.setEvaluate(()=>{evaluations++;return outcome === "clarify" ? {reply:returned} : {label:outcome,feedback:returned};});
  selectChoice(h,"Is your chest hurting?");h.render();
  let count=h.speeches.length;
  if(outcome === "clarify"){
   h.find("Ask Dr. Martinez").props.onPress();h.render();await h.settle();assert.equal(h.render().props.narration,"");assert.equal(h.speeches.length,count);
   h.input().props.onChangeText("Synthetic question");h.render();h.find("Send clarification question").props.onPress();
  }else h.find("Check answer").props.onPress();
  await h.settle();assert.equal(evaluations,1);assert.equal(h.speeches.length,count+(outcome !== "clarify" ? 1 : 0));count+=outcome !== "clarify" ? 1 : 0;assert.equal(h.render().props.narration,returned);
  const submission=h.render().props.result.requestId;const saved=await h.service.getProgress("A");
  h.find("Show captions").props.onPress();h.render();assert.equal(h.text(h.nodes().find(n=>n.props.accessibilityLabel==="Narration captions")),returned);
  h.find("Play narration").props.onPress();assert.equal(h.speeches.length,count+1);assert.equal(h.speeches.at(-1).text,teaching.module0SpeechText(returned));
  h.setSpeaking(true);h.find("Pause narration").props.onPress();h.render();assert.ok(h.find("Play narration"));h.find("Play narration").props.onPress();h.render();assert.ok(h.find("Pause narration"));assert.equal(h.speeches.length,count+1);
  assert.equal(h.find("Replay narration"),undefined);assert.equal(h.speeches.length,count+1);assert.equal(h.speeches.at(-1).text,teaching.module0SpeechText(returned));
  h.find("Mute narration").props.onPress();h.render();h.find("Unmute narration").props.onPress();h.render();assert.equal(h.speeches.length,count+1);
  assert.equal(h.render().props.result.requestId,submission);assert.equal(evaluations,1);
  const audio=h.speeches.at(-1);const stops=h.stops.length;
  h.find(outcome === "clarify" ? "Back" : "Close lesson").props.onPress();h.render();await h.settle();assert.equal(audio.valid(),false);assert.ok(h.stops.length>stops);
  if(outcome === "clarify")assert.equal(h.render().props.selected,"Is your chest hurting?");
  assert.deepEqual(await h.service.getProgress("A"),saved);
 }
});
test("oversized returned text remains complete with disabled Play and no Replay and an accessible limit explanation",async t=>{
 for(const outcome of ["Ready","clarify"])for(const oversized of [false,true]){
  const h=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(h.unmount);await openingPractice(h);
  // Raw lengths are 1,199/1,200; pronunciation expands SBAR by one character.
  const returned="SBAR "+"x".repeat(oversized ? 1195 : 1194);
  h.setEvaluate(()=>outcome === "clarify" ? {reply:returned} : {label:outcome,feedback:returned});
  selectChoice(h,"What brings you in today?");h.render();let count=h.speeches.length;
  if(outcome === "clarify"){
   h.find("Ask Dr. Martinez").props.onPress();h.render();await h.settle();h.input().props.onChangeText("Synthetic length check");h.render();h.find("Send clarification question").props.onPress();
  }else h.find("Check answer").props.onPress();
  await h.settle();assert.equal(h.speeches.length,count+(outcome !== "clarify" && !oversized ? 1 : 0));count+=outcome !== "clarify" && !oversized ? 1 : 0;assert.equal(h.render().props.narration,returned);assert.ok(h.text(h.render()).includes(returned));
  const saved=await h.service.getProgress("A");
  assert.equal(h.find("Replay narration"),undefined);for(const label of ["Play narration"]){const control=h.find(label);assert.equal(control.props.disabled,oversized);assert.equal(control.props.accessibilityState.disabled,oversized);}
  const explanation=h.nodes().find(n=>n.type==="Text" && h.text(n)==="Audio playback is unavailable because this response is too long.");
  assert.equal(!!explanation,oversized);if(explanation){assert.equal(explanation.props.accessibilityRole,"alert");assert.equal(explanation.props.accessibilityLiveRegion,"polite");}
  h.find("Show captions").props.onPress();h.render();assert.equal(h.text(h.nodes().find(n=>n.props.accessibilityLabel==="Narration captions")),returned);
  // Even direct handler calls cannot bypass the disabled controls or truncate input.
  h.render().props.onPlay();h.render().props.onListen();assert.equal(h.speeches.length,count+(oversized ? 0 : 2));
  if(!oversized)assert.equal(h.speeches.at(-1).text,teaching.module0SpeechText(returned));
  assert.equal(h.render().props.result.evaluation[outcome === "clarify" ? "reply" : "feedback"],returned);
  assert.deepEqual(await h.service.getProgress("A"),saved);
 }
});
test("every concept preserves Back, mentor origin, and completed records",async t=>{
 const h=await completedReviewHarness(t,{mode:"review"});h.render();await h.settle();
 const before=await h.service.getProgress("A");
 for(const activity of catalog.activities)for(const step of activity.steps){
  h.find("Review: "+presentation.exerciseTitle(step,activity)).props.onPress();h.render();await h.settle();
  const panels=teaching.conceptPanelsFor(step);
  for(let i=0;i<panels.length;i++){
   assert.equal(h.render().props.teachingPanel,i);assert.equal(h.render().props.narration,panels[i].narration);
   assert.equal(h.render().props.activity.id,activity.id);assert.equal(h.render().props.step.id,step.id);
   if(i>0){h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.teachingPanel,i-1);h.find("Continue →").props.onPress();h.render();await h.settle();}
   h.find("Ask Dr. Martinez").props.onPress();h.render();await h.settle();
   assert.equal(h.render().props.clarificationContext.panelTitle,panels[i].title);
   assert.equal(h.render().props.clarificationContext.exerciseTitle,presentation.exerciseTitle(step,activity));
   h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.teachingPanel,i);
   if(i<panels.length-1){h.find("Continue →").props.onPress();h.render();await h.settle();}
  }
  await returnToSelection(h);
 }
 assert.deepEqual(await h.service.getProgress("A"),before);
});
test("Review & Practice opens from both completed entry points and keeps all nine exercises selectable",async t=>{
 const h=await completedReviewHarness(t);h.render();await h.settle();assert.equal(h.render().props.screen,"module-complete");const before=await h.service.getProgress("A");
 h.find("Review completed exercises").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"review");
 assert.deepEqual(h.nodes().filter(n=>n.type==="Pressable"&&n.props.accessibilityLabel?.startsWith("Review:")).map(n=>n.props.accessibilityLabel),catalog.activities.flatMap(a=>a.steps.map(s=>"Review: "+presentation.exerciseTitle(s,a))));
 assert.equal(h.nodes().filter(n=>n.type==="Pressable"&&n.props.accessibilityLabel?.startsWith("Practice Again:")).length,9);
 h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"module-complete");assert.deepEqual(await h.service.getProgress("A"),before);
 const route=await completedReviewHarness(t,{mode:"review"});route.render();await route.settle();assert.equal(route.render().props.screen,"review");route.find("Close lesson").props.onPress();assert.equal(route.navigation.at(-1),"/(tabs)");
});
test("Review & Practice review traverses existing teaching and saved feedback without any submission",async t=>{
 const h=await completedReviewHarness(t,{mode:"review"});h.render();await h.settle();const before=await h.service.getProgress("A");let posts=0;h.setPost(async()=>{posts++;throw new Error("Review must not submit")});
 for(const a of catalog.activities)for(const step of a.steps){
  h.find("Review: "+presentation.exerciseTitle(step,a)).props.onPress();h.render();await h.settle();assert.equal(h.render().props.step.id,step.id);assert.equal(h.render().props.screen,step.id === "organize-old-carts" ? "old-carts-teach" : "teach");
  await finishTeaching(h);assert.match(h.text(h.render()),new RegExp("Original saved response for "+step.id));assert.match(h.text(h.render()),/Your response is an attempt/);
  assert.equal(h.find("Submit"),undefined);h.find("Return to feedback").props.onPress();h.render();await h.settle();assert.equal(h.render().props.result.requestId,"review-original-"+step.id);
  h.find("Continue →").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"review");
 }
 assert.equal(posts,0);assert.deepEqual(await h.service.getProgress("A"),before);
});
test("Review & Practice supplementary attempts preserve required answers, completion and every earlier attempt",async t=>{
 const h=await completedReviewHarness(t,{mode:"review"});h.render();await h.settle();const before=await h.service.getProgress("A");let requests=[];h.setPost(async payload=>{requests.push(payload);return h.service.submit("A",payload)});
 for(let attempt=0;attempt<2;attempt++){
  h.find("Practice Again: Organize OLD CARTS").props.onPress();h.render();await h.settle();assert.equal(h.render().props.kind,"practice");assert.equal(h.render().props.screen,"practice");
  assert.match(h.text(h.render()),new RegExp(catalog.activities[0].steps[1].optionalPracticeQuestion.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  h.input().props.onChangeText("Supplementary response attempt "+attempt);h.render();h.find("Submit").props.onPress();await h.settle();assert.equal(h.render().props.result.kind,"practice");h.find("Continue →").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"review");
 }
 const after=await h.service.getProgress("A");assert.equal(after.completed,true);assert.equal(after.completedCount,9);assert.equal(after.next,null);assert.deepEqual(after.activities,before.activities);assert.equal(after.history.length,before.history.length+2);assert.notEqual(requests[0].requestId,requests[1].requestId);assert.ok(requests.every(r=>r.kind==="practice"));assert.equal(after.history.at(-2).response,"Supplementary response attempt 0");assert.equal(after.history.at(-1).response,"Supplementary response attempt 1");
});
test("Review & Practice Back returns to selection and normal partial Resume remains unchanged",async t=>{
 const h=await completedReviewHarness(t,{mode:"review"});h.render();await h.settle();h.find("Practice Again: SOAP and Data Types").props.onPress();h.render();await h.settle();h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"review");
 h.find("Review: SNAPPS").props.onPress();h.render();await h.settle();await returnToSelection(h);
 const partial=harness("app/module-0.tsx",{}, {approvedUI:true});t.after(partial.unmount);await partial.service.submit("A",{activityId:catalog.activities[0].id,stepId:catalog.activities[0].steps[0].id,kind:"required",response:"An original completed opening",requestId:"review-normal-resume",expectedRevision:0});partial.render();await partial.settle();assert.equal(partial.render().props.screen,"resume");partial.find("Resume →").props.onPress();partial.render();await partial.settle();assert.equal(partial.render().props.step.id,"organize-old-carts");assert.equal(partial.render().props.screen,"old-carts-teach");
});
test("required Practice has correct disclosure defaults, complete facts and one helper per editable field",async t=>{
 for(const activity of catalog.activities)for(let index=0;index<activity.steps.length;index++){
  const step=activity.steps[index];const h=harness("app/module-0.tsx",{activityId:activity.id},{approvedUI:true});t.after(h.unmount);
  let revision=0;for(let i=0;i<index;i++)revision=(await h.service.submit("A",{activityId:activity.id,stepId:activity.steps[i].id,kind:"required",response:"Earlier synthetic response",requestId:"required-default-"+i,expectedRevision:revision})).progress.revision;
  h.render();await h.settle();if(h.find("Begin")){h.find("Begin").props.onPress();h.render();await h.settle();}await finishTeaching(h);
  assert.equal(h.render().props.step.id,step.id);
  assert.equal(h.find("Answer exercise"),undefined);
  if(step.id === "open-the-interview"){assert.equal(h.input(),undefined);assert.equal(h.find("Mr. Jones · Case facts"),undefined);continue;}
  if(step.id === "soap-and-data-types"){assert.equal(h.input(),undefined);assert.equal(h.nodes().filter(n=>n.type === "select").length,4);assert.equal(h.find("Start microphone recording"),undefined);continue;}
  assert.equal(h.input().props.placeholder,"Answer here");assert.equal(h.input().props.accessibilityLabel,"Your exercise response");
  assert.ok(h.find(step.id === "soap-and-data-types" ? "Review SOAP sections" : "Task details and concept"));
  assert.equal(h.render().props.step.answerHint,step.answerHint);assert.equal(h.nodes().filter(n=>n.type==="Text"&&h.text(n)===step.answerHint).length,0);
  const initiallyExpanded=step.id === "organize-old-carts";assert.equal(h.render().props.caseFactsExpanded,initiallyExpanded);
  const button=h.find("Mr. Jones · Case facts");assert.equal(button.props.accessibilityRole,"button");assert.equal(button.props.accessibilityState.expanded,initiallyExpanded);
  assert.ok(button.props.style({pressed:false})[0].minHeight>=44);assert.equal(button.props.style({pressed:false,focused:true})[1].outlineWidth,2);
  const saved=await h.service.getProgress("A");const speechCount=h.speeches.length;let reads=0;h.setGet(async()=>{reads++;return saved;});
  h.input().props.onChangeText("An unsubmitted draft");h.render();
  if(!initiallyExpanded){button.props.onPress();h.render();await h.settle();}
  const card=h.nodes().find(n=>n.type==="View"&&h.text(n).startsWith("Mr. Jones · Patient facts"));
  assert.equal(h.text(card.props.children[1].props.children[0]),catalog.sharedScenario.text);
  assert.equal(h.text(card.props.children[1].props.children[1]),catalog.sharedScenario.purpose);
  h.find("Mr. Jones · Case facts").props.onPress();h.render();await h.settle();assert.equal(h.render().props.caseFactsExpanded,false);
  assert.equal(h.render().props.selected,"An unsubmitted draft");assert.equal(h.speeches.length,speechCount);assert.equal(reads,0);
  assert.deepEqual(await h.service.getProgress("A"),saved);
 }
});
test("optional disclosure toggles and Ask return preserve every exercise's draft, origin and local state",async t=>{
 const h=await completedReviewHarness(t,{mode:"review"});h.render();await h.settle();const before=await h.service.getProgress("A");
 for(const activity of catalog.activities)for(const step of activity.steps){
  h.find("Practice Again: "+presentation.exerciseTitle(step,activity)).props.onPress();h.render();await h.settle();
  assert.equal(h.render().props.screen,"practice");assert.equal(h.render().props.caseFactsExpanded,false);
  h.input().props.onChangeText("Draft for "+step.id);h.render();const speechCount=h.speeches.length;const panel=h.render().props.teachingPanel;
  for(const expanded of [true,false]){
   h.find("Mr. Jones · Case facts").props.onPress();h.render();await h.settle();assert.equal(h.render().props.caseFactsExpanded,expanded);
   assert.equal(h.render().props.teachingPanel,panel);assert.equal(h.render().props.selected,"Draft for "+step.id);
  }
  assert.equal(h.speeches.length,speechCount);
  h.find("Mr. Jones · Case facts").props.onPress();h.render();await h.settle();
  h.find("Ask Dr. Martinez").props.onPress();h.render();await h.settle();assert.equal(h.render().props.clarificationContext.panelTitle,null);
  h.input().props.onChangeText("An unsubmitted question");h.render();h.find("Back").props.onPress();h.render();await h.settle();
  const restored=h.render().props;assert.equal(restored.screen,"practice");assert.equal(restored.kind,"practice");assert.equal(restored.activity.id,activity.id);assert.equal(restored.step.id,step.id);
  assert.equal(restored.selected,"Draft for "+step.id);assert.equal(restored.caseFactsExpanded,true);assert.equal(restored.teachingPanel,panel);
  h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"review");
  h.find("Practice Again: "+presentation.exerciseTitle(step,activity)).props.onPress();h.render();await h.settle();assert.equal(h.render().props.caseFactsExpanded,false);
  await returnToSelection(h);
 }
 assert.deepEqual(await h.service.getProgress("A"),before);
});
test("optional Feedback Back returns to optional Practice then selection without new attempts",async t=>{
 const h=await completedReviewHarness(t,{mode:"review"});h.render();await h.settle();h.find("Practice Again: SOAP and Data Types").props.onPress();h.render();await h.settle();
 h.input().props.onChangeText("Synthetic optional answer");h.render();h.find("Submit").props.onPress();await h.settle();assert.equal(h.render().props.screen,"feedback");
 const saved=await h.service.getProgress("A");const id=h.render().props.result.requestId;
 h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"practice");assert.equal(h.render().props.kind,"practice");assert.equal(h.render().props.result.requestId,id);
 assert.equal(h.render().props.narration,teaching.optionalPracticeNarration["soap-and-data-types"]);
 h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"review");assert.deepEqual(await h.service.getProgress("A"),saved);
});
test("returned mentor reply restores expanded optional facts and draft without altering required records",async t=>{
 const h=await completedReviewHarness(t,{mode:"review"});h.render();await h.settle();const before=await h.service.getProgress("A");
 h.find("Practice Again: Organize OLD CARTS").props.onPress();h.render();await h.settle();h.input().props.onChangeText("Preserved targeted draft");h.render();
 h.find("Mr. Jones · Case facts").props.onPress();h.render();await h.settle();h.find("Ask Dr. Martinez").props.onPress();h.render();await h.settle();
 h.input().props.onChangeText("A synthetic question about these case facts");h.render();h.find("Send clarification question").props.onPress();await h.settle();assert.equal(h.render().props.result.kind,"clarify");
 h.find("Back").props.onPress();h.render();await h.settle();const restored=h.render().props;
 assert.equal(restored.screen,"practice");assert.equal(restored.kind,"practice");assert.equal(restored.step.id,"organize-old-carts");assert.equal(restored.selected,"Preserved targeted draft");assert.equal(restored.caseFactsExpanded,true);
 const after=await h.service.getProgress("A");assert.deepEqual(after.activities,before.activities);assert.equal(after.completed,true);assert.equal(after.completedCount,9);assert.equal(after.history.length,before.history.length+1);assert.equal(after.history.at(-1).kind,"clarify");
});
test("Review & Practice pending supplementary feedback resumes the same request without overwriting completion",async t=>{
 const h=await completedReviewHarness(t,{mode:"review"});h.render();await h.settle();const original=await h.service.getProgress("A");
 h.find("Practice Again: Organize OLD CARTS").props.onPress();h.render();await h.settle();await finishTeaching(h);h.setEvaluate(()=>{throw new Error("Controlled practice failure")});h.input().props.onChangeText("A preserved supplementary response");h.render();h.find("Submit").props.onPress();await h.settle();
 const pending=(await h.service.getProgress("A")).pending;assert.equal(pending.kind,"practice");h.find("Close lesson").props.onPress();assert.equal(h.navigation.at(-1),"/(tabs)");h.unmount();h.render();await h.settle();assert.equal(h.render().props.screen,"review");assert.equal(h.find("Practice Again: Organize OLD CARTS").props.disabled,true);
 h.find("Resume saved request").props.onPress();h.render();await h.settle();assert.match(h.text(h.render()),/A preserved supplementary response/);await h.advance(6000);h.setEvaluate(()=>({label:"Ready",feedback:"Controlled supplementary feedback."}));h.find("Retry feedback").props.onPress();await h.settle();assert.equal(h.render().props.result.requestId,pending.requestId);h.find("Continue →").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"review");const after=await h.service.getProgress("A");assert.deepEqual(after.activities,original.activities);assert.equal(after.completed,true);assert.equal(after.history.length,1);
});
test("Review & Practice can return a partially completed learner to normal progression without blocking required submission",async t=>{
 const h=harness("app/module-0.tsx",{mode:"review"},{approvedUI:true});t.after(h.unmount);await h.service.submit("A",{activityId:catalog.activities[0].id,stepId:catalog.activities[0].steps[0].id,kind:"required",response:"An original completed opening",requestId:"review-partial-original",expectedRevision:0});h.render();await h.settle();
 h.find("Review: Open the Interview").props.onPress();h.render();await h.settle();await finishTeaching(h);h.find("Continue to the next unfinished exercise").props.onPress();h.render();await h.settle();assert.equal(h.render().props.kind,"required");assert.equal(h.render().props.step.id,"organize-old-carts");await finishTeaching(h);h.input().props.onChangeText("A normal required OLD CARTS response");h.render();h.find("Submit").props.onPress();await h.settle();const after=await h.service.getProgress("A");assert.equal(after.completedCount,2);assert.equal(after.activities[0].steps[0].saved.requestId,"review-partial-original");assert.equal(h.render().props.result.kind,"required");
});

test("Practice 2 composer preserves multiline drafts across expansion and blocks unsafe submission",()=>{
 let slots=[],cursor=0;const react={useEffect(){},useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];}};
 const jsx=(type,props)=>({type,props:props||{}});const resolve=name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='react-native'?{Platform:{OS:'web'},View:'View',Text:'Text',TextInput:'TextInput',Pressable:'Pressable',useWindowDimensions:()=>({width:320,height:568}),StyleSheet:{create:x=>x}}:name==='@expo/vector-icons'?{MaterialCommunityIcons:'Icon'}:name.includes('tokens')?compile('src/components/module0/tokens.ts',resolve):{};
 const Composer=compile('src/components/ClinicalsChatComposer.tsx',resolve).ClinicalsChatComposer;
 const flatten=n=>!n?[]:Array.isArray(n)?n.flatMap(flatten):typeof n!=='object'?[]:typeof n.type==='function'?flatten(n.type(n.props)):[n,...flatten(n.props.children)];
 let sent=0,mics=0;const draft='First line\nSecond line\nThird line with clinical detail';const props={practice:true,value:draft,onChangeText(){},onSubmit(){sent++},onMicPress(){mics++},placeholder:'Answer here',inputAccessibilityLabel:'Your exercise response',submitLabel:'Submit'};
 const render=extra=>{cursor=0;return flatten(Composer({...props,...extra}));};let nodes=render();let input=nodes.find(n=>n.type==='TextInput');assert.equal(input.props.multiline,true);assert.equal(input.props.submitBehavior,'newline');assert.equal(input.props.onSubmitEditing,undefined);assert.equal(input.props.value,draft);
 nodes.find(n=>n.props.accessibilityLabel==='Collapse response field').props.onPress();nodes=render();assert.equal(nodes.find(n=>n.type==='TextInput').props.value,draft);nodes.find(n=>n.props.accessibilityLabel==='Expand response field').props.onPress();nodes=render();assert.equal(nodes.find(n=>n.type==='TextInput').props.value,draft);
 nodes.find(n=>n.props.accessibilityLabel==='Start microphone recording').props.onPress();assert.equal(mics,1);assert.equal(sent,0);nodes.find(n=>n.props.accessibilityLabel==='Submit').props.onPress();assert.equal(sent,1);
 for(const blocked of [{value:' '},{editable:false},{isRecording:true},{transcribing:true},{sending:true},{sendDisabled:true}]){nodes=render(blocked);const send=nodes.find(n=>n.props.accessibilityLabel==='Submit');assert.ok(send.props.disabled);send.props.onPress();assert.equal(sent,1);}
 nodes=render({showSendControl:false,editable:false});assert.equal(nodes.find(n=>n.props.accessibilityLabel==='Submit'),undefined);assert.equal(nodes.find(n=>n.type==='TextInput').props.value,draft);
});

test("Practice 2 task disclosure preserves every canonical question, concept and helper",()=>{
 const jsx=(type,props)=>({type,props:props||{}});let expanded=false;const resolve=name=>name==='react'?{useState:()=>[expanded,v=>expanded=typeof v==='function'?v(expanded):v]}:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='react-native'?{View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:x=>x}}:name==='@expo/vector-icons'?{MaterialCommunityIcons:'Icon'}:name==='./tokens'?compile('src/components/module0/tokens.ts',resolve):{};
 const Task=compile('src/components/module0/PracticeTask.tsx',resolve).PracticeTask;
 const flatten=n=>!n?[]:Array.isArray(n)?n.flatMap(flatten):typeof n!=='object'?[]:typeof n.type==='function'?flatten(n.type(n.props)):[n,...flatten(n.props.children)];
 for(const activity of catalog.activities)for(const step of activity.steps)for(const optional of [false,true]){
  expanded=false;let nodes=flatten(Task({step,optional}));const ref=nodes.find(n=>n.type==='Pressable');assert.equal(ref.props.accessibilityState.expanded,false);ref.props.onPress();nodes=flatten(Task({step,optional}));const text=nodes.filter(n=>n.type==='Text').map(n=>n.props.children);assert.ok(text.includes(optional?step.optionalPracticeQuestion:step.question));assert.ok(text.includes(step.teach));assert.ok(text.includes(optional && step.id === "soap-and-data-types" ? "A few focused sentences or labeled phrases are enough. Longer valid answers are welcome." : step.answerHint));assert.equal(nodes.find(n=>n.type==='Pressable').props.accessibilityState.expanded,true);
 }
});

test("Practice refinements keep unfinished drafts through mentor, audio and local navigation at all target widths",async t=>{
 for(const [width,height] of [[320,568],[390,844],[1440,900]]){
  const h=harness("app/module-0.tsx",{activityId:"clinical-reasoning"},{approvedUI:true,width,height});t.after(h.unmount);
  h.render();await h.settle();h.find("Begin").props.onPress();h.render();await h.settle();await finishTeaching(h);
  assert.equal(h.render().props.screen,"practice");assert.equal(h.render().props.step.id,"focused-examination");assert.equal(h.find("Answer exercise"),undefined);assert.ok(h.find("Submit"));
  const before=await h.service.getProgress("A"),draft="Unsent SOAP draft\nPatient report differs from observed findings.";
  h.input().props.onChangeText(draft);h.render();
  h.find("Activities and reviews").props.onPress();h.render();assert.equal(h.render().props.navigationOpen,true);assert.equal(h.input().props.value,draft);
  h.find("Activities and reviews").props.onPress();h.render();assert.equal(h.render().props.navigationOpen,false);
  h.find("Show captions").props.onPress();h.render();h.find("Mute narration").props.onPress();h.render();h.find("Unmute narration").props.onPress();h.render();assert.equal(h.input().props.value,draft);
  h.find("Ask Dr. Martinez").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"clarify");h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"practice");assert.equal(h.render().props.step.id,"focused-examination");assert.equal(h.input().props.value,draft);assert.equal(h.find("Answer exercise"),undefined);
  assert.deepEqual(await h.service.getProgress("A"),before);
 }
});

test("Module Back follows curriculum after direct entry and remount without browser history",async t=>{
 for(const width of [320,390,1440])for(const canGoBack of [true,false]){
  const h=harness("app/module-0.tsx",{activityId:"starting-the-encounter"},{approvedUI:true,width,height:width===320?568:844,canGoBack});t.after(h.unmount);
  await h.service.submit("A",{activityId:catalog.activities[0].id,stepId:catalog.activities[0].steps[0].id,kind:"required",response:"Saved opening response",requestId:`direct-${width}-${canGoBack}`,expectedRevision:0});
  for(let reopen=0;reopen<2;reopen++){
   if(reopen)h.unmount();h.render();await h.settle();assert.equal(h.render().props.screen,"old-carts-teach");assert.equal(h.render().props.teachingPanel,0);const before=await h.service.getProgress("A");h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"feedback");assert.equal(h.render().props.step.id,"open-the-interview");assert.equal(h.render().props.result.response,"Saved opening response");assert.deepEqual(await h.service.getProgress("A"),before);assert.equal(h.navigation.length,0);
  }
 }
});
test("Back keeps an unsent draft across previous exercise and subsequent return",async t=>{
 const h=harness("app/module-0.tsx",{activityId:"starting-the-encounter"},{approvedUI:true});t.after(h.unmount);await h.service.submit("A",{activityId:catalog.activities[0].id,stepId:catalog.activities[0].steps[0].id,kind:"required",response:"Saved opening response",requestId:"draft-previous",expectedRevision:0});h.render();await h.settle();await finishTeaching(h);h.input().props.onChangeText("Unsent OLD CARTS draft\nAdditional detail");h.render();const before=await h.service.getProgress("A");h.find("Back").props.onPress();h.render();await h.settle();for(let i=0;i<teaching.oldCartsPanels.length;i++){h.find("Back").props.onPress();h.render();await h.settle();}assert.equal(h.render().props.screen,"feedback");h.find("Continue →").props.onPress();h.render();await h.settle();await finishTeaching(h);assert.equal(h.input().props.value,"Unsent OLD CARTS draft\nAdditional detail");assert.deepEqual(await h.service.getProgress("A"),before);
});
test("Close always replaces with Today and cancel protects unsent work at every width",async t=>{
 for(const width of [320,390,1440]){
  const h=harness("app/module-0.tsx",{activityId:"clinical-reasoning"},{approvedUI:true,width,canGoBack:false});t.after(h.unmount);h.render();await h.settle();h.find("Begin").props.onPress();h.render();await h.settle();await finishTeaching(h);h.input().props.onChangeText("Unsent SOAP draft");h.render();const before=await h.service.getProgress("A");h.find("Close lesson").props.onPress();h.render();assert.equal(h.render().props.exitPrompt,true);assert.equal(h.navigation.length,0);h.render().props.onCancelExit();h.render();assert.equal(h.input().props.value,"Unsent SOAP draft");h.find("Close lesson").props.onPress();h.render();h.render().props.onConfirmExit();assert.equal(h.navigation.at(-1),"/(tabs)");assert.equal(h.navigation.includes("back"),false);assert.deepEqual(await h.service.getProgress("A"),before);
 }
});
test("First teaching page backs to its introduction; first module page exits predictably",async t=>{
 const h=harness("app/module-0.tsx",{activityId:"organizing-clinical-information"},{approvedUI:true,canGoBack:true});t.after(h.unmount);h.render();await h.settle();h.find("Begin").props.onPress();h.render();await h.settle();h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"introduction");
 const first=harness("app/module-0.tsx",{}, {approvedUI:true,canGoBack:true});t.after(first.unmount);first.render();await first.settle();assert.equal(first.render().props.screen,"welcome");first.find("Back").props.onPress();assert.equal(first.navigation.at(-1),"/(tabs)");assert.equal(first.navigation.includes("back"),false);
});

test("Back crosses activity boundaries using saved curriculum order after direct links and refresh",async t=>{
 const h=harness("app/module-0.tsx",{activityId:"organizing-clinical-information"},{approvedUI:true,canGoBack:false});t.after(h.unmount);let revision=0;for(const step of catalog.activities[0].steps)revision=(await h.service.submit("A",{activityId:catalog.activities[0].id,stepId:step.id,kind:"required",response:"Saved preceding activity response",requestId:"boundary-"+step.id,expectedRevision:revision})).progress.revision;
 for(let mount=0;mount<2;mount++){if(mount)h.unmount();h.render();await h.settle();assert.equal(h.render().props.screen,"introduction");const before=await h.service.getProgress("A");h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"activity-complete");assert.equal(h.render().props.activity.id,"starting-the-encounter");h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"feedback");assert.equal(h.render().props.step.id,"organize-old-carts");assert.equal(h.render().props.result.response,"Saved preceding activity response");assert.deepEqual(await h.service.getProgress("A"),before);assert.equal(h.navigation.length,0);}
});
test("Back from optional Practice retains its draft when reopening through Review",async t=>{
 const h=await completedReviewHarness(t,{mode:"review"});h.render();await h.settle();const before=await h.service.getProgress("A");h.find("Practice Again: SOAP and Data Types").props.onPress();h.render();await h.settle();h.input().props.onChangeText("Unsent targeted draft");h.render();h.find("Back").props.onPress();h.render();await h.settle();assert.equal(h.render().props.screen,"review");h.find("Practice Again: SOAP and Data Types").props.onPress();h.render();await h.settle();assert.equal(h.input().props.value,"Unsent targeted draft");h.input().props.onChangeText("");h.render();h.find("Close lesson").props.onPress();h.render();assert.equal(h.render().props.exitPrompt,false);assert.equal(h.navigation.at(-1),"/(tabs)");assert.deepEqual(await h.service.getProgress("A"),before);
});

test("corrected OLD CARTS teaches O L D C A R T S in ten distinct pages and keeps facts",()=>{
 const panels=teaching.oldCartsPanels;assert.equal(panels.length,10);assert.deepEqual(Array.from(panels.slice(1,9),p=>p.rows[0].label[0]),['O','L','D','C','A','R','T','S']);
 const location=panels[2],radiation=panels[6];assert.doesNotMatch(location.text,/Radiation/);assert.match(location.rows[0].clinical,/Anterior chest; localized/);assert.match(radiation.rows[0].clinical,/No radiation to the arm, neck, or jaw/);
 const all=JSON.stringify(panels);for(const fact of ['Yesterday morning','10–15 minutes','Sharp, pleuritic pain','no alleviating factors','Intermittent, worse in the morning','6/10'])assert.ok(all.includes(fact),fact);
 const sequence=catalog.activities.flatMap(a=>a.steps.flatMap(step=>teaching.conceptPanelsFor(step)));for(let i=1;i<sequence.length;i++)assert.notEqual(sequence[i].illustration||sequence[i].icon,sequence[i-1].illustration||sequence[i-1].icon);
});
test("SOAP dropdowns require four selections, preserve drafts, and submit the original request contract",async t=>{
 for(const width of [320,390,1440]){
 const h=harness('app/module-0.tsx',{activityId:'organizing-clinical-information'},{approvedUI:true,width});t.after(h.unmount);h.render();await h.settle();h.find('Begin').props.onPress();h.render();await h.settle();await finishTeaching(h);let requests=[];h.setPost(payload=>{requests.push(payload);return h.service.submit('A',payload)});
 assert.equal(h.input(),undefined);assert.equal(h.composer(),undefined);assert.equal(h.find('Start microphone recording'),undefined);assert.match(h.text(h.render()),/Identify the SOAP Components/);assert.ok(h.find('Submit').props.disabled);
 const choices=()=>h.nodes().filter(n=>n.type==='select');assert.equal(choices().length,4);assert.ok(choices().every(n=>n.props.value===''));assert.ok(choices().every(n=>n.props['aria-label']));
 selectSoap(h,['P','P','P']);assert.ok(h.find('Submit').props.disabled);h.render().props.onContinue();await h.settle();assert.equal(requests.length,0);
 const draft=h.render().props.selected;h.find('Close lesson').props.onPress();h.render();assert.ok(h.render().props.exitPrompt);h.render().props.onCancelExit();h.render();assert.equal(h.render().props.selected,draft);
 h.find('Back').props.onPress();h.render();await h.settle();h.find('Practice →').props.onPress();h.render();await h.settle();assert.equal(h.render().props.selected,draft);
 choices()[3].props.onChange({target:{value:'P'}});h.render();assert.equal(h.find('Submit').props.disabled,false);h.find('Submit').props.onPress();await h.settle();assert.equal(requests.length,1);assert.equal(requests[0].response,'1: P\n2: P\n3: P\n4: P');assert.equal(requests[0].kind,'required');assert.equal(h.render().props.result.requestId,requests[0].requestId);assert.equal((await h.service.getProgress('A')).activities[1].steps[0].saved.response,requests[0].response);
 }
});
test("old SOAP prose and feedback remain unchanged in Review; optional SOAP remains free text",async t=>{
 const h=await completedReviewHarness(t,{mode:'review'});h.render();await h.settle();const before=await h.service.getProgress('A');h.find('Review: SOAP and Data Types').props.onPress();h.render();await h.settle();await finishTeaching(h);assert.match(h.text(h.render()),/Original saved response for soap-and-data-types/);assert.equal(h.input(),undefined);h.find('Return to feedback').props.onPress();h.render();await h.settle();assert.equal(h.render().props.result.response,before.activities[1].steps[0].saved.response);h.find('Continue →').props.onPress();h.render();await h.settle();h.find('Practice Again: SOAP and Data Types').props.onPress();h.render();await h.settle();assert.ok(h.input());assert.match(h.text(h.render()),/shortness of breath subjective or objective/);assert.equal(h.nodes().filter(n=>n.type==='select').length,0);assert.deepEqual(await h.service.getProgress('A'),before);
});
test("feedback uses neutral revision artwork only for Needs More Practice and omits body counters",async t=>{
 for(const label of ['Ready','Needs More Practice'])for(const optional of [false,true]){
 const h=optional?await completedReviewHarness(t,{mode:'review'}):harness('app/module-0.tsx',{}, {approvedUI:true});t.after(h.unmount);h.setEvaluate(()=>({label,feedback:'Synthetic actual feedback.'}));
 if(optional){h.render();await h.settle();h.find('Practice Again: SOAP and Data Types').props.onPress();h.render();await h.settle();h.input().props.onChangeText('Synthetic optional response');h.render();h.find('Submit').props.onPress();}else{await openingPractice(h);selectChoice(h,'What brings you in today?');h.render();h.find('Check answer').props.onPress();}await h.settle();
 assert.doesNotMatch(h.text(h.render()),/Activity \d+ of \d+ —|Exercise \d+ of \d+ —/);const neutral=h.nodes().find(n=>n.props.accessibilityLabel==='Revision suggested');assert.equal(!!neutral,label==='Needs More Practice');if(neutral)assert.ok(h.nodes(neutral).some(n=>n.props.name==='file-document-edit-outline'));
 }
});
test("new feedback narrates exactly once and never automatically repeats on Back, Review or remount",async t=>{
 for(const label of ['Ready','Needs More Practice']){
 const h=harness('app/module-0.tsx',{}, {approvedUI:true});t.after(h.unmount);const feedback='Actual new feedback '+label;h.setEvaluate(()=>({label,feedback}));await openingPractice(h);const previous=h.speeches.at(-1);selectChoice(h,'What brings you in today?');h.render();h.find('Check answer').props.onPress();await h.settle();assert.equal(previous.valid(),false);assert.equal(h.speeches.filter(s=>s.text===feedback).length,1);h.render();await h.settle();h.find('Back').props.onPress();h.render();await h.settle();h.find('Return to feedback').props.onPress();h.render();await h.settle();assert.equal(h.speeches.filter(s=>s.text===feedback).length,1);
 h.unmount();h.render();await h.settle();await reviewOpening(h);assert.equal(h.speeches.filter(s=>s.text===feedback).length,1);
 }
});
test("activity completion narrates aligned text once after new completion and stops old audio",async t=>{
 const h=harness('app/module-0.tsx',{}, {approvedUI:true});t.after(h.unmount);await openingPractice(h);selectChoice(h,'What brings you in today?');h.render();h.find('Check answer').props.onPress();await h.settle();await continueFeedback(h);h.input().props.onChangeText('Synthetic complete OLD CARTS attempt');h.render();h.find('Submit').props.onPress();await h.settle();const feedback=h.speeches.at(-1);h.find('Continue →').props.onPress();h.render();await h.settle();const completion=teaching.activityCompletionText(catalog.activities[0]);assert.equal(feedback.valid(),false);assert.equal(h.speeches.filter(s=>s.text===completion).length,1);assert.ok(h.text(h.render()).includes(completion));h.find('Back').props.onPress();h.render();await h.settle();h.find('Continue →').props.onPress();h.render();await h.settle();assert.equal(h.speeches.filter(s=>s.text===completion).length,1);
});
test("muted returned feedback is not automatically replayed by enabling audio",async t=>{
 const h=harness('app/module-0.tsx',{}, {approvedUI:true,voiceEnabled:false});t.after(h.unmount);await openingPractice(h);selectChoice(h,'What brings you in today?');h.render();h.find('Check answer').props.onPress();await h.settle();assert.equal(h.speeches.length,0);h.find('Unmute narration').props.onPress();h.render();await h.settle();assert.equal(h.speeches.length,0);h.find('Play narration').props.onPress();assert.equal(h.speeches.length,1);
});
test("Module Complete header and 100 percent progress are independent of the selected exercise",async t=>{
 const h=await completedReviewHarness(t,{});h.render();await h.settle();assert.equal(h.render().props.screen,'module-complete');assert.match(h.text(h.render()),/9\s*\/\s*9/);const title=h.nodes().find(n=>n.type==='Text'&&h.text(n)==='Module 0 Complete');assert.ok(title);const progress=h.nodes().find(n=>n.props.accessibilityRole==='progressbar'&&n.props.accessibilityLabel==='Saved exercise progress');assert.equal(progress.props.accessibilityValue.now,9);assert.equal(progress.props.accessibilityValue.max,9);assert.ok(h.find('Continue to Rotation 1'));assert.ok(h.find('Review completed exercises'));
});
test("Welcome confines artwork to clipped hero and opaque rounded content at all widths",async t=>{
 for(const width of [320,390,1440]){const h=harness('app/module-0.tsx',{}, {approvedUI:true,width});t.after(h.unmount);h.render();await h.settle();const hero=h.nodes().find(n=>n.type==='View'&&n.props.style?.height===318);assert.equal(hero.props.style.overflow,'hidden');assert.equal(h.nodes(hero).filter(n=>n.type==='Image').length,1);const panel=h.nodes().find(n=>n.type==='View'&&n.props.style?.borderTopLeftRadius===28);assert.equal(panel.props.style.backgroundColor,'#ffffff');assert.equal(panel.props.style.overflow,'hidden');assert.ok(h.find("Let's start"));}
});

test('non-OLD teaching words, facts and narration remain identical to released baseline',()=>{
 const fields=Object.values(teaching.expandedConcepts).flat().map(({icon,illustration,...rest})=>rest);assert.equal(require('node:crypto').createHash('sha256').update(JSON.stringify(fields)).digest('hex'),'247bad88f5aa93f0612f71cb7dc69ed2b530766179109fdb86b2d57e1e3bf6e6');
});
test('SOAP pending and retry preserve request identity for new dropdowns and legacy prose',async t=>{
 for(const legacy of [false,true]){
 const h=harness('app/module-0.tsx',{activityId:'organizing-clinical-information'},{approvedUI:true,fakeTimers:true});t.after(h.unmount);h.setEvaluate(()=>{throw Error('Synthetic feedback failure')});let requests=[];h.setPost(payload=>{requests.push(payload);return h.service.submit('A',payload)});
 if(legacy){await h.service.submit('A',{activityId:'organizing-clinical-information',stepId:'soap-and-data-types',kind:'required',response:'Legacy SOAP: pain is Subjective, crackles Objective, pulmonary cause Assessment, chest X-ray Plan.',requestId:'legacy-soap-pending',expectedRevision:0});h.render();await h.settle();}else{h.render();await h.settle();h.find('Begin').props.onPress();h.render();await h.settle();await finishTeaching(h);selectSoap(h);h.find('Submit').props.onPress();await h.settle();}
 const before=await h.service.getProgress('A');assert.ok(before.pending);assert.equal(h.input(),undefined);assert.ok(h.find('Retry feedback'));assert.ok(h.nodes().filter(n=>n.type==='select').every(n=>n.props.disabled));h.find('Close lesson').props.onPress();assert.equal(h.navigation.at(-1),'/(tabs)');h.unmount();h.render();await h.settle();assert.equal((await h.service.getProgress('A')).pending.requestId,before.pending.requestId);await h.advance(6000);h.setEvaluate(()=>({label:'Ready',feedback:'Synthetic recovered feedback.'}));h.find('Retry feedback').props.onPress();await h.settle();assert.equal(h.render().props.result.requestId,before.pending.requestId);assert.equal(h.render().props.result.response,before.pending.response);assert.equal(requests.at(-1).response,before.pending.response);assert.equal(requests.at(-1).requestId,before.pending.requestId);
 }
});


test('native SOAP category sheet exposes selection and cancellation without a composer',()=>{
 const soap=compile('src/components/module0/soap.js',()=>({}));let open=null,value='',elements=[];
 const jsx=(type,props)=>({type,props:props||{}});const Component=compile('src/components/module0/SoapClassification.tsx',name=>{
 if(name==='react')return {useState:()=>[open,next=>{open=typeof next==='function'?next(open):next}],createElement:()=>{throw Error('Web select used on native')}};
 if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name==='react-native')return {View:'View',Text:'Text',Pressable:'Pressable',Modal:'Modal',Platform:{OS:'ios'},StyleSheet:{create:x=>x}};if(name==='@expo/vector-icons')return {MaterialCommunityIcons:'Icon'};if(name==='./soap')return soap;if(name==='./tokens')return compile('src/components/module0/tokens.ts',()=>({}));throw Error(name);
 }).SoapClassification;
 function render(){elements=[];function visit(n){if(!n)return;if(Array.isArray(n))return n.forEach(visit);if(typeof n==='object'){elements.push(n);visit(n.props.children)}}visit(Component({value,onChange:next=>value=next,disabled:false}));return elements}
 render();const dropdown=elements.find(n=>n.props.accessibilityHint==='Opens SOAP categories');assert.equal(dropdown.props.accessibilityValue.text,'Select category');dropdown.props.onPress();render();assert.equal(elements.find(n=>n.type==='Modal').props.visible,true);elements.find(n=>n.props.accessibilityLabel==='A — Assessment').props.onPress();render();assert.equal(value,'1: A');assert.equal(elements.find(n=>n.props.accessibilityHint==='Opens SOAP categories').props.accessibilityValue.text,'A — Assessment');elements.find(n=>n.props.accessibilityHint==='Opens SOAP categories').props.onPress();render();elements.find(n=>n.type==='Modal').props.onRequestClose();render();assert.equal(open,null);assert.equal(value,'1: A');assert.equal(elements.filter(n=>n.type==='TextInput').length,0);
});

test('final OLD CARTS lossless images match approved integrity, dimensions, order and preserve introduction',()=>{
 const assets=require('./fixtures/module0OldCartsArtwork.json'),keys=['onset','location','duration','character','factors','radiation','temporal','severity','qualifiers'];const renderer=fs.readFileSync(path.resolve(__dirname,'../../mobile/src/components/module0/ApprovedScreens.tsx'),'utf8');assert.equal(teaching.oldCartsPanels[0].illustration,'patient-data-to-summary');assert.equal(assets.length,9);
 assets.forEach((asset,index)=>{assert.equal(asset.page,index+2);assert.equal(teaching.oldCartsPanels[index+1].illustration,'old-carts-'+keys[index]);const file=fs.readFileSync(path.resolve(__dirname,'../../mobile/assets/module0/old-carts',asset.file));assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.toString('ascii',8,12),'WEBP');assert.equal(file.readUInt32LE(4)+8,file.length);let chunk=12;while(chunk+8<file.length && file.toString('ascii',chunk,chunk+4)!=='VP8L'){const length=file.readUInt32LE(chunk+4);chunk+=8+length+(length&1);}assert.equal(file.toString('ascii',chunk,chunk+4),'VP8L');assert.equal(file[chunk+8],0x2f);const dimensions=file.readUInt32LE(chunk+9);assert.equal(1+(dimensions&0x3fff),asset.width);assert.equal(1+((dimensions>>>14)&0x3fff),asset.height);assert.equal(asset.width,1254);assert.equal(asset.height,1254);assert.equal(asset.format,'lossless-webp');assert.equal(file.length,asset.bytes);assert.equal(require('node:crypto').createHash('sha256').update(file).digest('hex'),asset.sha256);assert.ok(renderer.includes('require("../../../assets/module0/old-carts/'+asset.file+'")'));});
 assert.match(teaching.oldCartsPanels[6].rows[0].clinical,/No radiation to the arm, neck, or jaw/);assert.match(teaching.oldCartsPanels[5].rows[0].clinical,/no alleviating factors/);
});

test('OLD CARTS artwork integration preserves every nonvisual teaching field',()=>{
 const fields=teaching.oldCartsPanels.map(({illustration,...rest})=>rest);assert.equal(require('node:crypto').createHash('sha256').update(JSON.stringify(fields)).digest('hex'),'a5da86f4e8ab5fb7e3e899d78e88fe7638c811ff114f286751333d2baca413b2');
});


test('actual Roadmap waits for fresh re-entry data after an empty visit and centers the measured lesson once',async()=>{
 let currentPaths=[],recommendation=null;const scrolls=[];
 const h=harness('app/(tabs)/cases.tsx',{}, {api:{getLearningPaths:async()=>currentPaths,getToday:async()=>({module0:currentPaths.length?{completed:true,entryBlocked:false}:null,recommendedEncounter:recommendation})}});
 h.render();await h.settle();assert.equal(h.nodes().some(n=>n.props?.testID==='roadmap-positioning'),false);
 h.setFocused(false);await h.settle();
 currentPaths=[{id:'p',title:'P',units:[{id:'u',slug:'u',title:'U',sessions:[{id:'lesson',slug:'lesson',title:'Actual lesson',status:'available'}]}]}];recommendation={patientSessionSlug:'lesson',status:'available'};
 h.setFocused(true);await h.settle();
 const scroll=h.nodes().find(n=>n.props?.testID==='roadmap-scroll'),canvas=h.nodes().find(n=>n.type==='JourneyCanvas');
 scroll.props.ref.current={scrollTo:options=>scrolls.push(options)};
 scroll.props.onLayout({nativeEvent:{layout:{height:600}}});canvas.props.onCanvasLayout({y:0,height:3000});canvas.props.onFocusMeasure('focus:p:u:lesson',{x:0,y:1000,width:350,height:200});
 await h.advance(0);await h.advance(0);assert.equal(scrolls.length,1);assert.equal(scrolls[0].y,800);assert.equal(scrolls[0].animated,false);
 canvas.props.onFocusMeasure('focus:p:u:lesson',{x:0,y:1800,width:350,height:200});await h.advance(0);assert.equal(scrolls.length,1);
 assert.equal(h.nodes().some(n=>n.props?.testID==='roadmap-positioning'),false);
});

test('actual Roadmap account switch rejects old queued scrolling and waits for the new learner data',async()=>{
 const paths=[{id:'p',title:'P',units:[{id:'u',slug:'u',title:'U',sessions:[{id:'lesson',slug:'lesson',title:'Lesson',status:'available'}]}]}];
 let resolveB;const pendingB=new Promise(resolve=>{resolveB=resolve;});const calls=[];
 const h=harness('app/(tabs)/cases.tsx',{}, {api:{getLearningPaths:async headers=>headers.expectedUserId==='B'?pendingB:paths,getToday:async()=>({module0:{completed:true},recommendedEncounter:{patientSessionSlug:'lesson',status:'available'}})}});
 h.render();await h.settle();const scroll=h.nodes().find(n=>n.props?.testID==='roadmap-scroll'),canvas=h.nodes().find(n=>n.type==='JourneyCanvas');scroll.props.ref.current={scrollTo:()=>calls.push('A')};scroll.props.onLayout({nativeEvent:{layout:{height:600}}});canvas.props.onCanvasLayout({y:0,height:3000});canvas.props.onFocusMeasure('focus:p:u:lesson',{x:0,y:1000,width:350,height:200});
 h.switchUser('B');await h.advance(0);assert.equal(calls.length,0);assert.equal(h.nodes().some(n=>n.props?.testID==='roadmap-positioning'),true);
 canvas.props.onFocusMeasure('focus:p:u:lesson',{x:0,y:1600,width:350,height:200});await h.advance(0);assert.equal(calls.length,0);
 resolveB(paths);await h.settle();const nextScroll=h.nodes().find(n=>n.props?.testID==='roadmap-scroll'),nextCanvas=h.nodes().find(n=>n.type==='JourneyCanvas');nextScroll.props.ref.current={scrollTo:()=>calls.push('B')};nextScroll.props.onLayout({nativeEvent:{layout:{height:600}}});nextCanvas.props.onCanvasLayout({y:0,height:3000});nextCanvas.props.onFocusMeasure('focus:p:u:lesson',{x:0,y:1800,width:350,height:200});await h.advance(0);await h.advance(0);assert.deepEqual(calls,['B']);
});

const briefSession={id:'brief',slug:'seasonal-allergies-complete-hpi',title:'Seasonal Allergies: Complete HPI',status:'available'};
function briefHarness(options={}){const calls=[];const h=harness('app/(tabs)/cases.tsx',{}, {...options,api:{getLearningPaths:async()=>[{id:'p',title:'Path',units:[{id:'u',title:'U',slug:'u',sessions:[briefSession]}]}],getPatientSessionOverview:async(slug,headers)=>{calls.push({slug,headers});return{...briefSession,description:options.description||'Clinical mission from the overview',achievements:[{id:'a',title:options.objective||'Explore the presenting symptoms',weightPercent:100}],badgeThresholds:{gold:84,silver:50,bronze:1},estimatedTime:{min:8,max:12},preceptorPersona:{name:'Dr. Rivera'},linkedCase:{caseId:'seasonal_allergies',title:'Seasonal Allergies'}};}}});return{h,calls,async open(){h.render();await h.settle();await h.nodes().find(n=>n.type==='RoadmapJourney').props.onSessionPress(briefSession);await h.settle();},brief(){return h.nodes().find(n=>typeof n.type==='function'&&n.props.onMeetPreceptor);}};}

test('Patient Brief uses authenticated overview data, existing portrait assets, disclosure and history without starting an encounter',async t=>{
 const b=briefHarness();t.after(b.h.unmount);await b.open();const h=b.h,text=h.text(h.render());
 for(const value of ['Sarah Johnson','Complete Clinical Encounter','Seasonal Allergies','Clinical mission from the overview','Explore the presenting symptoms','8','12','Dr. Rivera'])assert.ok(text.includes(value),value);
 assert.equal(b.calls[0].headers.expectedUserId,'A');assert.equal(b.calls[0].slug,briefSession.slug);
 const avatar=h.nodes().find(n=>n.type==='PatientAvatar');assert.equal(avatar.props.patientSessionSlug,briefSession.slug);assert.equal(avatar.props.caseId,'seasonal_allergies');assert.equal(avatar.props.size,54);
 assert.equal(b.brief().props.evaluationExpanded,false);h.find('Show evaluation details').props.onPress();h.render();assert.match(h.text(h.render()),/Worth\s+100%\s+of your session score/);assert.match(h.text(h.render()),/84%\+/);
 h.find('Hide evaluation details').props.onPress();h.render();assert.equal(b.brief().props.evaluationExpanded,false);assert.equal(h.navigation.length,0);
 h.find('View Previous Attempts').props.onPress();h.render();assert.equal(b.brief().props.visible,false);assert.equal(h.navigation.at(-1).pathname,'/attempts');assert.equal(h.navigation.at(-1).params.caseId,'seasonal_allergies');
});

test('Patient Brief close control and Android/modal back only dismiss; primary still hands off before encounter routing',async t=>{
 for(const dismissal of ['close','request','keyboard']){const b=briefHarness();t.after(b.h.unmount);await b.open();const h=b.h;
 if(dismissal==='close')h.find('Close Patient Brief').props.onPress();else if(dismissal==='keyboard')h.nodes().find(n=>n.props?.testID==='patient-brief').props.onKeyDown({key:'Escape',stopPropagation(){}});else h.nodes().find(n=>n.type==='Modal'&&n.props.visible).props.onRequestClose();h.render();assert.equal(b.brief().props.visible,false);assert.equal(h.navigation.length,0);assert.equal(h.find('Meet Patient')?.props.onPress!==undefined,true);
 await h.nodes().find(n=>n.type==='RoadmapJourney').props.onSessionPress(briefSession);await h.settle();h.find('Meet Preceptor').props.onPress();h.render();assert.equal(b.brief().props.visible,false);assert.equal(h.navigation.length,0,'handoff creates no route or attempt');
 h.find('Back').props.onPress();h.render();assert.equal(h.navigation.length,0);
 }
});

test('Patient Brief keeps long text intact with safe-area padding, scrollable body and separate accessible footer at 320px',async t=>{
 const long='Detailed clinical context and learning objective '.repeat(35);const b=briefHarness({width:320,height:568,insets:{top:47,bottom:34,left:0,right:0},description:long,objective:long});t.after(b.h.unmount);await b.open();const h=b.h;
 assert.ok(h.text(h.render()).includes(long));const nodes=h.nodes(),backdrop=nodes.find(n=>n.props?.testID==='patient-brief-backdrop');assert.equal(backdrop.props.style.at(-1).paddingTop,61);assert.equal(backdrop.props.style.at(-1).paddingBottom,48);
 const close=nodes.find(n=>n.props?.testID==='patient-brief-close');assert.equal(close.props.accessibilityLabel,'Close Patient Brief');assert.equal(close.props.style.width,44);assert.equal(close.props.style.height,44);
 const card=nodes.find(n=>n.props?.testID==='patient-brief');const children=h.nodes(card);assert.ok(children.some(n=>n.props?.testID==='patient-brief-scroll'));assert.ok(children.some(n=>n.props?.testID==='patient-brief-footer'));assert.equal(h.nodes(nodes.find(n=>n.props?.testID==='patient-brief-scroll')).some(n=>n.props?.testID==='patient-brief-footer'),false);
 h.find('Show evaluation details').props.onPress();h.render();assert.ok(h.find('Meet Preceptor'));assert.equal(b.brief().props.evaluationExpanded,true);
});

test('Patient Brief clears old presentation across authenticated account ownership changes',async t=>{
 const b=briefHarness();t.after(b.h.unmount);await b.open();b.h.switchUser('B');await b.h.settle();assert.equal(b.brief().props.visible,false);assert.equal(b.brief().props.overview,null);
 await b.h.nodes().find(n=>n.type==='RoadmapJourney').props.onSessionPress(briefSession);await b.h.settle();assert.equal(b.calls.at(-1).headers.expectedUserId,'B');assert.equal(b.brief().props.visible,true);
});

test('Patient Brief portrait component uses the real patient image and falls back to initials only for unavailable artwork',()=>{
 const assets=compile('src/utils/patientAssets.ts',ref=>ref);
 const jsx=(type,props)=>({type,props:props||{}});
 const avatar=compile('src/components/PatientAvatar.tsx',name=>name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='react-native'?{Image:'Image',View:'View',Text:'Text',StyleSheet:{create:x=>x}}:assets,{__DEV__:false}).PatientAvatar;
 const known=avatar({patientName:'Taylor Reed',patientSessionSlug:'first-patient',caseId:'uti_level1',size:54,showRing:false});assert.equal(known.props.children.type,'Image');assert.ok(known.props.children.props.source);
 const missing=avatar({patientName:'Unknown Learner Fixture',patientSessionSlug:'unmapped',caseId:'unmapped',size:54,showRing:false});assert.equal(missing.props.children.type,'Text');assert.equal(missing.props.children.props.children,assets.getPatientInitials('Unknown Learner Fixture','PT'));
});

function mentorHarness(options={}){
 const calls=[],session={id:'mentor-session',slug:'first-patient-hpi',title:'Complete HPI',status:'available'};
 const opts={...options,api:{getLearningPaths:async()=>[{id:'p',title:'Path',units:[{id:'u',title:'U',slug:'u',sessions:[session]}]}],getPatientSessionOverview:async()=>({...session,achievements:[],badgeThresholds:{gold:84,silver:50,bronze:1},estimatedTime:{min:3,max:5},workflow:{requiresHpi:true},linkedCase:{caseId:'clinical-case'},preceptorPersona:{name:'Dr. Rivera',slug:'dr-martinez',specialty:'Clinical Educator'}}),sendPreceptorChatMessage:async(slug,payload,headers)=>{calls.push({slug,payload,headers});return options.reply?options.reply():{reply:'Patient-centered mentor response'};}}};
 const h=harness('app/(tabs)/cases.tsx',{},opts);return{h,calls,opts,mentor:()=>h.nodes().find(n=>typeof n.type==='function'&&n.props.onMeetPatient),async open(){h.render();await h.settle();await h.nodes().find(n=>n.type==='RoadmapJourney').props.onSessionPress(session);await h.settle();h.find('Meet Preceptor').props.onPress();h.render();await h.settle();}};
}

test('Meet Preceptor renders existing identity, welcome, suggestions and real mentor portrait props',async t=>{
 const b=mentorHarness();t.after(b.h.unmount);await b.open();const h=b.h,m=b.mentor();assert.equal(m.props.name,'Dr. Rivera');assert.equal(m.props.role,'Clinical Educator');assert.match(m.props.welcome,/Welcome\. I'm Dr\. Martinez/);assert.equal(m.props.suggestions.length,3);
 const avatar=h.nodes().find(n=>n.type==='MentorAvatar');assert.equal(avatar.props.mentorSlug,'dr-martinez');assert.equal(avatar.props.size,94);assert.equal(avatar.props.variant,'circle');
 assert.ok(h.find('How should I introduce myself?'));assert.ok(h.find('What is a chief complaint?'));assert.ok(h.find('What should I focus on?'));assert.equal(h.navigation.length,0);
});

test('Meet Preceptor suggested and typed questions preserve backend payload, history and controlled draft',async t=>{
 const b=mentorHarness();t.after(b.h.unmount);await b.open();const h=b.h;await h.find('What is a chief complaint?').props.onPress();await h.settle();assert.equal(b.calls[0].slug,'first-patient-hpi');assert.equal(b.calls[0].headers.expectedUserId,'A');assert.equal(b.calls[0].payload.message,'What is a chief complaint?');assert.equal(b.mentor().props.messages.length,2);
 h.composer().props.onChangeText('My follow-up question');h.render();await h.composer().props.onSubmit();await h.settle();assert.equal(b.calls[1].payload.message,'My follow-up question');assert.equal(b.calls[1].payload.messages.length,3);assert.equal(b.mentor().props.input,'');assert.equal(b.mentor().props.messages.length,4);
 b.opts.width=320;h.render();assert.equal(b.mentor().props.messages.length,4);assert.equal(b.mentor().props.messages[0].content,'What is a chief complaint?');assert.equal(h.navigation.length,0);
});

test('Meet Preceptor loading disables suggestions and composer; failure preserves conversation and allows another question',async t=>{
 let fail;const b=mentorHarness({reply:()=>new Promise((resolve,reject)=>{fail=reject;})});t.after(b.h.unmount);await b.open();const h=b.h;const pending=h.find('What should I focus on?').props.onPress();h.render();assert.equal(b.mentor().props.sending,true);assert.equal(h.composer().props.sendDisabled,true);assert.equal(h.composer().props.micDisabled,true);assert.equal(h.find('What should I focus on?').props.disabled,true);assert.match(h.text(h.render()),/Dr\. Rivera\s+is responding/);
 fail(new Error('Connection unavailable'));await pending;await h.settle();assert.equal(b.mentor().props.messages[0].role,'user');assert.equal(b.mentor().props.sending,false);assert.equal(b.mentor().props.error,'Connection unavailable');h.composer().props.onChangeText('Try again');h.render();assert.equal(h.composer().props.sendDisabled,false);
});

test('Meet Preceptor voice toggle, microphone callback and dictated draft retain the existing speech workflow',async t=>{
 const b=mentorHarness({voiceEnabled:true});t.after(b.h.unmount);await b.open();const h=b.h;const voice=h.find('Voice: On');assert.equal(voice.props.accessibilityRole,'switch');voice.props.onPress();h.render();assert.ok(h.find('Voice: Off'));assert.equal(h.stops.length,1);
 await h.find('What should I focus on?').props.onPress();await h.settle();assert.equal(h.speeches.length,0);h.find('Voice: Off').props.onPress();h.render();await h.find('What is a chief complaint?').props.onPress();await h.settle();assert.equal(h.speeches.length,1);assert.equal(h.speeches[0].text,'Patient-centered mentor response');
 h.composer().props.onMicPress();assert.equal(h.recordings.length,1);h.dictate('Dictated question');h.render();assert.equal(b.mentor().props.input,'Dictated question');assert.equal(b.calls.length,2,'dictation does not send automatically');
 h.setSpeaking(true);assert.equal(h.nodes().find(n=>n.type==='MentorAvatar').props.isSpeaking,true);
});

test('Meet Preceptor close, Back and modal dismissal do not route; Meet Patient retains encounter parameters',async t=>{
 for(const action of ['close','back','modal','escape']){const b=mentorHarness();t.after(b.h.unmount);await b.open();const h=b.h;if(action==='close')h.find('Close Meet Preceptor').props.onPress();if(action==='back')b.mentor().props.onBack();if(action==='modal')h.nodes().find(n=>n.type==='Modal'&&n.props.visible&&n.props.onRequestClose===b.mentor().props.onClose).props.onRequestClose();if(action==='escape')h.nodes().find(n=>n.props?.testID==='meet-preceptor').props.onKeyDown({key:'Escape',stopPropagation(){}});h.render();assert.equal(b.mentor().props.visible,false);assert.equal(h.navigation.length,0);}
 const b=mentorHarness();t.after(b.h.unmount);await b.open();b.h.find('Meet Patient').props.onPress();b.h.render();const route=b.h.navigation.at(-1);assert.equal(route.pathname,'/(tabs)/level1');assert.equal(route.params.caseId,'clinical-case');assert.equal(route.params.patientSessionSlug,'first-patient-hpi');assert.equal(route.params.requiresHpi,'true');assert.ok(b.h.stops.length>0);
});

test('Meet Preceptor follows replies near the bottom, preserves manual reading position and keeps history across layout changes',async t=>{
 const b=mentorHarness();t.after(b.h.unmount);await b.open();let scrolls=0;const h=b.h;b.mentor().props.dialogueRef.current={scrollToEnd:()=>scrolls++};b.mentor().props.onContentSizeChange();assert.equal(scrolls,0,'initial entry shows identity');
 await h.find('What should I focus on?').props.onPress();await h.settle();assert.ok(scrolls>0);b.mentor().props.onScroll({nativeEvent:{contentSize:{height:2000},layoutMeasurement:{height:400},contentOffset:{y:100}}});const before=scrolls;await h.find('What is a chief complaint?').props.onPress();await h.settle();b.mentor().props.onContentSizeChange();assert.equal(scrolls,before);
 b.mentor().props.onScroll({nativeEvent:{contentSize:{height:2000},layoutMeasurement:{height:400},contentOffset:{y:1600}}});b.mentor().props.onContentSizeChange();assert.ok(scrolls>before);
 b.opts.width=1280;h.render();assert.equal(b.mentor().props.messages.length,4);
});

test('Meet Preceptor clears presentation at learner switch and scopes new requests to the current account',async t=>{
 const b=mentorHarness();t.after(b.h.unmount);await b.open();await b.h.find('What should I focus on?').props.onPress();await b.h.settle();b.h.switchUser('B');await b.h.settle();assert.equal(b.mentor().props.visible,false);assert.equal(b.mentor().props.messages.length,0);await b.open();await b.h.find('What is a chief complaint?').props.onPress();await b.h.settle();assert.equal(b.calls.at(-1).headers.expectedUserId,'B');
});

test('Meet Preceptor safe-area, keyboard avoidance and footer separation are retained on narrow native screens',async t=>{
 for(const platform of ['ios','android']){const b=mentorHarness({width:320,height:568,platform,insets:{top:47,bottom:34,left:0,right:0},transcription:{transcribing:true}});t.after(b.h.unmount);await b.open();const h=b.h,backdrop=h.nodes().find(n=>n.props?.testID==='meet-preceptor-backdrop');assert.equal(backdrop.type,'KeyboardAvoidingView');assert.equal(backdrop.props.enabled,true);assert.equal(backdrop.props.behavior,platform==='ios'?'padding':'height');assert.equal(backdrop.props.style.at(-1).paddingTop,47);assert.equal(backdrop.props.style.at(-1).paddingBottom,34);
 const close=h.find('Close Meet Preceptor');assert.equal(close.props.style.width,44);assert.equal(close.props.style.height,44);const scroll=h.nodes().find(n=>n.props?.testID==='meet-preceptor-history');assert.equal(h.nodes(scroll).some(n=>n.props?.testID==='meet-preceptor-footer'),false);assert.equal(h.composer().props.micDisabled,true);assert.equal(h.composer().props.transcribing,true);
 }
});

function portfolioHarness(options={}) {
 const records=[{sessionAttemptId:'enc-2',patientSessionTitle:'Jordan Lee: History',caseId:'uti_level1',sessionScore:91,badgeTier:'GOLD',scoredAt:'2026-10-12T12:00:00Z'},{sessionAttemptId:'enc-1',patientSessionTitle:'Taylor Reed: Introduction',caseId:'seasonal_allergies',sessionScore:62,badgeTier:'SILVER',scoredAt:'2026-10-11T12:00:00Z'}];
 const calls=[];const h=harness('app/(tabs)/portfolio.tsx',{}, {...options,api:{getClinicalPortfolio:async headers=>{calls.push(headers);return {identity:{levelTitle:'Backend learner title',professionalLevel:3,xp:357},streak:{currentCount:8},learningPathProgress:{pathTitle:'Backend clinical path',percentComplete:42,completedSessions:5,totalSessions:12},recentPatients:options.empty?[]:records,competencies:[{slug:'history',title:'History taking',attempts:3,achievedCount:2,bestPercentScore:91,latestPercentScore:85}],milestones:[{slug:'first',title:'First encounter milestone',category:'milestone',status:'EARNED',earnedAt:'2026-10-12T12:00:00Z'}]};},getToday:async()=>({dailyBriefing:{nextGoal:{title:'Backend current goal',description:'Clarify associated symptoms',currentValue:62,targetValue:84}}})}});
 return {h,calls};
}
test('Portfolio redesign preserves backend identity, history, scores, current goal and all three tabs',async()=>{
 const {h,calls}=portfolioHarness();h.render();await h.settle();assert.equal(calls[0].expectedUserId,'A');assert.match(h.text(h.render()),/Backend learner title/);assert.match(h.text(h.render()),/Backend clinical path/);assert.match(h.text(h.render()),/5\s+of\s+12\s+encounters complete/);h.find("View all completed encounters").props.onPress();h.render();assert.match(h.text(h.render()),/Taylor Reed/);assert.match(h.text(h.render()),/Backend current goal/);assert.doesNotMatch(h.text(h.render()),/#1 62%|#2 91%/);assert.ok(h.nodes().find(n=>n.type==='Image'&&n.props.accessibilityLabel?.includes('1: 62%, 2: 91%')));
 h.find('Achievements').props.onPress();h.render();assert.match(h.text(h.render()),/Growth Timeline/);assert.match(h.text(h.render()),/Professional Milestones/);h.find('Show all milestones').props.onPress();h.render();assert.match(h.text(h.render()),/First encounter milestone/);h.find('Competencies').props.onPress();h.render();assert.ok(h.nodes().find(n=>n.type==='CompetencyProfileTab'));h.find('Badges').props.onPress();h.render();assert.match(h.text(h.render()),/Clinical Performance/);
 h.switchUser('B');await h.settle();assert.equal(calls.at(-1).expectedUserId,'B');
});
test('Portfolio empty state retains tabs, growth and settings without invented chart values',async()=>{
 const {h}=portfolioHarness({empty:true,width:320});h.render();await h.settle();assert.match(h.text(h.render()),/Complete at least two scored encounters to see how your performance changes over time/);assert.equal(h.nodes().filter(n=>n.props.testID==='clinical-performance-chart').length,0);assert.ok(h.nodes().find(n=>n.type==='AccountSettingsButton'));assert.equal(h.nodes().filter(n=>n.props.accessibilityRole==='tab').length,3);
});

test('Meet Preceptor Back label is centered at mobile and desktop widths with unchanged button dimensions',async t=>{
 for(const width of [320,390,1280,1440]){const b=mentorHarness({width});t.after(b.h.unmount);await b.open();const back=b.h.find('Back'),style=Object.assign({},...back.props.style.filter(Boolean));assert.equal(style.alignItems,'center');assert.equal(style.justifyContent,'center');assert.equal(style.minHeight,44);assert.equal(style.width,width<720?86:110);assert.equal(style.borderRadius,14);assert.equal(style.backgroundColor,'#F7F6FC');}
});
