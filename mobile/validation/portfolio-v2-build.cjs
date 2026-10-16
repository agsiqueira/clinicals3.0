const Metro=require('metro'),path=require('path');
const root=path.resolve(__dirname,'..');
const config=require('expo/metro-config').getDefaultConfig(root);
config.maxWorkers=2;config.resetCache=true;
config.watchFolders=[root,path.resolve(root,'../backend'),path.resolve(root,'../../clinicals3.0-approved-ui/mobile')];
config.resolver.resolveRequest=(context,name,platform)=>{
  if(name.startsWith('@/')) name=path.join(root,name.slice(2));
  const candidate=name.startsWith('.')?path.resolve(path.dirname(context.originModulePath),name).replaceAll('\\','/'):name;
  if(name==='@clerk/clerk-expo'||/src\/api\/(client|sessionToken)$|src\/hooks\/(useSpeechPlayback|useEnglishSpeechTranscription|useVoicePreference)$|src\/utils\/storage$/.test(candidate))return {type:'sourceFile',filePath:path.join(__dirname,'portfolio-v2-runtime.jsx')};
  return context.resolveRequest({...context,preferNativePlatform:false},name==='react-native'?'react-native-web':name,platform);
};
Metro.runBuild(config,{entry:'validation/portfolio-v2-preview.jsx',platform:'web',dev:false,minify:false,out:path.resolve(root,'../docs/design/portfolio-v2/app.js')}).then(()=>{console.log('PORTFOLIO V2 REVIEW BUILD OK');process.exit(0)}).catch(e=>{console.error(e);process.exit(1)});
