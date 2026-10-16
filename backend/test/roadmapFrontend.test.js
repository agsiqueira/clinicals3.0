const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../../mobile/node_modules/typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,
  '../../mobile/src/components/roadmap/journey.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsObject });
const { buildJourney, isRotationMastered, previousAttemptsRoute } = exportsObject;
const s = (id, status, score, badgeTier) => ({ id, slug:id, title:id, status, bestSessionScore:score, badgeTier });
const unit = sessions => ({ id:'unit', slug:'unit', title:'Actual backend title', sessions });
const journey = units => buildJourney([{ id:'path', title:'Path', units }])[0].rotations;
test('mastery uses unrounded 84% boundary, never vacuous empty completion', () => {
  assert.equal(isRotationMastered(unit([])), false);
  assert.equal(isRotationMastered(unit([s('a','completed',83.99,'SILVER')])), false);
  assert.equal(isRotationMastered(unit([s('a','completed',84,'GOLD')])), true);
  assert.equal(isRotationMastered(unit([s('a','completed',null,'GOLD')])), false);
});
test('backend unlocks survive destination mastery disagreement; input and ordering preserved', () => {
  const units = [unit([s('a','completed',50,'SILVER'),s('b','completed',84,'GOLD')]),
    {...unit([s('c','available',null,null)]),id:'unit2'}];
  const before = JSON.stringify(units);
  const rows = journey(units);
  assert.equal(rows[0].mastered, false);
  assert.equal(rows[1].encounters[0].disabled, false);
  assert.equal(rows[1].encounters[0].current, true);
  assert.equal(rows[1].encounters[0].number, 1);
  assert.equal(rows[1].rotationNumber, 2);
  assert.equal(JSON.stringify(units), before);
});
test('tiers come from badgeTier, NONE and missing scores never invent awards', () => {
  const row = journey([unit(['GOLD','SILVER','BRONZE','NONE',null].map((tier,i)=>s(String(i),'completed',i?null:50,tier)))])[0];
  assert.equal(JSON.stringify(row.encounters.map(e=>e.medal)), JSON.stringify(['GOLD','SILVER','BRONZE',null,null]));
  assert.equal(row.encounters[1].score, null);
  assert.equal(row.encounters[0].medal,'GOLD'); // Not recalculated from score.
});
test('locked and Module 0 blocked encounters cannot launch, retain historical medal', () => {
  const rows = journey([unit([s('a','locked',null,null),{...s('b','completed',90,'GOLD'),entryBlocked:true}])]);
  for(const e of rows[0].encounters) { assert.equal(e.disabled,true); assert.equal(e.action,null); assert.ok(e.prerequisite); }
  assert.equal(rows[0].encounters[1].medal,'GOLD');
});
test('retry crosses rotations; fully completed paths preserve repeat practice', () => {
  const rows = journey([unit([s('a','completed',83.99,'SILVER')]),{...unit([s('b','locked',null,null)]),id:'two'}]);
  assert.equal(rows[0].encounters[0].action,'Retry');
  assert.equal(journey([unit([s('a','completed',84,'GOLD')])])[0].encounters[0].action,'Practice Again');
  assert.equal(buildJourney([]).length,0);
  assert.equal(journey([unit([])])[0].encounters.length,0);
});
test('previous attempts route is explicitly case-wide and unavailable without a linked case', () => {
  assert.equal(previousAttemptsRoute(null),null);
  const route = previousAttemptsRoute({slug:'session',linkedCase:{caseId:'shared-case'}});
  assert.equal(route.pathname,'/attempts');
  assert.equal(JSON.stringify(route.params),JSON.stringify({caseId:'shared-case'}));
});
test('backend recommendation drives current encounter but never bypasses a lock',()=>{
  const paths=[{id:'p',title:'Path',units:[unit([s('a','completed',70,'SILVER'),s('b','available',null,null),s('c','locked',null,null)])]}];
  assert.equal(buildJourney(paths,'a')[0].rotations[0].encounters[0].current,true);
  assert.equal(buildJourney(paths,'c')[0].rotations[0].encounters[1].current,true);
});
test('multiple paths retain API order and encounter numbers restart independently of rotation markers',()=>{
  const paths=[{id:'one',title:'One',units:[unit([s('a','available')])]},
    {id:'two',title:'Two',units:[{...unit([s('b','locked')]),id:'second'}, {...unit([]),id:'empty'}]}];
  const result=buildJourney(paths);
  assert.equal(result[1].rotations[0].rotationNumber,2);
  assert.equal(result[1].rotations[0].encounters[0].number,1);
  assert.equal(result[1].rotations[1].rotationNumber,3);
  assert.equal(result[1].rotations[1].mastered,false);
});
test('artwork follows the actual task and workflow, not the mockup encounter ordinal',()=>{
  const sessions=[{...s('hpi','locked'),title:'Patient: Complete Clinical Encounter',requiresHpi:true},
    {...s('r','locked'),title:'Patient: Clinical Reasoning'},
    {...s('p','locked'),title:'Patient: Presenting to the Preceptor'},
    {...s('unlocked','available'),title:'Patient: Clinical Reasoning'},
    {...s('intro','available'),requiresHpi:false}];
  const rows=journey([unit(sessions)])[0].encounters;
  assert.equal(JSON.stringify(rows.map(e=>e.artwork)),JSON.stringify(['encounter','reasoning','presentation','encounter','introduction']));
});
test('Roadmap imported artwork matches original dimensions and SHA-256; SVGs retain intrinsic geometry',()=>{
  const path=require('node:path'),crypto=require('node:crypto');
  const root=path.resolve(__dirname,'../../mobile/assets/roadmap');
  const inventory=JSON.parse(fs.readFileSync(path.join(root,'provenance.json'),'utf8'));
  assert.equal(inventory.assets.length,13);
  for(const asset of inventory.assets){
    const bytes=fs.readFileSync(path.join(root,asset.file));
    assert.equal(bytes.length,asset.bytes,asset.file);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.file);
    if(asset.file.endsWith('.png')){
      assert.equal(bytes.readUInt32BE(16),asset.width,asset.file);assert.equal(bytes.readUInt32BE(20),asset.height,asset.file);
      assert.ok(asset.width>32 && asset.height>32,'Reject transparent Figma placeholder assets');
    }else{assert.match(bytes.toString(),/width="[\d.]+" height="[\d.]+" viewBox=/);}
  }
});
test('iOS and Android presentation exposes no launch action on locked nodes and preserves available callbacks',()=>{
  const path=require('node:path');
  for(const platform of ['ios','android']){
    const jsx=(type,props)=>({type,props});
    const react={useState:value=>[value,()=>{}]};
    let launched;
    function compile(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../../mobile',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:requireFn});return exports;}
    function requireFn(name){
      if(name==='react')return react;
      if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
      if(name==='react-native')return {Animated:{View:'AnimatedView'},Platform:{OS:platform},Pressable:'Pressable',View:'View',Text:'Text',useWindowDimensions:()=>({width:320}),StyleSheet:{create:s=>s,absoluteFill:{}}};
      if(name==='expo-image')return {Image:'Image'};
      if(name==='expo-font')return {useFonts:()=>[true]};
      if(name.includes('ProgressHeader'))return {ProgressHeader:'ProgressHeader'};
      if(name.includes('AccountSettingsButton'))return {AccountSettingsButton:'AccountSettingsButton'};
      if(name==='expo-router')return {useRouter:()=>({push(){}})};
      if(name==='./JourneyConnections')return {JourneyStage:props=>jsx('View',props),JourneyObstacle:props=>jsx('View',props),JourneyChain:props=>jsx('View',props)};
      if(name==='./journey')return exportsObject;
      if(name==='./assets')return {roadmapAssets:new Proxy({}, {get:(_,key)=>key})};
      if(name.includes('clinicalDisplay'))return compile('src/utils/clinicalDisplay.ts');
      if(name.includes('Module0Card'))return {Module0Card:'Module0Card'};
      if(name.includes('CompactJourneyCard'))return {CompactJourneyCard:'JourneyCard'};
      if(name.endsWith('.ttf'))return 1;
      throw new Error(name);
    }
    const {RoadmapJourney}=compile('src/components/roadmap/RoadmapJourney.tsx');
    const available={...s('a','available'),objective:'CLINICAL_OBJECTIVE_SENTINEL '.repeat(120),description:'DESCRIPTION_SENTINEL'},locked=s('b','locked');
    const medalSessions=['GOLD','SILVER','BRONZE','NONE'].map((tier,i)=>s('medal-'+i,'completed',90,tier));
    const root=RoadmapJourney({paths:[{id:'p',title:'Path',description:'PATH_DESCRIPTION_SENTINEL',units:[{...unit([available,locked,...medalSessions,{...s('latest','available'),latestSessionScore:47}]),objective:'ROTATION_OBJECTIVE_SENTINEL'}]}],onSessionPress:x=>{launched=x;}});
    function nodes(node,result=[]){if(Array.isArray(node)){node.forEach(n=>nodes(n,result));return result;}if(!node||typeof node!=='object')return result;if(typeof node.type==='function')return nodes(node.type(node.props),result);result.push(node);nodes(node.props?.children,result);return result;}
    const allNodes=nodes(root);
    const text=allNodes.filter(n=>n.type==='Text').flatMap(n=>n.props.children??[]).filter(x=>typeof x==='string'||typeof x==='number').join(' ');
    assert.doesNotMatch(text,/OBJECTIVE_SENTINEL|DESCRIPTION_SENTINEL|Latest score|47/);
    assert.equal(available.objective,'CLINICAL_OBJECTIVE_SENTINEL '.repeat(120));
    assert.match(text,/84% required on previous encounter/);
    const rows=allNodes.filter(n=>n.props?.testID?.startsWith('encounter-'));
    assert.equal(nodes(rows[1]).filter(n=>n.type==='Pressable').length,0,platform);
    const action=nodes(rows[0]).find(n=>n.type==='Pressable');assert.ok(action,platform);action.props.onPress();assert.equal(launched,available);
    for(const [index,tier] of ['gold','silver','bronze'].entries()){
      const medal=nodes(rows[index+2]).find(n=>n.props?.accessibilityLabel===tier+' medal');assert.ok(medal,platform);
      assert.equal(nodes(medal).find(n=>n.type==='Image').props.source,tier,platform);
    }
    assert.equal(nodes(rows[5]).some(n=>n.props?.accessibilityLabel?.endsWith(' medal')),false,platform);
    const completedAction=nodes(rows[2]).find(n=>n.type==='Pressable');completedAction.props.onPress();assert.equal(launched,medalSessions[0]);
    const retrySession=s('retry','completed',70,'SILVER');
    const retryRoot=RoadmapJourney({paths:[{id:'retry-path',title:'Path',units:[unit([retrySession,locked])]}],onSessionPress:x=>{launched=x;}});
    const retryText=nodes(retryRoot).filter(n=>n.type==='Text').flatMap(n=>n.props.children??[]).filter(x=>typeof x==='string'||typeof x==='number').join(' ');assert.match(retryText,/Retry to progress/);
    const blockedRoot=RoadmapJourney({paths:[{id:'blocked-path',title:'Path',units:[unit([{...available,entryBlocked:true}])]}],onSessionPress:x=>{launched=x;}});
    const blockedNodes=nodes(blockedRoot);assert.equal(blockedNodes.filter(n=>n.type==='Pressable').length,0);assert.match(blockedNodes.filter(n=>n.type==='Text').flatMap(n=>n.props.children??[]).join(' '),/Complete Module 0 first/);
  }
});

test('Roadmap fixed header precedes status in scroll flow and keeps the measured canvas separate',()=>{
 const path=require('node:path'),screen=fs.readFileSync(path.resolve(__dirname,'../../mobile/app/(tabs)/cases.tsx'),'utf8');
 assert.ok(screen.indexOf('<RoadmapHeader identity={journeySummary?.identity} />')<screen.indexOf('<ScrollView style='));
 assert.doesNotMatch(screen,/LearnerStatusCard/);
 assert.match(screen,/identity=\{journeySummary\?\.identity\}/);
});
test('Roadmap header uses only the shared settings gear with no streak disclosure',()=>{
 const source=fs.readFileSync(require('node:path').resolve(__dirname,'../../mobile/src/components/roadmap/RoadmapJourney.tsx'),'utf8');
 const header=source.slice(source.indexOf('export function RoadmapHeader'),source.indexOf('/** Roadmap-only'));
 assert.match(header,/<ProgressHeader title="Roadmap" identity=\{identity\}/);assert.doesNotMatch(header,/streak|Modal|CompactJourneyCard|Close level/);
});

const connectionGeometry={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').resolve(__dirname,'../../mobile/src/components/roadmap/connections.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:connectionGeometry});
test('measured connectors join every adjacent milestone without bridging independent paths or missing stages',()=>{
 const boxes={};const groups=[['foundation','rotation1','one','two','destination1','rotation2','three','destination2'],['independent','last']];
 groups.flat().forEach((id,i)=>{boxes[id]={x:20,y:i*360,width:140,height:180};});
 const edges=connectionGeometry.connectMilestones(groups,boxes,280);
 assert.equal(edges.length,8);
 assert.equal(JSON.stringify(edges.map(e=>[e.from,e.to])),JSON.stringify(groups.flatMap(g=>g.slice(1).map((id,i)=>[g[i],id]))));
 for(const edge of edges){assert.equal(edge.start.y,boxes[edge.from].y+90);assert.equal(edge.end.y,boxes[edge.to].y+90);assert.equal(edge.height,edge.end.y-edge.start.y);assert.match(decodeURIComponent(edge.uri),/stroke="#C9C3F0".*stroke-linecap="round" stroke-dasharray="9 11"/);}
 delete boxes.two;const missing=connectionGeometry.connectMilestones(groups,boxes,280);assert.ok(!missing.some(e=>e.from==='one'&&e.to==='destination1'));
});
test('curves remeasure long content and resizing without stretching stroke or dash dimensions',()=>{
 const original={a:{x:0,y:10,width:128,height:161},b:{x:44,y:450,width:68,height:68}};
 const first=connectionGeometry.connectMilestones([['a','b']],original,280)[0];
 const moved={...original,b:{...original.b,y:1250}};
 const long=connectionGeometry.connectMilestones([['a','b']],moved,280)[0];
 assert.equal(long.height-first.height,800);assert.notEqual(long.d,first.d);assert.equal(first.start.x,64);assert.equal(long.end.x,78);
 const wide=connectionGeometry.connectMilestones([['a','b']],{...moved,a:{...moved.a,width:210}},560)[0];assert.equal(wide.start.x,105);
 assert.match(decodeURIComponent(wide.uri),/width="560"/);assert.match(decodeURIComponent(wide.uri),/stroke-width="5.5"/);
 assert.equal(connectionGeometry.connectMilestones([['a','b']],original,0).length,0);
 assert.equal(connectionGeometry.connectMilestones([['b','a']],original,280).length,0);
});

test('native connection layer remeasures layout changes and removes unmounted milestones',()=>{
 const path=require('node:path');
 for(const platform of ['ios','android']){
  const state=[],refs=[];let si=0,ri=0;
  const jsx=(type,props)=>({type,props});
  const react={createContext:()=>({Provider:'Provider'}),useCallback:f=>f,useMemo:f=>f(),useState:initial=>{const i=si++;if(!(i in state))state[i]=initial;return[state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value;}];},useRef:initial=>{const i=ri++;return refs[i]??(refs[i]={current:initial});}};
  const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../../mobile/src/components/roadmap/JourneyConnections.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='react-native'?{View:'View',Platform:{OS:platform}}:name==='expo-image'?{Image:'Image'}:name==='./connections'?connectionGeometry:{}});
  const render=()=>{si=ri=0;return exports.JourneyCanvas({children:'foreground',scenery:'Scenery',foundation:false});};
  let tree=render();tree.props.children.props.ref.current={};
  tree.props.children.props.onLayout({nativeEvent:{layout:{width:280}}});
  const context=tree.props.value;context.setGroup('p',['a','b']);
  let y=400;context.register('a',{current:{measureLayout:(_,done)=>done(0,0,140,180)}},false);
  const unmount=context.register('b',{current:{measureLayout:(_,done)=>done(44,y,68,68)}},false);
  tree=render();const edges=tree.props.children.props.children[0];assert.equal(edges.length,1,platform);assert.equal(edges[0].props.pointerEvents,'none');assert.equal(edges[0].props.accessible,false);
  context.register('terrain',{current:{measureLayout:(_,done)=>done(0,900,280,300)}},true);tree=render();
  assert.equal(tree.props.children.props.children[0][0].type,'Image');assert.equal(tree.props.children.props.children[1][0].props.children.type,'Scenery');assert.equal(tree.props.children.props.children[2],'foreground');
  const height=edges[0].props.style.height;y=1200;context.refresh();tree=render();assert.equal(tree.props.children.props.children[0][0].props.style.height-height,800,platform);
  unmount();tree=render();assert.equal(tree.props.children.props.children[0].length,0,platform);
 }
});

test('broad background curves alternate with two arcs and smooth stage tangents',()=>{
 const boxes={a:{x:0,y:0,width:180,height:180},b:{x:0,y:360,width:180,height:180},c:{x:0,y:720,width:180,height:180}};
 const edges=connectionGeometry.connectMilestones([['a','b','c']],boxes,350);
 assert.ok(edges[0].middle.x-edges[0].start.x>40);assert.ok(edges[1].start.x-edges[1].middle.x>40);
 for(const edge of edges){const n=edge.d.match(/-?\d+(?:\.\d+)?/g).map(Number);assert.equal((edge.d.match(/ C /g)||[]).length,2);assert.equal(n[0],n[2]);assert.equal(n[6],n[8]);assert.equal(n[12],n[10]);assert.doesNotMatch(edge.d,/NaN|Infinity/);}
});
test('long measured gaps keep two broad arcs without obstacle tracking or oscillation',()=>{
 const boxes={a:{x:0,y:0,width:180,height:180},b:{x:0,y:1300,width:180,height:180}};
 const edge=connectionGeometry.connectMilestones([['a','b']],boxes,350)[0];
 assert.equal((edge.d.match(/ C /g)||[]).length,2);assert.ok(edge.middle.x-edge.start.x>40);
 const source=fs.readFileSync(require('node:path').resolve(__dirname,'../../mobile/src/components/roadmap/JourneyConnections.tsx'),'utf8');assert.doesNotMatch(source,/JourneyObstacle|setObstacles|insetLeft|useId/);
});
