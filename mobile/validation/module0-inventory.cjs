const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("../node_modules/typescript");
const root=path.resolve(__dirname,"../..");
function compile(file,dependency){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:()=>dependency});return exports;}
const presentation=compile("mobile/src/components/module0/presentation.js");
const teaching=compile("mobile/src/components/module0/teaching.js",presentation);
const catalog=require(path.join(root,"backend/src/content/clinicalReadiness.json"));
const mapping=require(path.join(root,"docs/module-0/approved-ui/teaching-expansion/asset-mapping.json"));
const descriptionSource=fs.readFileSync(path.join(root,"mobile/src/components/module0/ApprovedScreens.tsx"),"utf8");
const descriptions=JSON.parse(descriptionSource.match(/const conceptArtworkDescriptions = (\{[\s\S]*?\});/)[1]);
const set02=new Set(["clinical-differential-map","learner-clinical-learning-cycle","patient-data-to-summary","narrowing-the-differential","mentorship-questions","self-directed-learning","clinical-reasoning-possibilities"]);
const eight=new Set(["history-medications-allergies","history-surgical-family-context","history-social-environmental-context","ros-systematic-symptom-questions","ros-symptoms-in-history","focused-examination-purpose","focused-examination-guided-by-history","focused-findings-support-challenge"]);
const lines=["# Module 0 teaching panel inventory","", "48 panels across the unchanged four activities and nine exercise IDs. Scene files are in mobile/assets/module0; compact symbols reuse the existing approved SVGs. Visible instructional text is rendered by the app.",""];
const inventory=[];
for(const activity of catalog.activities){
 lines.push("## "+activity.title,"","Introduction narration: "+teaching.narrationFor("introduction",null,null,0,activity),"");
 for(const step of activity.steps){
  lines.push("### "+presentation.exerciseTitle(step,activity)+" (`"+step.id+"`)","");
  teaching.conceptPanelsFor(step).forEach((p,i)=>{
   const art=p.illustration?p.illustration+".png":{conversation:"2a5ba.svg",clock:"b9b5b.svg",list:"6b92c.svg",book:"ef2e9.svg"}[p.icon];
   const type=p.illustration?"scene":"icon";
   const sourceArchive=!p.illustration || p.illustration==="focused-findings-support-challenge-v2"?null:eight.has(p.illustration)?"Clinicals3_Module0_Eight_Illustrations.zip":set02.has(p.illustration)?"Clinicals3_Module0_Illustrations_Set02.zip":"Clinicals3_Module0_Illustrations_Set01.zip";
   const original=p.illustration?mapping[p.illustration]:art;
   const sourceEntry=p.illustration && set02.has(p.illustration) && !original.startsWith("Clinicals3_Module0_Illustrations_Set02/")?"Clinicals3_Module0_Illustrations_Set02/"+original:original;
   const accessibleDescription=p.illustration?descriptions[p.illustration]||p.title:null;
   lines.push(`${i+1}. **${p.title}** — ${art} (${type})`,"",`   Source: ${sourceArchive||(p.illustration==="focused-findings-support-challenge-v2"?"Approved user image":"Approved Figma export; mobile/assets/module0/provenance.json")} / ${sourceEntry}`,"",`   Accessible description: ${accessibleDescription||"Decorative compact symbol; concept title/text supply its accessible meaning."}`,"","   "+p.text.replace(/\n/g,"\n   "),"","   Narration: "+p.narration,"");
   inventory.push({activityId:activity.id,exerciseId:step.id,panel:i+1,title:p.title,illustration:art,type,sourceArchive,sourceEntry,accessibleDescription,text:p.text,narration:p.narration});
  });
 }
}
const out=path.join(root,"docs/module-0/approved-ui/teaching-expansion");
fs.writeFileSync(path.join(out,"panel-inventory.md"),lines.join("\n"));
fs.writeFileSync(path.join(out,"panel-inventory.json"),JSON.stringify(inventory,null,2));
console.log(`Wrote ${inventory.length} panels.`);
