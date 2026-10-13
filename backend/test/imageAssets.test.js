const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),ts=require('../../mobile/node_modules/typescript');
const root=path.resolve(__dirname,'../..'),assets=require('./fixtures/imageAssets.json');
function dimensions(bytes){
 if(bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a')return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
 if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){
  assert.equal(bytes.readUInt32LE(4)+8,bytes.length);let chunk=12;
  while(chunk+8<bytes.length){const kind=bytes.toString('ascii',chunk,chunk+4),size=bytes.readUInt32LE(chunk+4);if(kind==='VP8L'){assert.equal(bytes[chunk+8],0x2f);const packed=bytes.readUInt32LE(chunk+9);return [1+(packed&0x3fff),1+((packed>>>14)&0x3fff)];}chunk+=8+size+(size&1);}assert.fail('Expected lossless WebP payload');
 }
 return null;
}
test('all 74 audited assets retain approved dimensions and encoded integrity, including canonical aliases',()=>{
 assert.equal(assets.length,74);assert.equal(new Set(assets.map(a=>a.originalPath)).size,74);
 for(const asset of assets){const file=fs.readFileSync(path.join(root,asset.path));assert.equal(file.length,asset.canonicalBytes??asset.bytes,asset.path);assert.equal(crypto.createHash('sha256').update(file).digest('hex'),asset.sha256,asset.path);const size=dimensions(file);if(size)assert.deepEqual(size,[asset.width,asset.height],asset.path);if(asset.method==='unchanged')assert.equal(asset.sha256,asset.originalSha256,asset.path);if(asset.method==='lossless-webp')assert.equal(file.toString('ascii',8,12),'WEBP');}
 assert.equal(assets.filter(a=>a.method==='lossless-webp').length,27);
 assert.ok(assets.reduce((n,a)=>n+a.bytes,0)<assets.reduce((n,a)=>n+a.originalBytes,0));
});
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
test('every literal image/font/video require and Expo image configuration resolves, including lookup tables',()=>{
 let references=0;
 for(const file of ['mobile/app','mobile/src','mobile/components','mobile/constants'].flatMap(p=>fs.existsSync(path.join(root,p))?files(path.join(root,p)):[]).filter(p=>/\.[jt]sx?$/.test(p))){
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(source)==='require'&&node.arguments.length===1&&ts.isStringLiteral(node.arguments[0])){const ref=node.arguments[0].text;if(ref.startsWith('.')&&/\.(png|jpe?g|webp|svg|ttf|mp4)$/.test(ref)){assert.ok(fs.existsSync(path.resolve(path.dirname(file),ref)),file+': '+ref);references++;}}ts.forEachChild(node,visit);}visit(source);
 }
 const app=require('../../mobile/app.json').expo;for(const ref of [app.icon,app.web.favicon,...Object.values(app.android.adaptiveIcon).filter(v=>/\.png$/.test(v)),app.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-splash-screen')[1].image])assert.ok(fs.existsSync(path.resolve(root,'mobile',ref)),ref);
 assert.ok(references>60);
});
function loadAssets(file){const full=path.resolve(root,'mobile/src/utils',file),exports={};const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(code,{exports,require:ref=>path.resolve(path.dirname(full),ref)});return exports;}
test('deduplicated patient stills preserve every state, slug fallback and video loop; unknown patients still use initials',()=>{
 const p=loadAssets('patientAssets.ts');
 for(const [caseId,slug] of [['uti_level1','first-patient'],['seasonal_allergies_level1','seasonal-allergies-complete-hpi']]){
  const args={caseId,patientSessionSlug:slug},idle=p.getPatientStateImageSource({...args,state:'idle'}),a=p.getPatientVisualAssets(args);
  for(const state of ['idle','talking','listening','thinking','concerned','smiling'])assert.equal(p.getPatientStateImageSource({...args,state}),idle);
  assert.equal(a.talkingStill,a.idleImage);assert.equal(a.talkingVideo,a.talking);assert.ok(a.talkingVideo.endsWith(caseId+'_talk_loop.mp4'));assert.equal(p.getPatientAvatarSource(args),idle);assert.equal(p.getPatientAvatarSource({caseId}),idle);assert.ok(fs.existsSync(idle));
 }
 assert.equal(p.getPatientStateImageSource({caseId:'unknown',state:'talking'}),null);assert.equal(p.getPatientAvatarSource({caseId:'unknown'}),null);assert.equal(p.getPatientVisualAssetKey({patientSessionSlug:'first-patient-hpi'}),'uti_level1');
 const m=loadAssets('mentorAssets.ts'),mentor=m.getMentorVisualAssets();assert.equal(mentor.idle,mentor.idleImage);assert.ok(mentor.idleImage.endsWith('dr_martinez'+path.sep+'portrait.png'));assert.ok(m.getMentorTalkingVideoSource().endsWith('dr_martinez_talk_loop.mp4'));
});
