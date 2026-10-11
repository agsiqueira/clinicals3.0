// Actual production Teach components, synthetic progress, intercepted local files only.
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const ts=require("../node_modules/typescript");
const {chromium}=require(process.env.CLINICALS_PLAYWRIGHT);
const root=path.resolve(__dirname,"../..");
const out=path.join(root,"docs/module-0/approved-ui/illustration-integration");
const preview=path.join(out,"preview");
const catalog=require(path.join(root,"backend/src/content/clinicalReadiness.json"));
function compile(file,dependency){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:()=>dependency});return exports;}
const presentation=compile("mobile/src/components/module0/presentation.js");
const teaching=compile("mobile/src/components/module0/teaching.js",presentation);
const targets=new Set(["history-and-context","review-of-systems","focused-examination","evidence-and-differential"]);
const inventory=require(path.join(root,"docs/module-0/approved-ui/teaching-expansion/panel-inventory.json"));
const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;width:100%;height:100%;overflow:hidden}#root{display:flex}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
const mime={".js":"application/javascript",".png":"image/png",".svg":"image/svg+xml",".ttf":"font/ttf"};
(async()=>{
 fs.mkdirSync(path.join(out,"screenshots"),{recursive:true});
 const browser=await chromium.launch({executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",headless:true});
 const results=[],errors=[];
 try{
  const page=await browser.newPage();page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/*",route=>{
   const url=new URL(route.request().url());if(url.pathname==="/")return route.fulfill({contentType:"text/html",body:html});
   const file=path.resolve(preview,"."+decodeURIComponent(url.pathname));if(!file.startsWith(preview+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:"Missing local asset"});
   return route.fulfill({contentType:mime[path.extname(file)]||"application/octet-stream",body:fs.readFileSync(file)});
  });
  for(const [width,height] of [[390,844],[320,568]]){
   await page.setViewportSize({width,height});
   for(const activity of catalog.activities)for(const step of activity.steps){
    if(!targets.has(step.id))continue;
    const panels=teaching.conceptPanelsFor(step);
    for(let i=0;i<panels.length;i++){
     const panel=panels[i];await page.goto(`http://module0.local/?screen=teach&activityId=${activity.id}&exercise=${step.id}&panel=${i}`);
     await page.getByText(panel.title,{exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);
     await page.waitForFunction(()=>Array.from(document.images).every(img=>img.complete&&img.naturalWidth>0));
     const cta=page.getByRole("button",{name:i<panels.length-1?"Continue →":"Practice →",exact:true});const button=await cta.boundingBox();
     if(!button||button.y<0||button.y+button.height>height+1)throw Error("Clipped CTA: "+step.id+"/"+i);
     if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error("Horizontal overflow");
     let scene=null;
     if(panel.illustration){
      const info=inventory.find(r=>r.exerciseId===step.id&&r.panel===i+1);
      if(!await page.getByRole("img",{name:info.accessibleDescription,exact:true}).count())throw Error("Missing image description: "+panel.illustration);
      scene=await page.evaluate(asset=>{const img=Array.from(document.images).find(img=>img.src.includes('/'+asset+'.'));if(!img)return null;const box=img.getBoundingClientRect();return {naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,width:box.width,height:box.height,x:box.x,y:box.y,fit:getComputedStyle(img).objectFit};},panel.illustration);
      if(!scene||!scene.naturalWidth||scene.x<0||scene.x+scene.width>width+1||scene.y<0||scene.y+scene.height>height+1)throw Error("Broken/clipped illustration: "+panel.illustration);
      if(scene.fit!=="contain")throw Error("Illustration cropped: "+panel.illustration);
     }
     await page.screenshot({path:path.join(out,"screenshots",`${step.id}-${i+1}-${width}.png`)});
     if(width===320){const copy=page.getByText(panel.text.split(/\n\s*\n/).at(-1),{exact:true});await copy.scrollIntoViewIfNeeded();const box=await copy.boundingBox();if(!box||box.y<0||box.y+box.height>height)throw Error("Unreachable explanation");await page.screenshot({path:path.join(out,"screenshots",`${step.id}-${i+1}-${width}-scrolled.png`)});}
     results.push({exercise:step.id,panel:i+1,title:panel.title,width,height,scene,ctaVisible:true,horizontalOverflow:false,copyReachable:true});
    }
   }
  }
 }finally{await browser.close();fs.writeFileSync(path.join(out,"visual-results.json"),JSON.stringify({results,errors},null,2));}
 if(errors.length)throw Error(errors.join("\n"));console.log(`Passed ${results.length} target panel/viewport combinations; no page errors.`);
})();
