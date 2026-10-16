const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('../../mobile/node_modules/typescript');
const root=path.resolve(__dirname,'../../mobile/src/components/roadmap');
function compile(file,requireFn=()=>({})){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:requireFn});return exports;}
const journey=compile('journey.ts'),focus=compile('focus.ts',()=>journey);
const session=(id,status,score=90)=>({id,slug:id,title:id,status,bestSessionScore:score});
const paths=[{id:'p',title:'P',units:[{id:'u1',title:'One',slug:'one',sessions:[session('a','completed'),session('b','available')]},{id:'u2',title:'Later',slug:'later',sessions:[session('c','available'),session('d','locked')]}]}];
test('focus selects Module 0 before encounters when incomplete, but explicit destination wins',()=>{
 assert.equal(focus.roadmapFocusTarget(paths,{completed:false},'c'),'focus:foundation');
 assert.equal(focus.roadmapFocusTarget(paths,{completed:true,entryBlocked:true},'c'),'focus:foundation');
 assert.equal(focus.roadmapFocusTarget(paths,{completed:false},'c','b'),'focus:p:u1:b');
 assert.equal(focus.roadmapFocusTarget(paths,{completed:false},'c','missing'),null);
});
test('focus reuses backend recommendation across later rotations and never auto-selects locked encounter',()=>{
 assert.equal(focus.roadmapFocusTarget(paths,{completed:true},'c'),'focus:p:u2:c');
 assert.equal(focus.roadmapFocusTarget(paths,{completed:true},'d'),'focus:p:u1:b');
 assert.equal(focus.roadmapFocusTarget(paths,{completed:true},'c','d'),'focus:p:u2:d');
 const blocked=[{...paths[0],units:[{...paths[0].units[0],sessions:[session('a','completed',70),session('b','locked')]}]}];
 assert.equal(focus.roadmapFocusTarget(blocked,{completed:true},'b'),'focus:p:u1:a');
});
test('complete and unavailable journeys fall back safely to final completed destination or Module 0',()=>{
 const complete=JSON.parse(JSON.stringify(paths));complete[0].units.forEach(u=>u.sessions.forEach(s=>s.status='completed'));
 assert.equal(focus.roadmapFocusTarget(complete,{completed:true},null),'p:u2:destination');
 const locked=[{id:'p',title:'P',units:[{id:'u',title:'U',slug:'u',sessions:[session('x','locked')]}]}];
 assert.equal(focus.roadmapFocusTarget(locked,{completed:true},null),'focus:foundation');
 assert.equal(focus.roadmapFocusTarget([],null,null),null);
});
function harness(){const queue=[],scrolls=[],reveals=[];let owner='A',active=true;const c=focus.createRoadmapFocusController({schedule:fn=>queue.push(fn),scroll:y=>scrolls.push(y),reveal:x=>reveals.push(x),current:key=>active&&key===owner});return{c,queue,scrolls,reveals,owner:x=>owner=x,active:x=>active=x,flush(){while(queue.length)queue.shift()();},measure(y=1000){c.measure('target',{x:0,y,width:300,height:200});},layout(){c.viewport(600);c.canvas({y:20,height:3000});}};}
test('waits for data and measurements in any order, uses actual visible viewport, positions once',()=>{
 for(const order of [0,1]){const h=harness();h.c.begin('A');h.layout();if(order)h.measure();h.c.ready('A','target');assert.equal(h.scrolls.length,0);if(!order)h.measure();h.flush();assert.deepEqual(h.scrolls,[820]);assert.equal(h.reveals.at(-1),true);h.measure(1800);h.c.viewport(500);h.c.ready('A','target');h.flush();assert.equal(h.scrolls.length,1);}
});
test('offset clamps foundation/final milestones and accounts for header/tab-reduced scroll heights',()=>{
 for(const viewport of [400,640,700])assert.equal(focus.centeredRoadmapOffset({y:1000,height:200,x:0,width:300},0,viewport,3000),1100-viewport/2);
 assert.equal(focus.centeredRoadmapOffset({y:0,height:200,x:0,width:300},0,700,3000),0);
 assert.equal(focus.centeredRoadmapOffset({y:2900,height:200,x:0,width:300},0,700,3000),2300);
});
test('manual interaction before or after readiness cancels automatic focus without snapping',()=>{
 for(const queued of [false,true]){const h=harness();h.c.begin('A');h.layout();h.measure();if(queued)h.c.ready('A','target');h.c.cancel();h.c.ready('A','target');h.flush();assert.equal(h.scrolls.length,0);assert.equal(h.reveals.at(-1),true);}
});
test('re-entering after completion starts a fresh visit with fresh data and clears old measurements',()=>{
 const h=harness();h.c.begin('A');h.layout();h.measure();h.c.ready('A','target');h.flush();h.c.end();h.c.begin('A');h.c.ready('A','target');h.flush();assert.equal(h.scrolls.length,1);h.layout();h.measure(1800);h.flush();assert.deepEqual(h.scrolls,[820,1620]);
});
test('account/session changes and blur reject queued work and stale readiness',()=>{
 for(const mode of ['owner','blur','visit']){const h=harness();h.c.begin('A');h.layout();h.measure();h.c.ready('A','target');if(mode==='owner')h.owner('B');if(mode==='blur')h.active(false);if(mode==='visit'){h.c.end();h.owner('B');h.c.begin('B');h.c.ready('A','target');}h.flush();assert.equal(h.scrolls.length,0);}
});
test('new explicit destination replaces queued/finished auto focus; absent target reveals safe top',()=>{
 const h=harness();h.c.begin('A');h.layout();h.measure();h.c.ready('A','target');h.c.measure('explicit',{x:0,y:1800,width:300,height:200});h.c.explicit('explicit');h.flush();assert.deepEqual(h.scrolls,[1620]);h.c.explicit(null);h.flush();assert.equal(h.reveals.at(-1),true);
});
