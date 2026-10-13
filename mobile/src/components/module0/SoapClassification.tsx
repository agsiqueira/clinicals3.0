import React, { createElement, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { soapOptions, soapSelections, soapStatements, updateSoapSelection } from "./soap";
import { module0Colors as c, module0Fonts as f } from "./tokens";

export function SoapClassification({value,onChange,disabled}:{value:string;onChange:(value:string)=>void;disabled:boolean}) {
 const [open,setOpen]=useState<number|null>(null);
 const selected=soapSelections(value);
 return <View style={s.items}>{soapStatements.map((statement:string,index:number)=>{
  const label=`Statement ${index+1}: ${statement} SOAP category`;
  return <View key={statement} style={s.item}>
   <Text style={s.statement}>{index+1}. {statement}</Text>
   {Platform.OS === "web" ? createElement("select",{value:selected[index],disabled,"aria-label":label,onChange:(event:React.ChangeEvent<HTMLSelectElement>)=>onChange(updateSoapSelection(value,index,event.target.value)),style:{minHeight:44,width:"100%",maxWidth:"100%",borderRadius:8,border:`1px solid ${c.border}`,backgroundColor:c.background,color:c.ink,fontFamily:"Module0Inter",fontSize:14,padding:8}},
    createElement("option",{value:""},"Select category"),...soapOptions.map((option:string)=>createElement("option",{key:option,value:option[0]},option)))
   : <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Opens SOAP categories" accessibilityValue={{text:soapOptions.find((option:string)=>option[0]===selected[index]) || "Select category"}} accessibilityState={{disabled,expanded:open===index}} disabled={disabled} onPress={()=>setOpen(index)} style={s.dropdown}><Text style={s.statement}>{soapOptions.find((option:string)=>option[0]===selected[index]) || "Select category"}</Text><MaterialCommunityIcons name="chevron-down" size={22} color={c.primary}/></Pressable>}
  </View>;
 })}<Modal visible={open!==null} transparent animationType="fade" onRequestClose={()=>setOpen(null)}>
  <View style={s.backdrop}><View accessibilityViewIsModal accessibilityLabel="Select SOAP category" style={s.dialog}>
   <Text accessibilityRole="header" style={s.statement}>Select SOAP category</Text>
   {soapOptions.map((option:string)=><Pressable key={option} accessibilityRole="radio" accessibilityLabel={option} accessibilityState={{checked:open!==null&&selected[open]===option[0],disabled}} disabled={disabled} style={s.dropdown} onPress={()=>{if(open!==null)onChange(updateSoapSelection(value,open,option[0]));setOpen(null);}}><Text style={s.statement}>{option}</Text></Pressable>)}
   <Pressable accessibilityRole="button" style={s.dropdown} onPress={()=>setOpen(null)}><Text style={s.statement}>Cancel</Text></Pressable>
  </View></View>
 </Modal></View>;
}
const s=StyleSheet.create({items:{gap:12},item:{backgroundColor:c.reply,borderRadius:12,padding:14,gap:10},statement:{fontFamily:f.regular,fontSize:14,lineHeight:21,color:c.ink},dropdown:{minHeight:44,padding:10,flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:8,borderWidth:1,borderColor:c.border,borderRadius:8,backgroundColor:c.background},backdrop:{flex:1,justifyContent:"center",padding:24,backgroundColor:"rgba(21,32,68,0.45)"},dialog:{backgroundColor:c.background,borderRadius:14,padding:16,gap:10}});
