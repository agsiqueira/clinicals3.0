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
      if(name==='expo-router')return {useRouter:()=>({push(){}})};
      if(name==='./journey')return exportsObject;
      if(name==='./assets')return {roadmapAssets:new Proxy({}, {get:(_,key)=>key})};
      if(name.includes('clinicalDisplay'))return compile('src/utils/clinicalDisplay.ts');
      if(name.includes('Module0Card'))return {Module0Card:'Module0Card'};
      if(name.includes('CompactJourneyCard'))return {CompactJourneyCard:'JourneyCard'};
      if(name.endsWith('.ttf'))return 1;
      throw new Error(name);
    }
    const {RoadmapJourney}=compile('src/components/roadmap/RoadmapJourney.tsx');
    const available=s('a','available'),locked=s('b','locked');
    const medalSessions=['GOLD','SILVER','BRONZE','NONE'].map((tier,i)=>s('medal-'+i,'completed',90,tier));
    const root=RoadmapJourney({paths:[{id:'p',title:'Path',units:[unit([available,locked,...medalSessions])]}],onSessionPress:x=>{launched=x;}});
    function nodes(node,result=[]){if(Array.isArray(node)){node.forEach(n=>nodes(n,result));return result;}if(!node||typeof node!=='object')return result;if(typeof node.type==='function')return nodes(node.type(node.props),result);result.push(node);nodes(node.props?.children,result);return result;}
    const rows=nodes(root).filter(n=>n.props?.testID?.startsWith('encounter-'));
    assert.equal(nodes(rows[1]).filter(n=>n.type==='Pressable').length,0,platform);
    const action=nodes(rows[0]).find(n=>n.type==='Pressable');assert.ok(action,platform);action.props.onPress();assert.equal(launched,available);
    for(const [index,tier] of ['gold','silver','bronze'].entries()){
      const medal=nodes(rows[index+2]).find(n=>n.props?.accessibilityLabel===tier+' medal');assert.ok(medal,platform);
      assert.equal(nodes(medal).find(n=>n.type==='Image').props.source,tier,platform);
    }
    assert.equal(nodes(rows[5]).some(n=>n.props?.accessibilityLabel?.endsWith(' medal')),false,platform);
  }
});
