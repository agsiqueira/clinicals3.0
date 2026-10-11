// Local-file production-component validation: no app server or learner account.
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require(process.env.CLINICALS_PLAYWRIGHT);
const root=path.resolve(__dirname,"../..");
const out=path.join(root,"docs/module-0/approved-ui/ux-corrections");
const preview=path.join(out,"preview");
const catalog=require(path.join(root,"backend/src/content/clinicalReadiness.json"));
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
   const file=path.resolve(preview,"."+decodeURIComponent(url.pathname));
   if(!file.startsWith(preview+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:"Missing local asset"});
   return route.fulfill({contentType:mime[path.extname(file)]||"application/octet-stream",body:fs.readFileSync(file)});
  });
  for(const [width,height] of [[390,844],[320,568]]){
   await page.setViewportSize({width,height});
   for(const [exercise,kind] of [["organize-old-carts","required"],["soap-and-data-types","required"],["open-the-interview","practice"],["snapps","practice"]]){
    const activity=catalog.activities.find(a=>a.steps.some(s=>s.id===exercise));const step=activity.steps.find(s=>s.id===exercise);
    await page.goto(`http://module0.local/?screen=practice&activityId=${activity.id}&exercise=${exercise}&kind=${kind}`);
    const field=page.getByRole("textbox",{name:"Your exercise response",exact:true});await field.waitFor();
    if(await field.getAttribute("placeholder")!=="Answer here")throw Error("Wrong placeholder");
    if(await page.getByText(step.answerHint,{exact:true}).count()!==1)throw Error("Missing/duplicate helper");
    await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete));
    const disclosure=page.getByRole("button",{name:"Mr. Jones · Case facts",exact:true});
    const initial=exercise==="organize-old-carts"&&kind==="required";
    if((await disclosure.getAttribute("aria-expanded"))!==String(initial))throw Error("Wrong disclosure default");
    await disclosure.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,"screenshots",`${exercise}-${kind}-default-${width}.png`)});
    await field.fill("Synthetic unsubmitted draft");
    if(initial)await disclosure.click();
    await disclosure.focus();
    const outline=await disclosure.evaluate(e=>getComputedStyle(e).outlineWidth);if(parseFloat(outline)<2)throw Error("No visible disclosure focus ring");
    await page.keyboard.press("Enter");if(await disclosure.getAttribute("aria-expanded")!=="true")throw Error("Enter did not expand");
    await page.getByText(catalog.sharedScenario.purpose,{exact:true}).waitFor();
    const full=await page.getByText(catalog.sharedScenario.purpose,{exact:true}).evaluate(e=>e.parentElement.innerText);
    const normalize=s=>s.replace(/\s+/g," ").trim();
    if(!normalize(full).includes(normalize(catalog.sharedScenario.text)))throw Error("Case facts incomplete");
    if(await field.inputValue()!=="Synthetic unsubmitted draft")throw Error("Draft lost on expand");
    await disclosure.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,"screenshots",`${exercise}-${kind}-expanded-${width}.png`)});
    await disclosure.focus();await page.keyboard.press("Space");if(await disclosure.getAttribute("aria-expanded")!=="false")throw Error("Space did not collapse");
    if(await page.getByText(catalog.sharedScenario.purpose,{exact:true}).count()!==0)throw Error("Collapsed content remains exposed");
    if(await field.inputValue()!=="Synthetic unsubmitted draft")throw Error("Draft lost on collapse");
    await field.scrollIntoViewIfNeeded();await field.focus();await page.screenshot({path:path.join(out,"screenshots",`${exercise}-${kind}-input-focused-${width}.png`)});
    const submit=page.getByRole("button",{name:"Submit",exact:true});const box=await submit.boundingBox();
    if(!box||box.y<0||box.y+box.height>height+1)throw Error("Submit outside viewport");
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error("Horizontal overflow");
    results.push({exercise,kind,width,height,defaultExpanded:initial,helperCount:1,keyboardEnter:true,keyboardSpace:true,focusOutline:outline,fullFacts:true,draftPreserved:true,submitInViewport:true});
   }
  }
 }finally{await browser.close();fs.writeFileSync(path.join(out,"visual-results.json"),JSON.stringify({results,errors},null,2));}
 if(errors.length)throw Error(errors.join("\n"));console.log(`Passed ${results.length} responsive disclosure/input scenarios; no page errors.`);
})();
