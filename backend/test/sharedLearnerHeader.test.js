const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('../../mobile/node_modules/typescript');
const root=path.resolve(__dirname,'../../mobile');
function compile(file,requireFn){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:requireFn,requestAnimationFrame:fn=>fn(),document:{addEventListener:(_,fn)=>{compile.escape=fn;},removeEventListener(){}}});return exports;}
const jsx=(type,props)=>({type,props});
function nodes(n,out=[]){if(Array.isArray(n)){n.forEach(x=>nodes(x,out));return out;}if(n&&typeof n==='object'){out.push(n);nodes(n.props?.children,out);}return out;}
function text(n){return nodes(n).filter(n=>n.type==='Text').flatMap(n=>n.props?.children??[]).filter(x=>typeof x==='string'||typeof x==='number').join(' ');}
const model=compile('src/components/learnerStatus.ts',()=>({}));
test('shared learner status uses real rotation, singular/plural streak, level and supplied XP threshold',()=>{
 const identity={professionalLevel:3,xp:160,nextLevelXp:300,streak:{currentCount:1}};const x=model.learnerStatus(identity,'Real Clinical Rotation');
 assert.equal(x.rotation,'Real Clinical Rotation');assert.equal(x.streak,'1 day');assert.equal(x.level,3);assert.equal(x.label,'160 / 300 XP');assert.equal(x.ratio,160/300);
 assert.equal(model.learnerStatus({...identity,streak:{currentCount:0}}).streak,'0 days');assert.equal(model.learnerStatus({...identity,streak:{currentCount:7}}).streak,'7 days');
});
test('shared status handles partial data without invented achievements or thresholds',()=>{
 const x=model.learnerStatus(null,null);assert.equal(x.rotation,'No active rotation');assert.equal(x.streak,'Streak unavailable');assert.equal(x.level,null);assert.equal(x.label,'XP unavailable');assert.equal(x.ratio,null);
 assert.equal(model.learnerStatus({xp:42,nextLevelXp:null}).label,'42 XP');assert.equal(model.learnerStatus({xp:NaN,nextLevelXp:100}).ratio,null);
});
test('Today and Roadmap reuse the same informational status card',()=>{
 assert.match(fs.readFileSync(path.join(root,"src/components/ProgressHeader.tsx"),"utf8"),/<LearnerStatusCard identity=/);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'app/(tabs)/portfolio.tsx'),'utf8'),/LearnerStatusCard/);
 for(const platform of ['ios','android','web']){const component=compile('src/components/LearnerStatusCard.tsx',name=>name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='react-native'?{View:'View',Text:'Text',StyleSheet:{create:x=>x}}:name==='expo-font'?{useFonts:()=>[true]}:name==='@expo/vector-icons'?{MaterialCommunityIcons:'Icon'}:name==='./learnerStatus'?model:{});
 const tree=component.LearnerStatusCard({identity:{professionalLevel:2,xp:140,nextLevelXp:200,streak:{currentCount:7}},});assert.match(text(tree),/7 days Level 2 140 \/ 200 XP/);assert.equal(nodes(tree).some(n=>n.props?.onPress),false,platform);assert.equal(nodes(tree).find(n=>n.props?.accessibilityRole==='progressbar').props.accessibilityValue.now,70);}
});
function menuHarness(platform='web'){
 const states=[],refs=[],deps=[],pending=[];let cursor=0,refCursor=0,effectCursor=0,userId='A',sessionId='session-A',focused=true,focusedElement,measurement,failSignOut=false,profile;
 const calls=[],routes=[];
 const react={useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],value=>{states[i]=value;}];},useRef:initial=>{const i=refCursor++;return refs[i]??(refs[i]={current:initial});},useEffect:(fn,next)=>{const i=effectCursor++;if(!deps[i]||next.some((v,j)=>v!==deps[i][j])){deps[i]=next;pending.push(fn);}}};
 const native={Modal:'Modal',Pressable:'Pressable',Text:'Text',View:'View',Platform:{OS:platform},StyleSheet:{create:x=>x,absoluteFill:{}},useWindowDimensions:()=>({width:320,height:568})};
 const component=compile('src/components/AccountSettingsButton.tsx',name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx,Fragment:'Fragment'}:name==='react-native'?native:name==='@expo/vector-icons'?{MaterialCommunityIcons:'Icon'}:name==='@clerk/clerk-expo'?{useAuth:()=>({userId,sessionId}),useUser:()=>({isLoaded:true,user:profile??{id:userId,fullName:userId+' Display',primaryEmailAddress:{emailAddress:userId+'@example.test'}}}),useClerk:()=>({signOut:async options=>{calls.push(options);if(failSignOut)throw Error('synthetic failure');}})}:name==='expo-router'?{useRouter:()=>({replace:route=>routes.push(route)})}:name==='@react-navigation/native'?{useIsFocused:()=>focused}:{});
 function render(){cursor=refCursor=effectCursor=0;const tree=component.AccountSettingsButton();const all=nodes(tree);const gear=all.find(n=>n.props?.accessibilityLabel==='Account settings');gear.props.ref.current={focus:()=>{focusedElement='gear';},measureInWindow:fn=>{measurement=()=>fn(260,10,44,44);measurement();}};const signOut=all.find(n=>n.type==='Pressable'&&n.props.children?.type==='Text');if(signOut)signOut.props.ref.current={focus:()=>{focusedElement='signout';}};for(const fn of pending.splice(0))fn();return all;}
 const byLabel=(tree,label)=>tree.find(n=>n.props?.accessibilityLabel===label);
 return{render,byLabel,open:()=>{const tree=render();byLabel(tree,'Account settings').props.onPress();return render();},switchUser:id=>{userId=id;sessionId='session-'+id;},blur:()=>{focused=false;},focus:()=>focusedElement,calls,routes,fail:()=>{failSignOut=true;},profile:value=>{profile=value;}};
}
test('all three tabs share one account gear; no settings action is attached to progress',()=>{
 for(const file of ['src/components/ProgressHeader.tsx','app/(tabs)/portfolio.tsx'])assert.match(fs.readFileSync(path.join(root,file),'utf8'),/<AccountSettingsButton \/>/);
 const source=fs.readFileSync(path.join(root,'src/components/AccountSettingsButton.tsx'),'utf8');assert.match(source,/width: 44, height: 44/);assert.doesNotMatch(source,/Close account menu|Close level and XP/);
});
test('gear opens actual account menu and web focus returns after Escape/outside dismissal',()=>{
 const h=menuHarness();let tree=h.open();let modal=tree.find(n=>n.type==='Modal');assert.equal(modal.props.visible,true);assert.match(text(tree),/A Display/);modal.props.onShow();assert.equal(h.focus(),'signout');compile.escape({key:'Escape',preventDefault(){}});tree=h.render();assert.equal(tree.find(n=>n.type==='Modal').props.visible,false);assert.equal(h.focus(),'gear');tree=h.open();h.byLabel(tree,'Dismiss account settings').props.onPress();assert.equal(h.render().find(n=>n.type==='Modal').props.visible,false);
});
test('native Back closes shared account menu on both platforms',()=>{
 for(const os of ['ios','android']){const h=menuHarness(os),tree=h.open();assert.equal(tree.find(n=>n.type==='Modal').props.visible,true);tree.find(n=>n.type==='Modal').props.onRequestClose();assert.equal(h.render().find(n=>n.type==='Modal').props.visible,false);}
});
test('Sign Out closes menu and uses established Clerk session and redirect',async()=>{
 const h=menuHarness();const tree=h.open();await tree.find(n=>n.type==='Pressable'&&n.props.children?.props?.children==='Sign Out').props.onPress();assert.equal(h.calls[0].sessionId,'session-A');assert.equal(h.calls[0].redirectUrl,'/signin');assert.equal(h.routes[0],'/signin');assert.equal(h.render().find(n=>n.type==='Modal').props.visible,false);
});
test('account switch or tab blur hides previous menu immediately',()=>{
 const h=menuHarness();h.open();h.switchUser('B');let tree=h.render();assert.equal(tree.find(n=>n.type==='Modal').props.visible,false);tree=h.open();assert.match(text(tree),/B Display/);assert.doesNotMatch(text(tree),/A Display/);h.blur();assert.equal(h.render().find(n=>n.type==='Modal').props.visible,false);
});
test('failed sign-out permits a safe retry instead of leaving a stuck menu',async()=>{
 const h=menuHarness();h.fail();const tree=h.open();await tree.find(n=>n.type==='Pressable'&&n.props.children?.props?.children==='Sign Out').props.onPress();const after=h.render();assert.equal(after.find(n=>n.type==='Modal').props.visible,true);assert.match(text(after),/Could not sign out/);assert.equal(h.routes.length,0);
});

test('account menu falls back to verified current-user email and hides mismatched profile data',()=>{
 const h=menuHarness();h.profile({id:'A',primaryEmailAddress:{emailAddress:'learner@example.test'}});assert.match(text(h.open()),/learner@example.test/);h.switchUser('B');assert.doesNotMatch(text(h.render()),/learner@example.test/);h.profile({id:'A',fullName:'Private previous account'});assert.match(text(h.open()),/Account unavailable/);assert.doesNotMatch(text(h.render()),/Private previous account/);
});
test('old menu callback cannot sign out a newly switched account',async()=>{
 const h=menuHarness(),tree=h.open(),old=tree.find(n=>n.type==='Pressable'&&n.props.children?.props?.children==='Sign Out').props.onPress;h.switchUser('B');h.render();await old();assert.equal(h.calls.length,0);assert.equal(h.routes.length,0);
});

test('both headers share compact fixed layout and receive only current learner data',()=>{
 const header=compile('src/components/ProgressHeader.tsx',name=>name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='react-native'?{View:'View',Text:'Text',StyleSheet:{create:x=>x}}:name==='expo-font'?{useFonts:()=>[true]}:name==='./LearnerStatusCard'?{LearnerStatusCard:'Card'}:name==='./AccountSettingsButton'?{AccountSettingsButton:'Gear'}:{});
 for(const title of ['Today','Roadmap'])for(const identity of [null,{xp:140,nextLevelXp:200,professionalLevel:2,streak:{currentCount:1}}]){
 const tree=header.ProgressHeader({title,identity}),all=nodes(tree);assert.equal(tree.props.style.backgroundColor,'white');assert.equal(tree.props.style.flexShrink,0);assert.equal(tree.props.style.zIndex,1);assert.equal(all.find(n=>n.type==='Card').props.identity,identity);assert.match(text(tree),new RegExp(title));assert.equal(all.filter(n=>n.type==='Gear').length,1);
 const layout=tree.props.children.props.style;assert.equal(layout.paddingTop,12);assert.equal(layout.paddingBottom,12);assert.equal(layout.gap,8);assert.equal(header.progressLayout.scroll.minHeight,0);
 }
 const today=fs.readFileSync(path.join(root,'app/(tabs)/index.tsx'),'utf8'),roadmap=fs.readFileSync(path.join(root,'app/(tabs)/cases.tsx'),'utf8');
 assert.ok(today.indexOf('<TodayHeader identity={visibleToday?.identity}')<today.indexOf('<ScrollView style='));assert.ok(roadmap.indexOf('<RoadmapHeader identity={journeySummary?.identity}')<roadmap.indexOf('<ScrollView ref='));for(const screen of [today,roadmap])assert.match(screen,/progressLayout.scroll/);
 const card=fs.readFileSync(path.join(root,'src/components/LearnerStatusCard.tsx'),'utf8');assert.doesNotMatch(card,/CURRENT ROTATION|rotationTitle|styles.rotation/);assert.match(card,/minHeight: 44/);
});
