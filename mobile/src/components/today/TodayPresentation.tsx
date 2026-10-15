import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { useFonts } from "expo-font";
import { todayFocus, type TodayResponse } from "./model";
import { LearnerStatusCard } from "../LearnerStatusCard";
import { AccountSettingsButton } from "../AccountSettingsButton";
const art = {hero:require("../../../assets/today/a889e.png"),book:require("../../../assets/today/9ea64.svg"),arrow:require("../../../assets/today/8f7b8.svg"),mapBg:require("../../../assets/today/ca0eb.svg"),chevron:require("../../../assets/today/aab84.svg"),map:require("../../../assets/today/5863c.svg")};
function useFontsReady(){useFonts({RoadmapInter:require("../../../assets/module0/Inter-Regular.ttf"),RoadmapInterBold:require("../../../assets/module0/Inter-Bold.ttf")});}
export function TodayHeader(){
 useFontsReady();
 return <View style={s.header}><Text accessibilityRole="header" style={s.heading}>Today</Text><AccountSettingsButton /></View>;
}
export function TodayContent({data,onContinue,onRoadmap}:{data:TodayResponse;onContinue:()=>void;onRoadmap:()=>void}){
 useFontsReady();const {width}=useWindowDimensions(),size=Math.min(width-40,350)*304/350,focus=todayFocus(data);
 const narrow=width<360, extended=focus.title.length>40;
 return <View style={s.stack}>
 <LearnerStatusCard identity={data.identity} rotationTitle={data.activeRotation?.title} />
 <View style={s.module} testID="today-current-module"><View style={s.badge}><Text style={s.badgeText}>CURRENT MODULE</Text></View><View style={s.moduleBody}><Image source={art.hero} contentFit="contain" accessible={false} style={[s.illustration,{width:size,height:size}]}/><View style={[s.moduleCopy,extended&&{width:"100%",paddingRight:18,paddingBottom:230}]}><Text accessibilityRole="header" style={[s.moduleTitle,narrow&&{fontSize:26,lineHeight:32}]}>{focus.title}</Text><Text style={s.description}>{focus.description}</Text></View></View><View style={s.progress}><Image source={art.book} style={{width:28.1667,height:22.8333}} accessible={false}/><Text style={s.progressText}>{focus.progress}</Text></View></View>
 <Pressable accessibilityRole="button" onPress={onContinue} style={s.cta} testID="today-continue"><Text style={s.ctaText}>{focus.action}</Text><Image source={art.arrow} style={{width:32,height:32}} accessible={false}/></Pressable>
 <Pressable accessibilityRole="button" accessibilityLabel="View Your Roadmap" onPress={onRoadmap} style={s.roadmap}><View style={{width:55,height:55}}><Image source={art.mapBg} style={{width:55,height:55}} accessible={false}/><Image source={art.map} style={s.map} accessible={false}/></View><View style={s.roadmapCopy}><Text style={s.roadmapTitle}>View Your Roadmap</Text><Text style={s.roadmapSubtitle}>See what's coming next.</Text></View><Image source={art.chevron} style={{width:20,height:20}} accessible={false}/></Pressable></View>;
}
export const todayStyles=StyleSheet.create({screen:{flex:1,backgroundColor:"white"},content:{width:"100%",maxWidth:390,alignSelf:"center",paddingHorizontal:20,paddingBottom:24},centered:{flex:1,alignItems:"center",justifyContent:"center",gap:12},body:{color:"#152044",fontSize:14},error:{backgroundColor:"#FFF0E8",padding:16,borderRadius:16,marginBottom:16},retry:{minHeight:44,justifyContent:"center"}});
const s=StyleSheet.create({
 header:{width:"100%",maxWidth:390,alignSelf:"center",paddingHorizontal:22,paddingTop:30,paddingBottom:35,minHeight:112,flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:8,backgroundColor:"white"},heading:{fontFamily:"RoadmapInterBold",fontSize:33,color:"#152044"},
 stack:{gap:20},
 module:{minHeight:369,backgroundColor:"#F2EEFF",borderRadius:25,overflow:"hidden",paddingTop:22},badge:{alignSelf:"flex-start",marginLeft:18,borderRadius:18,backgroundColor:"#E4DCFF",minHeight:36,paddingHorizontal:12,justifyContent:"center"},badgeText:{fontFamily:"RoadmapInterBold",fontSize:12,color:"#6150ED"},moduleBody:{minHeight:240,position:"relative",marginTop:24},illustration:{position:"absolute",right:-28,bottom:-87},moduleCopy:{width:"56%",paddingLeft:18,paddingRight:5,paddingBottom:110,gap:12},moduleTitle:{fontFamily:"RoadmapInterBold",fontSize:30,lineHeight:36,color:"#152044"},description:{fontFamily:"RoadmapInter",color:"#727EA1",fontSize:12,lineHeight:15,maxWidth:133},progress:{flexDirection:"row",gap:7,paddingHorizontal:10,paddingBottom:24,alignItems:"center"},progressText:{fontFamily:"RoadmapInterBold",color:"#152044",fontSize:14,flexShrink:1},
 cta:{minHeight:57,marginTop:-4,backgroundColor:"#6150ED",borderRadius:28,paddingHorizontal:14,paddingVertical:12,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},ctaText:{fontFamily:"RoadmapInterBold",fontSize:20,color:"white",textAlign:"center",flex:1},roadmap:{minHeight:88,marginTop:5,borderRadius:20,backgroundColor:"#F9FAFF",flexDirection:"row",alignItems:"center",gap:14,padding:14},map:{position:"absolute",width:25.5,height:25.5,top:15,left:15},roadmapCopy:{flex:1,gap:6},roadmapTitle:{fontFamily:"RoadmapInterBold",fontSize:17,color:"#152044"},roadmapSubtitle:{fontFamily:"RoadmapInter",fontSize:12,color:"#727EA1"}
});
