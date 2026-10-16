import 'expo';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Text,View} from 'react-native';
import {ExpoRoot,Stack} from 'expo-router';
import TabLayout from '../app/(tabs)/_layout';
import Portfolio from '../app/(tabs)/portfolio';
import {FixtureAccountControl} from './portfolio-v2-runtime';
function Root(){return <View style={{flex:1}}><Stack screenOptions={{headerShown:false}}/><FixtureAccountControl/></View>;}
function Destination(){return <View style={{padding:24}}><Text>Unchanged navigation destination · isolated Portfolio review fixture</Text></View>;}
const modules={'./_layout.jsx':{default:Root},'./(tabs)/_layout.tsx':{default:TabLayout},'./(tabs)/portfolio.tsx':{default:Portfolio},'./(tabs)/index.tsx':{default:Destination},'./(tabs)/cases.tsx':{default:Destination},'./(tabs)/level1.tsx':{default:Destination},'./(tabs)/level1 - original.tsx':{default:Destination},'./signin.tsx':{default:Destination}};
const context=Object.assign(key=>modules[key],{keys:()=>Object.keys(modules),resolve:key=>key,id:'portfolio-v2-review'});
createRoot(document.getElementById('root')).render(<ExpoRoot context={context}/>);
