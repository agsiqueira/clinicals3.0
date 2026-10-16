const ts=require('typescript'),fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),repo=path.resolve(root,'..');
const config=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,root);
const tracked=new Set(cp.execFileSync('git',['ls-tree','-r','--name-only','origin/main'],{cwd:repo,encoding:'utf8'}).trim().split(/\r?\n/));
const relative=f=>path.relative(repo,f).replaceAll('\\','/');
const changed=cp.execFileSync('git',['diff','--name-only','origin/main'],{cwd:repo,encoding:'utf8'}).trim().split(/\r?\n/).filter(f=>/\.tsx?$/.test(f)&&tracked.has(f));
const originals=new Map(changed.map(f=>[path.resolve(repo,f),cp.execFileSync('git',['show',`origin/main:${f}`],{cwd:repo,encoding:'utf8'})]));
function diagnostics(baseline){
 const host=ts.createCompilerHost(parsed.options),read=host.readFile.bind(host);
 if(baseline)host.readFile=f=>originals.get(path.resolve(f))??read(f);
 const names=baseline?parsed.fileNames.filter(f=>tracked.has(relative(f))):parsed.fileNames;
 const program=ts.createProgram(names,{...parsed.options,noEmit:true},host);
 return ts.getPreEmitDiagnostics(program).map(d=>({file:d.file?relative(d.file.fileName):'',code:d.code,line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null,character:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).character+1:null,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}));
}
const baseline=diagnostics(true),current=diagnostics(false),keys=new Set(baseline.map(d=>JSON.stringify([d.file,d.code,d.message])));
const added=current.filter(d=>!keys.has(JSON.stringify([d.file,d.code,d.message])));
const result={baselineCommit:cp.execFileSync('git',['rev-parse','origin/main'],{cwd:repo,encoding:'utf8'}).trim(),baselineCount:baseline.length,currentCount:current.length,newDiagnostics:added,baseline,current};
fs.writeFileSync(path.join(repo,'docs/design/debrief-portfolio-redesign/typescript-comparison.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({baseline:baseline.length,current:current.length,new:added.length}));process.exitCode=added.length?1:0;
