const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const ts=require("../../mobile/node_modules/typescript");
function harness(platform="web"){
  let slots=[],cursor=0,effects=[],userId="A",options={scopeKey:"activity1",enabled:true},hook;
  const texts=[],errors=[],streams=[],recorders=[],requests=[],native=[];
  let permission=async()=>stream();
  function stream(){const s={stops:0,getTracks(){return[{stop:()=>s.stops++}];}};streams.push(s);return s;}
  class Recorder{constructor(s){this.stream=s;this.state="inactive";recorders.push(this);}start(){this.state="recording";}stop(){this.state="inactive";this.ondataavailable?.({data:new Blob(["synthetic"])});this.onstop?.();}}
  class NativeRecording{constructor(){this.stops=0;native.push(this);}async prepareToRecordAsync(){}async startAsync(){}async stopAndUnloadAsync(){this.stops++;}getURI(){return"/synthetic/audio.m4a";}}
  const react={useRef:value=>{const i=cursor++;return slots[i]||=( {current:value});},useState:value=>{const i=cursor++;if(!(i in slots))slots[i]=value;return[slots[i],next=>{slots[i]=next;}];},useCallback:fn=>fn,useEffect:(fn,deps)=>{const i=cursor++;const prev=slots[i];if(!prev||!deps.every((d,j)=>Object.is(d,prev.deps[j])))effects.push(()=>{prev?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
  const exports={};
  const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,"../../mobile/src/hooks/useEnglishSpeechTranscription.ts"),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(source,{exports,Blob,btoa,MediaRecorder:Recorder,navigator:{mediaDevices:{getUserMedia:()=>permission()}},require(name){
    if(name==="react")return react;if(name==="react-native")return{Platform:{OS:platform}};if(name==="@clerk/clerk-expo")return{useAuth:()=>({userId})};
    if(name.includes("sessionToken"))return{captureSession:expected=>()=>{if(userId!==expected)throw new Error("Account changed");}};
    if(name==="expo-av")return{Audio:{requestPermissionsAsync:async()=>({granted:true}),setAudioModeAsync:async()=>{},Recording:NativeRecording,RecordingOptionsPresets:{HIGH_QUALITY:{}}}};
    if(name.includes("expo-file-system"))return{EncodingType:{Base64:"base64"},readAsStringAsync:async()=>"c3ludGhldGlj",deleteAsync:async()=>{}};
    if(name.includes("api/client"))return{api:{transcribeVoice:(payload,headers)=>new Promise(resolve=>requests.push({payload,headers,resolve}))}};
    throw new Error(name);
  }});
  function render(next){options={...options,...next};cursor=0;effects=[];hook=exports.useEnglishSpeechTranscription({...options,onText:t=>texts.push(t),onError:e=>errors.push(e)});for(const effect of effects)effect();return hook;}
  function unmount(){for(const slot of slots)slot?.cleanup?.();}
  return{render,unmount,texts,errors,streams,recorders,requests,native,setPermission:fn=>{permission=fn;},makeStream:stream,setUser:id=>{userId=id;},get hook(){return hook;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test("late microphone permission after activity change or unmount releases stream and cannot start recording",async()=>{
  for(const action of ["switch","unmount"]){const h=harness();h.render();let release;h.setPermission(()=>new Promise(resolve=>{release=()=>resolve(h.makeStream());}));const start=h.hook.startRecording();
    if(action==="switch")h.render({scopeKey:"activity2"});else h.unmount();release();await start;
    assert.equal(h.recorders.length,0);assert.equal(h.streams[0].stops,1);assert.equal(h.errors.length,0);h.unmount();}
});
test("web microphone and transcription work normally with the authenticated learner context",async()=>{
  const h=harness();h.render();await h.hook.startRecording();h.render();const done=h.hook.stopRecordingAndTranscribe();await tick();
  assert.equal(h.requests.length,1);assert.equal(h.requests[0].payload.language,"en");assert.equal(h.requests[0].headers.expectedUserId,"A");h.requests[0].resolve({text:"What brings you in today?"});await done;
  assert.deepEqual(h.texts,["What brings you in today?"]);assert.equal(h.streams[0].stops,1);h.unmount();
});
test("transcription arriving after activity/navigation/account transition never enters another answer",async()=>{
  for(const action of ["activity","leave","account"]){const h=harness();h.render();await h.hook.startRecording();h.render();const done=h.hook.stopRecordingAndTranscribe();await tick();
    if(action==="activity")h.render({scopeKey:"activity2"});if(action==="leave")h.render({enabled:false});if(action==="account"){h.setUser("B");h.render();}
    h.requests[0].resolve({text:"Stale learner response"});await done;assert.equal(h.texts.length,0);assert.equal(h.errors.length,0);h.unmount();}
});
test("native recording/transcription remain functional and activity cancellation unloads captured recording",async()=>{
  const h=harness("ios");h.render();await h.hook.startRecording();h.render();const done=h.hook.stopRecordingAndTranscribe();await tick();assert.equal(h.requests.length,1);h.requests[0].resolve({text:"Synthetic native response"});await done;assert.equal(h.texts[0],"Synthetic native response");
  h.render();await h.hook.startRecording();h.render({scopeKey:"activity2"});await tick();assert.ok(h.native[1].stops>=1);h.unmount();
});
