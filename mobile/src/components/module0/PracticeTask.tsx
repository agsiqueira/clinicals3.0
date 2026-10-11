import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { LessonStep } from "../../types/clinicalReadiness";
import { module0Colors as c, module0Fonts as f } from "./tokens";

const titles: Record<string, string> = {
  "open-the-interview": "What would you ask first?",
  "organize-old-carts": "Summarize the symptoms",
  "soap-and-data-types": "Classify and explain",
  "history-and-context": "Review history and context",
  "review-of-systems": "Explain the role of ROS",
  "focused-examination": "Focus your examination",
  "evidence-and-differential": "Compare the possibilities",
  sbar: "Present with SBAR", snapps: "Present your thinking",
};
const instructions: Record<string, string> = {
  "open-the-interview": "Choose how you'd begin the encounter before hearing the chief complaint.",
  "organize-old-carts": "Use all eight OLD CARTS categories. Keep the supplied details and pertinent negatives; short phrases are enough.",
  "soap-and-data-types": "Place each item in SOAP; explain the difference between the first two items.",
  sbar: "Give a brief SBAR using the supplied history and examination findings. Include a proposed next step and a question for your preceptor.",
  snapps: "Use SNAPPS and finish with a learning question.",
};
const frameworks: Record<string, string[][]> = {
  "organize-old-carts": [["O", "Onset"], ["L", "Location"], ["D", "Duration"], ["C", "Character"], ["A", "Aggravate / relieve"], ["R", "Radiation"], ["T", "Temporal factors"], ["S", "Severity"]],
  sbar: [["S", "Situation"], ["B", "Background"], ["A", "Assessment"], ["R", "Recommendation"]],
  snapps: [["S", "Summarize"], ["N", "Narrow"], ["A", "Analyze"], ["P", "Probe"], ["P", "Plan"], ["S", "Select"]],
};
const soapItems = ["Patient reports pain with inspiration", "You hear crackles", "You consider a pulmonary cause", "You propose a chest X-ray"];

function Reference({ label, children }: { label: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={s.reference}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded }} aria-expanded={expanded}
      onPress={() => setExpanded(v => !v)} style={s.referenceHeader}>
      <Text style={s.referenceLabel}>{label}</Text><MaterialCommunityIcons name={expanded ? "chevron-up" : "chevron-down"} size={22} color={c.primary} />
    </Pressable>
    {expanded && <View style={s.referenceBody}>{children}</View>}
  </View>;
}

/** Presentation only: canonical questions/teaching and the submitted response stay unchanged. */
export function PracticeTask({ step, optional, choices, caseFacts }: { step: LessonStep; optional: boolean; choices?: boolean; caseFacts?: React.ReactNode }) {
  const framework = optional ? null : frameworks[step.id];
  return <View style={s.task}>
    <Text style={s.eyebrow}>{optional ? "TARGETED PRACTICE" : "YOUR TURN"}</Text>
    <Text accessibilityRole="header" style={s.title}>{optional ? "Practice again" : titles[step.id]}</Text>
    <Text style={s.instruction}>{optional ? step.optionalPracticeQuestion : instructions[step.id] || step.question}</Text>
    {!optional && step.id === "snapps" && <Text style={s.instruction}>Include evidence, uncertainty, a plan, and a focused case-related learning question.</Text>}
    {!optional && step.id === "soap-and-data-types" && <View style={s.items}>{soapItems.map((item, i) => <View key={item} style={s.item}>
      <Text style={s.marker}>{String(i + 1).padStart(2, "0")}</Text><Text style={s.itemText}>{item}</Text>
    </View>)}</View>}
    {caseFacts}
    {framework && <View style={s.framework}>
      <Text style={s.eyebrow}>{step.id === "organize-old-carts" ? "OLD CARTS CATEGORIES" : "YOUR PRESENTATION"}</Text>
      <View style={s.grid}>{framework.map(([letter, name], i) => <View key={`${i}:${name}`} style={s.move}>
        <View style={s.chip}><Text style={s.marker}>{letter}</Text></View><Text style={s.moveName}>{name}</Text>
      </View>)}</View>
    </View>}
    {!choices && <Reference label={step.id === "soap-and-data-types" ? "Review SOAP sections" : "Task details and concept"}>
      <Text style={s.referenceLabel}>{optional ? "Targeted practice" : "Full task"}</Text>
      <Text selectable style={s.instruction}>{optional ? step.optionalPracticeQuestion : step.question}</Text>
      <Text selectable style={s.instruction}>{step.teach}</Text>
      <Text style={s.hint}>{step.answerHint}</Text>
    </Reference>}
  </View>;
}
const s = StyleSheet.create({
  task: { gap: 18 }, eyebrow: { fontFamily: f.bold, fontSize: 11, lineHeight: 16, color: c.primary },
  title: { fontFamily: f.bold, fontSize: 24, lineHeight: 29, color: c.ink, marginTop: -10 },
  instruction: { fontFamily: f.regular, fontSize: 14, lineHeight: 21, color: c.body }, hint: { fontFamily: f.regular, fontSize: 13, lineHeight: 20, color: c.body },
  reference: { borderRadius: 14, backgroundColor: c.lavender }, referenceHeader: { minHeight: 54, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  referenceLabel: { flex: 1, fontFamily: f.semibold, fontSize: 14, lineHeight: 20, color: c.ink }, referenceBody: { padding: 16, paddingTop: 0, gap: 12 },
  framework: { backgroundColor: c.reply, borderRadius: 14, padding: 16, gap: 18 }, grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
  move: { width: "50%", flexDirection: "row", alignItems: "flex-start", gap: 8, paddingRight: 6 }, chip: { width: 25, minHeight: 24, borderRadius: 7, backgroundColor: c.lavender, alignItems: "center", justifyContent: "center" },
  marker: { fontFamily: f.bold, fontSize: 12, lineHeight: 18, color: c.primary }, moveName: { flex: 1, fontFamily: f.medium, fontSize: 13, lineHeight: 19, color: c.ink, paddingTop: 2 },
  items: { gap: 10 }, item: { backgroundColor: c.reply, borderRadius: 10, minHeight: 58, padding: 15, flexDirection: "row", gap: 16, alignItems: "center" },
  itemText: { flex: 1, fontFamily: f.medium, fontSize: 13, lineHeight: 18, color: c.ink },
});
