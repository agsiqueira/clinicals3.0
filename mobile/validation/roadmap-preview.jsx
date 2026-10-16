import "expo";
import React from "react";
import {createRoot} from "react-dom/client";
import {Text, View, Pressable} from "react-native";
import {ExpoRoot, Stack, useLocalSearchParams, useRouter} from "expo-router";
import TabLayout from "../app/(tabs)/_layout";
import Portfolio from "../app/(tabs)/portfolio";
import Today from "../app/(tabs)/index";
import Roadmap from "../app/(tabs)/cases";
import Attempts from "../app/attempts";
import DebriefReview from "./debrief-review";
function Root(){const [settled,setSettled]=React.useState(!new URLSearchParams(location.search).has("hostSettle"));React.useEffect(()=>{const done=()=>setSettled(true);const check=()=>{const scroll=document.querySelector('[data-testid="roadmap-scroll"]');if(scroll?.style.opacity==="1"&&!document.querySelector('[data-testid="roadmap-positioning"]'))done();};const observer=new MutationObserver(check);observer.observe(document.getElementById("root"),{subtree:true,childList:true,attributes:true,attributeFilter:["style"]});return()=>observer.disconnect();},[]);return <View style={{flex:1,maxHeight:settled?"100%":"80%"}}><Stack screenOptions={{headerShown:false}}/></View>;}
function Destination(){const params=useLocalSearchParams(),router=useRouter();return <View style={{padding:24,gap:20}}><Text accessibilityRole="header" style={{fontSize:22}}>Synthetic route destination</Text><Text>{JSON.stringify(params)}</Text><Text>No patient conversations, learner data, or API writes are connected.</Text><Pressable accessibilityRole="button" style={{padding:16}} onPress={()=>router.back()}><Text>Back to Roadmap</Text></Pressable></View>;}
const modules={"./debrief-review.jsx":{default:DebriefReview},"./_layout.jsx":{default:Root},"./(tabs)/_layout.tsx":{default:TabLayout},"./(tabs)/cases.tsx":{default:Roadmap},"./(tabs)/index.jsx":{default:Today},"./(tabs)/portfolio.jsx":{default:Portfolio},"./(tabs)/level1.jsx":{default:Destination},"./(tabs)/level1 - original.jsx":{default:Destination},"./attempts.jsx":{default:Attempts},"./module-0.jsx":{default:Destination},"./signin.jsx":{default:Destination}};
const context=Object.assign(key=>modules[key],{keys:()=>Object.keys(modules),resolve:key=>key,id:"roadmap-review"});
createRoot(document.getElementById("root")).render(<ExpoRoot context={context}/>);
