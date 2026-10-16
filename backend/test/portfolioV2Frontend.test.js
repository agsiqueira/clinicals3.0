const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../mobile/node_modules/typescript');
const root = path.resolve(__dirname, '../../mobile');
function harness(file, options = {}) {
  let slots = [], cursor = 0, owner = {userId:'learner-A',sessionId:'session-A'};
  const jsx=(type,props,key)=>({type,props:props||{},key});
  const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];}};
  const cache = new Map();
  function compile(absolute){
    if(cache.has(absolute))return cache.get(absolute);
    const exports={};cache.set(absolute,exports);
    function req(name){
      if(name==='react')return react;
      if(name==='react/jsx-runtime')return{jsx,jsxs:jsx,Fragment:'Fragment'};
      if(name==='react-native')return{View:'View',Text:'Text',Image:'NativeImage',Pressable:'Pressable',ScrollView:'ScrollView',ActivityIndicator:'ActivityIndicator',RefreshControl:'RefreshControl',StyleSheet:{create:x=>x},useWindowDimensions:()=>({width:options.width||390,height:options.height||844})};
      if(name==='expo-image')return{Image:'Image'};
      if(name==='@expo/vector-icons')return{Ionicons:'Icon'};
      if(name==='expo-font')return{useFonts:()=>[true]};
      if(name==='@clerk/clerk-expo')return{useAuth:()=>owner,useUser:()=>({isLoaded:true,user:{id:owner.userId}})};
      if(name==='react-native-safe-area-context')return{SafeAreaView:'SafeAreaView'};
      if(name==='@react-navigation/native')return{useFocusEffect:()=>{}};
      if(name.includes('api/client'))return{api:{}};
      if(name.includes('AccountSettingsButton'))return{AccountSettingsButton:'Settings'};
      if(name.includes('CompetencyProfileTab'))return{CompetencyProfileTab:'Competencies'};
      if(/\.(png|webp|svg|ttf|mp4)$/.test(name))return name;
      const candidate=path.resolve(path.dirname(absolute),name);
      const resolved=[candidate,candidate+'.tsx',candidate+'.ts',candidate+'.js'].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
      if(!resolved)throw Error('Unmocked '+name);
      return compile(resolved);
    }
    const code=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
    vm.runInNewContext(code,{exports,require:req,__DEV__:false,console});return exports;
  }
  const module=compile(path.join(root,file));
  return {module,render(name,props){cursor=0;return module[name](props);},setOwner(value){owner=value;}};
}
function nodes(node,result=[]){if(Array.isArray(node)){node.forEach(n=>nodes(n,result));return result;}if(!node||typeof node!=='object')return result;result.push(node);if(typeof node.type==='function')nodes(node.type(node.props),result);else nodes(node.props?.children,result);return result;}
function text(node){if(node==null||typeof node==='boolean')return'';if(Array.isArray(node))return node.map(text).join(' ');if(typeof node!=='object')return String(node);return typeof node.type==='function'?text(node.type(node.props)):text(node.props?.children);}
const source='src/components/portfolio/IllustratedPortfolio.tsx';
const model=harness('src/components/portfolio/gallery.ts').module;
const milestone=(slug,status,title=slug)=>({slug,title,status,category:'milestone',description:'Backend description for '+slug,currentValue:2,targetValue:4,earnedAt:status==='EARNED'?'2026-10-10T12:00:00Z':null});
function galleryProps(items){return{milestones:items,renderDetail:m=>({type:'Detail',props:{children:`${m.title}: ${m.description}, ${m.currentValue}/${m.targetValue}, ${m.earnedAt||''}`}})};}
function press(root,label){const node=nodes(root).find(n=>n.type==='Pressable'&&(n.props.accessibilityLabel?.includes(label)||text(n).includes(label)));assert.ok(node,'button '+label);node.props.onPress();return node;}

test('V2 hero uses supplied learner identity, XP, backend path progress and singular streak',()=>{
 const h=harness(source),props={identity:{levelTitle:'Backend Professional Title',professionalLevel:4,xp:321},path:{pathTitle:'Backend Learning Path',completedSessions:5,totalSessions:12},streak:1,progress:{type:'BackendProgress',props:{value:42}}};const r=h.render('LearnerStoryHero',props),t=text(r);
 assert.match(t,/Backend Professional Title/);assert.match(t,/Level\s+4\s+·\s+321\s+XP/);assert.match(t,/5 of 12 encounters completed/);assert.match(t,/1 day/);assert.doesNotMatch(t,/1 days/);assert.equal(nodes(r).find(n=>n.type==='BackendProgress').props.value,42);assert.ok(nodes(r).find(n=>n.props.source===h.module.portfolioArtwork.hero));
});
test('V2 hero preserves zero and handles unavailable data without manufactured progress',()=>{
 const h=harness(source);let r=h.render('LearnerStoryHero',{identity:{professionalLevel:1,xp:0},streak:0,path:{completedSessions:0,totalSessions:4},progress:null});assert.match(text(r),/0\s+XP/);assert.match(text(r),/0 days/);assert.match(text(r),/0 of 4/);
 r=h.render('LearnerStoryHero',{identity:{},path:undefined,streak:null,progress:null});assert.match(text(r),/Level\s+—\s+·\s+—\s+XP/);assert.match(text(r),/Streak unavailable/);assert.match(text(r),/Progress unavailable/);assert.doesNotMatch(text(r),/140|Emerging Interviewer|7 days|undefined|NaN/);
});
test('achievement states are exclusively backend-defined, including unknown/missing state',()=>{
 assert.equal(model.achievementState('EARNED').earned,true);assert.equal(model.achievementState('IN_PROGRESS').label,'In progress');
 for(const status of ['LOCKED','unknown',null,undefined,'earned'])assert.equal(model.achievementState(status).locked,true);
 const h=harness(source),items=[milestone('earned','EARNED'),milestone('progress','IN_PROGRESS'),{...milestone('locked','LOCKED'),currentValue:100,targetValue:1,earnedAt:'2026-10-10'}];const r=h.render('AchievementGallery',galleryProps(items));
 assert.ok(nodes(r).find(n=>n.props.accessibilityLabel==='earned, Earned'));assert.ok(nodes(r).find(n=>n.props.accessibilityLabel==='progress, In progress'));assert.ok(nodes(r).find(n=>n.props.accessibilityLabel==='locked, Locked'));assert.equal(nodes(r).filter(n=>n.type==='Icon'&&n.props.name==='lock-closed-outline').length,1);
});
test('achievement gallery supports fewer/more records, detail disclosure, collapse and true earned date',()=>{
 const h=harness(source),items=[milestone('first','EARNED'),milestone('second','IN_PROGRESS'),milestone('third','LOCKED'),milestone('fourth','LOCKED'),milestone('fifth','LOCKED')],props=galleryProps(items);
 let r=h.render('AchievementGallery',props);assert.equal(nodes(r).filter(n=>n.props.testID?.startsWith('portfolio-badge-')&&n.type==='Pressable').length,3);press(r,'View all 5 milestones');r=h.render('AchievementGallery',props);assert.equal(nodes(r).filter(n=>n.type==='Pressable'&&n.props.testID?.startsWith('portfolio-badge-')).length,5);press(r,'first, Earned');r=h.render('AchievementGallery',props);assert.match(text(r),/Backend description for first/);assert.match(text(r),/2\/4/);assert.match(text(r),/2026-10-10/);press(r,'Show fewer');r=h.render('AchievementGallery',props);assert.equal(nodes(r).filter(n=>n.type==='Detail').length,0);
 const one=harness(source).render('AchievementGallery',galleryProps([milestone('one','EARNED')]));assert.equal(nodes(one).filter(n=>n.type==='Pressable').length,1);
});
test('achievement and patient empty states do not fabricate any earned badge or encounter',()=>{
 const h=harness(source);const r=h.render('AchievementGallery',galleryProps([]));assert.match(text(r),/Milestones will appear/);assert.equal(nodes(r).filter(n=>n.type==='Pressable').length,0);
 const p=h.render('EncounterGallery',{patients:[],expanded:false,onViewAll(){throw Error('not available');}});assert.match(text(p),/Completed patient encounters will appear/);assert.equal(nodes(p).filter(n=>n.type==='Image'||n.type==='Pressable').length,0);
});
test('patient preview renders actual identity, task, badge, score and date, with working history control',()=>{
 const h=harness(source);let clicked=0;const patient={sessionAttemptId:'attempt-for-A',patientSessionTitle:'Real Backend Name: Focused History',sessionScore:0,badgeTier:'SILVER',scoredAt:'2026-10-15T12:00:00Z'};
 const r=h.render('EncounterGallery',{patients:[patient,{...patient,sessionAttemptId:'other'}],expanded:false,onViewAll:()=>clicked++});const t=text(r);assert.match(t,/Real Backend Name/);assert.match(t,/Focused History/);assert.match(t,/Silver · 0%/);assert.match(t,/Oct 15/);press(r,'View all completed encounters');assert.equal(clicked,1);assert.ok(nodes(r).find(n=>n.props.source===h.module.portfolioArtwork.encounter));
});
test('patient metadata handles incomplete, invalid and no-badge records without invented values',()=>{
 for(const sessionScore of [null,undefined,NaN,Infinity,-1,101,'90']){const p=model.encounterMetadata({sessionAttemptId:'missing',sessionScore,scoredAt:'invalid'});assert.match(p.result,/Score unavailable/);assert.equal(p.medal,null);assert.doesNotMatch(p.result,/Invalid Date|undefined|NaN|Gold/);}
 assert.match(model.encounterMetadata({sessionAttemptId:'none',badgeTier:'NONE',sessionScore:84}).result,/No badge · 84%/);assert.equal(model.encounterMetadata({sessionAttemptId:'missing'}).name,'Patient encounter');assert.equal(model.encounterMetadata({sessionAttemptId:'fallback',caseTitle:'Existing case title'}).name,'Existing case title');
});
test('full-history portrait component retains case images and falls back to real initials when absent',()=>{
 const h=harness('src/components/PatientAvatar.tsx');const known=h.render('PatientAvatar',{caseId:'uti_level1',patientName:'Existing Learner Patient'});assert.ok(nodes(known).find(n=>n.type==='NativeImage'&&n.props.source.includes('uti_level1')));
 const missing=h.render('PatientAvatar',{caseId:'unknown',patientName:'Morgan Chen'});assert.equal(nodes(missing).filter(n=>n.type==='NativeImage').length,0);assert.match(text(missing),/MC/);
});
test('presentation owner changes React key for account and same-account session switches',()=>{
 const h=harness('app/(tabs)/portfolio.tsx');const a=h.render('default');h.setOwner({userId:'learner-B',sessionId:'session-B'});const b=h.render('default');assert.notEqual(a.key,b.key);assert.equal(a.type,b.type);h.setOwner({userId:'learner-B',sessionId:'new-session-B'});assert.notEqual(b.key,h.render('default').key);
});
for(const width of [320,390,1280,1440,1920])test(`V2 ${width}px uses responsive columns and retains entire long titles in natural flow`,()=>{
 const h=harness(source,{width});const title='Advanced Professional Clinical Communication and Patient Partnership '.repeat(4),props={identity:{levelTitle:title,professionalLevel:12,xp:1234567},streak:12345,path:{pathTitle:'Long Backend Clinical Learning Path '.repeat(3),completedSessions:1234,totalSessions:5678},progress:null};const hero=h.render('LearnerStoryHero',props);assert.ok(text(hero).includes(title));assert.ok(nodes(hero).find(n=>n.props.testID==='portfolio-story-art').props.style[0].width<=132);const heading=nodes(hero).find(n=>n.type==='Text'&&n.props.children===title);assert.ok(heading);assert.equal(heading.props.numberOfLines,undefined);
 const r=h.render('AchievementGallery',galleryProps([milestone('long','EARNED',title)]));const card=nodes(r).find(n=>n.props.testID==='portfolio-badge-long');const cardWidth=(Math.min(width,760)-40)*parseFloat(card.props.style[1].width)/100;const imageWidth=nodes(card).find(n=>n.type==='Image').props.style.width;assert.ok(cardWidth>=imageWidth+16,'art fits inside padded card');assert.ok(text(card).includes(title));
});
test('PR16 clinical performance chart and data ordering implementation are unchanged',()=>{
 const cp=require('node:child_process');for(const f of ['src/components/portfolio/ClinicalPerformance.tsx','src/components/portfolio/performance.ts'])assert.equal(fs.readFileSync(path.join(root,f),'utf8').replaceAll('\r\n','\n'),cp.execFileSync('git',['show','origin/main:mobile/'+f],{cwd:root,encoding:'utf8'}).replaceAll('\r\n','\n'));
});

test('all approved static illustrations use exact local Figma sources without modifying shared artwork',()=>{const crypto=require('node:crypto');const inputs=[['assets/today/a889e.png','8362cc23482c1395f9d1e74b67b87109794c2f41175d4b65b814a702959a2439'],['assets/roadmap/destination.png','f2f3a8af030fcc885acd266fb9e7675e84d3a9cee7b9d86dcd9879260c330963'],['assets/portfolio/introduction.png','1a86ebabb150f34d360338005b94f376b65968a5a95756fc4dd66d7904676955'],['assets/roadmap/encounter.png','abc4738c77745f46393f5635a1d2c455c755933a4fdf230e32aa0e7b2f593f57']];for(const [file,hash]of inputs){const bytes=fs.readFileSync(path.join(root,file));assert.ok(bytes.length>0);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash);}});

test('V2 gives narrow and long professional titles full-width copy without truncation',()=>{
 for(const [width,title,stacked] of [[320,'Emerging Interviewer',true],[390,'Emerging Interviewer',false],[390,'Advanced Professional Clinical Communication and Patient Partnership',true],[1440,'Advanced Professional Clinical Communication and Patient Partnership',true]]){
  const h=harness(source,{width});const r=h.render('LearnerStoryHero',{identity:{levelTitle:title,professionalLevel:4,xp:321},path:{completedSessions:5,totalSessions:12},streak:1,progress:null});
  const row=nodes(r).find(n=>n.props.testID==='portfolio-story-row');assert.equal(Boolean(row.props.style[1]),stacked);
  const copy=nodes(r).find(n=>n.props.testID==='portfolio-story-copy');if(stacked)assert.equal(copy.props.style[1].width,'100%');
  assert.ok(text(r).includes(title));assert.match(text(r),/321/);assert.match(text(r),/5 of 12/);assert.match(text(r),/1 day/);
 }
});
