const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('../../mobile/node_modules/typescript');
function load(file,options={}) {
 function req(name){
  if(name==='react')return{useState:initial=>[initial,()=>{}]};
  if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
  if(name==='react-native')return {View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',Modal:'Modal',KeyboardAvoidingView:'KeyboardAvoidingView',Platform:{OS:options.platform||'web'},StyleSheet:{create:x=>x},useWindowDimensions:()=>({width:options.width||390,height:options.height||844})};
  if(name==='react-native-safe-area-context')return{useSafeAreaInsets:()=>({top:options.top||0,bottom:options.bottom||0,left:0,right:0})};
  if(name==='expo-font')return{useFonts:()=>[true]};
  if(name==='expo-image')return{Image:'Image'};
  if(name==='@expo/vector-icons')return{Ionicons:'Icon'};
  if(name.endsWith('MentorAvatar'))return{MentorAvatar:'MentorAvatar'};
  if(name.endsWith('ClinicalsChatComposer'))return{ClinicalsChatComposer:'Composer'};
  if(name.endsWith('case.styles'))return{caseStyles:{}};
  if(name.endsWith('.ttf'))return 1;
  const resolved=path.resolve(path.dirname(file),name);return load(fs.existsSync(resolved+'.tsx')?resolved+'.tsx':resolved+'.ts',options);
 }
 const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:req,console});return exports;
}
const file=f=>path.resolve(__dirname,'../../mobile/src/components',f);
const performance=load(file('portfolio/performance.ts'));
const encounter=(id,score,date)=>({sessionAttemptId:id,sessionScore:score,scoredAt:date||'2026-10-10T12:00:00Z'});
const normalized=x=>JSON.parse(JSON.stringify(x));
test('performance plots chronological real numeric scores and does not mutate backend history',()=>{
 const input=[encounter('c',83,'2026-10-12'),encounter('a',62,'2026-10-10'),encounter('b',68,'2026-10-11')],snapshot=JSON.stringify(input);
 const result=performance.performanceGeometry(input);assert.deepEqual(normalized(result.points.map(p=>p.score)),[62,68,83]);assert.equal(input[0].sessionAttemptId,'c');assert.equal(JSON.stringify(input),snapshot);assert.equal(result.points.length,3);
});
test('performance rejects missing, coerced, infinite, out-of-range scores and invalid dates; zero is valid',()=>{
 const invalid=[null,undefined,'84','',false,NaN,Infinity,-1,101].map((value,i)=>encounter(String(i),value));
 assert.equal(performance.scoredEncounters(invalid).length,0);
 assert.equal(performance.scoredEncounters([encounter('invalid',80,'invalid'),{...encounter('missing',90),scoredAt:null}]).length,0);
 const result=performance.performanceGeometry([encounter('zero',0),encounter('full',100)]);assert.equal(result.points[0].y,92);assert.ok(Math.abs(result.points[1].y-10)<.0001);assert.equal(result.path.split(' ').length,2);
});
test('performance preserves tied timestamps and spaces many encounters without extra data points',()=>{
 const input=Array.from({length:30},(_,i)=>encounter(String(i),i+20));const result=performance.performanceGeometry(input);assert.equal(result.points.length,30);assert.deepEqual(normalized(result.points.map(p=>p.id)),input.map(p=>p.sessionAttemptId));assert.ok(result.width>1000);assert.ok(result.points.every((p,i)=>i===0||p.x-result.points[i-1].x>=44));
});
function nodes(node,out=[]){if(Array.isArray(node)){node.forEach(n=>nodes(n,out));return out;}if(!node||typeof node!=='object')return out;out.push(node);if(typeof node.type==='function')nodes(node.type(node.props),out);else nodes(node.props?.children,out);return out;}
function text(n){if(n==null||typeof n==='boolean')return'';if(Array.isArray(n))return n.map(text).join(' ');if(typeof n!=='object')return String(n);return typeof n.type==='function'?text(n.type(n.props)):text(n.props?.children);}
test('performance empty state is exact for zero or one valid scored encounter',()=>{
 const {ClinicalPerformance}=load(file('portfolio/ClinicalPerformance.tsx'));
 for(const patients of [[],[encounter('one',70)],[encounter('null',null),encounter('one',70)]]){const root=ClinicalPerformance({patients});assert.equal(root.props.testID,'clinical-performance-empty');assert.equal(text(root),'Complete at least two scored encounters to see how your performance changes over time.');assert.equal(nodes(root).filter(n=>n.type==='Image').length,0);}
});
test('performance chart exposes accurate scores, a fixed scale, chronological sequence and SVG points',()=>{
 const {ClinicalPerformance}=load(file('portfolio/ClinicalPerformance.tsx'));const root=ClinicalPerformance({patients:[encounter('b',91,'2026-10-12'),encounter('a',34,'2026-10-11')]});const image=nodes(root).find(n=>n.type==='Image');const svg=decodeURIComponent(image.props.source.uri.split(',').slice(1).join(','));assert.equal((svg.match(/<circle/g)||[]).length,2);assert.match(image.props.accessibilityLabel,/fixed 0 to 100 percent scale: 1: 34%, 2: 91%/);assert.doesNotMatch(text(root),/#1|#2/);assert.match(svg,/>34%<|>91%</);assert.match(text(root),/Each point = one scored patient encounter/);assert.doesNotMatch(svg,/NaN|undefined/);
});
function fixture(){let current;const events=[];const set=(key)=>value=>{current[key]=typeof value==='function'?value(current[key]):value;};current={debriefVisible:true,continueLearning:()=>events.push('continue'),retryCase:()=>events.push('retry'),debriefMentorSpeech:{isSpeaking:false,stop:async()=>events.push('stop')},voiceEnabled:true,setVoiceEnabled:set('voiceEnabled'),debriefInput:'Question',setDebriefInput:set('debriefInput'),debriefSending:false,sendDebriefMessage:value=>events.push(value||'ask'),conversationId:'learner-A-attempt',debriefTranscription:{toggleRecording:()=>events.push('mic'),transcribing:false,recordingBusy:false,isRecording:false},learnerDebriefMessage:'Backend coaching for the actual scored encounter.',debriefMessages:[{role:'user',content:'Saved learner question'},{role:'assistant',content:'Saved mentor reply'}],DEBRIEF_QUICK_ACTIONS:['What should I focus on?','Explain my score'],debriefError:null,visibleDebrief:{sessionScore:81},reviewBadgeVisual:{style:{}},reviewBadgeLabel:'Silver',reviewAchievementResults:[{}],improvementObjectiveText:'Clarify symptom duration',setOpenLearningDetail:set('openLearningDetail'),openLearningDetail:null,scoreDetailText:'Backend score explanation',patientSummaryText:'Actual patient HPI',setShowDetailedRubric:set('showDetailedRubric'),submissionResult:{earned_points:8,available_points:10},detailedRubricItems:[{id:'intro',label:'Introduction',status:'achieved',section:'History',earned_points:2,points:2,rationale:'Introduced role',evidence:['Transcript evidence']}],statusColor:()=> '#6150ED',statusLabel:status=>status};return{props:current,events};}
function render(options={},f=fixture()){const {ClinicalDebrief}=load(file('ClinicalDebrief.tsx'),options);const root=ClinicalDebrief(f.props);return {...f,root,nodes:()=>nodes(root),find:label=>nodes(root).find(n=>n.type==='Pressable'&&(text(n).includes(label)||n.props.accessibilityLabel===label))};}
test('Debrief preserves backend coaching, saved messages, score, badge, suggestions and controlled input',()=>{
 const h=render();assert.match(text(h.root),/Backend coaching/);assert.match(text(h.root),/Saved learner question/);assert.match(text(h.root),/Saved mentor reply/);assert.match(text(h.root),/81 %/);assert.match(text(h.root),/Silver/);h.find('What should').props.onPress();const composer=h.nodes().find(n=>n.type==='Composer');composer.props.onSubmit();composer.props.onMicPress();composer.props.onChangeText('Edited question');assert.deepEqual(h.events,['What should I focus on?','ask','mic']);assert.equal(h.props.debriefInput,'Edited question');
});
test('Debrief keeps retry, close, Android Back and continue on existing owner callbacks',()=>{
 const h=render({platform:'android'});h.find('Retry Encounter').props.onPress();h.find('Continue Learning').props.onPress();h.find('Close Clinical Debrief').props.onPress();h.nodes().find(n=>n.type==='Modal').props.onRequestClose();assert.deepEqual(h.events,['retry','continue','continue','continue']);
});
test('Debrief voice and loading/error states preserve ownership, cancellation and send guards',async()=>{
 const f=fixture();let h=render({},f);await h.find('Voice: On').props.onPress();assert.equal(f.props.voiceEnabled,false);assert.deepEqual(f.events,['stop']);f.props.debriefSending=true;f.props.debriefError='Retry after connection error';f.props.conversationId=null;h=render({},f);assert.match(text(h.root),/responding/);assert.match(text(h.root),/Retry after connection error/);assert.equal(h.find('Explain my score').props.disabled,true);const composer=h.nodes().find(n=>n.type==='Composer');assert.equal(composer.props.sendDisabled,true);assert.equal(composer.props.micDisabled,true);
});
test('Debrief score explanations, HPI and detailed rubric remain accessible through disclosures',()=>{
 const f=fixture();let h=render({},f);h.find('Why did').props.onPress();h=render({},f);assert.match(text(h.root),/Backend score explanation/);h.find('Patient Summary').props.onPress();h=render({},f);assert.match(text(h.root),/Actual patient HPI/);h.find('Show Detailed').props.onPress();h=render({},f);assert.match(text(h.root),/Transcript evidence/);assert.match(text(h.root),/Rubric points:\s+8\s+\/\s+10/);
});
for(const [width,height] of [[320,568],[390,844],[390,875],[1280,900],[1440,900],[1280,600]])test(`Debrief ${width}x${height} keeps its composer and navigation outside scrollable conversation`,()=>{
 const h=render({width,height});const history=h.nodes().find(n=>n.props?.testID==='debrief-history'),footer=h.nodes().find(n=>n.props?.testID==='debrief-footer');assert.ok(history);assert.ok(footer);assert.equal(nodes(history).some(n=>n.type==='Composer'),false);assert.equal(nodes(footer).some(n=>n.type==='Composer'),true);assert.equal(h.find('Close Clinical Debrief').props.style.width,44);const sheet=h.nodes().find(n=>n.props?.testID==='clinical-debrief');assert.equal(sheet.props.style[0].maxWidth,736);assert.equal(history.props.keyboardShouldPersistTaps,'handled');
});
test('Debrief native safe areas and keyboard avoidance are enabled without a web keyboard offset',()=>{
 for(const platform of ['ios','android','web']){const h=render({platform,top:47,bottom:34});const wrap=h.nodes().find(n=>n.type==='KeyboardAvoidingView');assert.equal(wrap.props.enabled,platform!=='web');assert.equal(wrap.props.style[1].paddingTop,47);assert.equal(wrap.props.style[1].paddingBottom,34);}
});

test('performance uses measured chart width on desktop without changing scores or fixed vertical scale',()=>{const input=[encounter('a',0),encounter('b',100)];const result=performance.performanceGeometry(input,662);assert.equal(result.width,662);assert.equal(result.points[0].y,92);assert.ok(Math.abs(result.points[1].y-10)<.0001);assert.equal(result.points[1].x,630);});
