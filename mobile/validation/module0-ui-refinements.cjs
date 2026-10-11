// Local-only responsive validation. Routes every request to exported synthetic fixtures.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CLINICALS_PLAYWRIGHT);
const out=path.resolve(__dirname,'../../docs/module-0/ui-refinements');
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;width:100%;height:100%;overflow:hidden}#root{display:flex}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
const mime={'.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf'};
(async()=>{
 fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const results=[],errors=[];
 try{
  const page=await browser.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));let stage='before';
  await page.route('**/*',route=>{const u=new URL(route.request().url());const base=path.join(out,stage);if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});const file=path.resolve(base,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(base+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'Missing local asset'});return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});
  for(stage of ['before','after'])for(const [width,height] of [[320,568],[390,844],[1440,900]])for(const screen of ['teach','practice','feedback']){
   await page.setViewportSize({width,height});await page.goto('http://module0.local/?screen='+screen+'&exercise=organize-old-carts&panel=3');
   const back=page.getByRole('button',{name:'Back',exact:true});await back.waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete));
   const before=await back.boundingBox();const scrolled=await page.evaluate(()=>{const el=Array.from(document.querySelectorAll('div')).find(e=>getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>e.clientHeight+10);if(!el)return 0;el.scrollTop=el.scrollHeight;return el.scrollTop;});
   const after=await back.boundingBox();await page.screenshot({path:path.join(out,'screenshots',stage+'-'+screen+'-'+width+'-scrolled.png')});
   if(stage==='after'){
    assert.equal(after.y,before.y,'Header moved on scroll');assert.ok(after.y>=0&&after.y+after.height<=height);assert.equal(await page.getByRole('button',{name:'Replay narration'}).count(),0);
    const geometry=await page.getByRole('progressbar').evaluate(e=>{const header=e.parentElement.parentElement;const scroll=Array.from(document.querySelectorAll('div')).find(n=>getComputedStyle(n).overflowY==='auto');const h=header.getBoundingClientRect(),b=scroll.getBoundingClientRect(),p=e.getBoundingClientRect();return {headerBottom:h.bottom,contentTop:b.top,progressTop:p.top,progressBottom:p.bottom,scrollable:scroll.scrollHeight>scroll.clientHeight};});assert.ok(geometry.contentTop>=geometry.headerBottom-1,'Header overlaps content viewport');assert.ok(geometry.progressTop>=0&&geometry.progressBottom<=height,'Progress not visible');if(width===320&&screen!=='feedback')assert.ok(geometry.scrollable,'Narrow content must scroll');
    assert.equal(await page.getByRole('progressbar').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const frame=await back.evaluate(e=>{let n=e;while(n.parentElement&&getComputedStyle(n).maxWidth!=='480px')n=n.parentElement;const c=getComputedStyle(n),r=n.getBoundingClientRect();return {width:r.width,left:r.left,border:c.borderTopWidth,radius:c.borderTopLeftRadius};});assert.equal(frame.width,Math.min(width,480));assert.equal(frame.border,'0px');assert.equal(frame.radius,'0px');assert.equal(frame.left,(width-frame.width)/2);
    await page.getByRole('button',{name:'Play narration',exact:true}).click();await page.getByRole('button',{name:'Pause narration',exact:true}).click();await page.getByRole('button',{name:'Mute narration',exact:true}).click();await page.getByRole('button',{name:'Unmute narration',exact:true}).click();await page.getByRole('button',{name:'Show captions',exact:true}).click();await page.getByRole('button',{name:'Hide captions',exact:true}).click();
    if(screen==='practice'){const field=page.getByRole('textbox',{name:'Your exercise response',exact:true});await field.fill('Synthetic unsubmitted draft');await page.setViewportSize({width,height:Math.max(360,height-260)});await field.scrollIntoViewIfNeeded();await field.focus();assert.equal(await field.inputValue(),'Synthetic unsubmitted draft');const b=await back.boundingBox();assert.equal(b.y,before.y);await page.screenshot({path:path.join(out,'screenshots','after-practice-'+width+'-reduced-height.png')});await page.setViewportSize({width,height});}
    if(screen==='teach'){await page.getByRole('button',{name:'Back',exact:true}).click();assert.match(await page.getByRole('progressbar').evaluate(e=>e.parentElement.textContent), /^3\//);await page.getByRole('button',{name:'Continue →',exact:true}).click();assert.match(await page.getByRole('progressbar').evaluate(e=>e.parentElement.textContent), /^4\//);}
    await page.getByRole('button',{name:'Close lesson',exact:true}).click();await page.getByRole('button',{name:'Resume →',exact:true}).waitFor();
   }
   results.push({stage,screen,width,height,scrolled,headerBefore:before.y,headerAfter:after.y});
  }
  stage='after';
  for(const screen of ['introduction','exercise-transition','clarify','activity-complete','review']){
   await page.setViewportSize({width:390,height:844});await page.goto('http://module0.local/?screen='+screen+'&safeTop=47');const back=page.getByRole('button',{name:'Back',exact:true});await back.waitFor();const before=await back.boundingBox();assert.equal(before.y,47);assert.equal(await page.getByRole('progressbar').count(),1);
   await page.evaluate(()=>{const scroll=Array.from(document.querySelectorAll('div')).find(e=>getComputedStyle(e).overflowY==='auto');scroll.scrollTop=scroll.scrollHeight;});assert.equal((await back.boundingBox()).y,47);results.push({stage,screen,safeTop:47,headerFixed:true});
  }
  await page.goto('http://module0.local/?screen=feedback&exercise=organize-old-carts');await page.getByRole('button',{name:'Back',exact:true}).waitFor();
  const longScroll=await page.evaluate(()=>{const scroll=Array.from(document.querySelectorAll('div')).find(e=>getComputedStyle(e).overflowY==='auto');const block=document.createElement('div');block.style.height='1600px';block.textContent='Synthetic long-feedback layout stress test';scroll.firstElementChild.appendChild(block);scroll.scrollTop=scroll.scrollHeight;return scroll.scrollTop;});assert.ok(longScroll>1000);assert.equal((await page.getByRole('button',{name:'Back',exact:true}).boundingBox()).y,0);results.push({stage,screen:'synthetic-long-feedback',longScroll,headerFixed:true});
  assert.equal(errors.length,0,errors.join('\n'));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}
 console.log('PASS: '+results.length+' before/after responsive scenarios; controls, frame, scroll, progress, draft and reduced-height checks.');
})().catch(e=>{console.error(e);process.exitCode=1;});
