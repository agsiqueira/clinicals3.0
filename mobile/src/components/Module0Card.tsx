import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { module0Action } from "../api/module0View";
import type { Module0Summary } from "../types/clinicalReadiness";

export function Module0Card({ summary }: { summary?: Module0Summary | null }) {
  const router = useRouter();
  if (!summary) return null;
  return <View style={styles.card}>
    <Text style={styles.eyebrow}>🩺 Dr. Martinez · Module 0</Text>
    <Text style={styles.title}>Clinical Readiness</Text>
    <Text style={styles.body}>Prepare to interview, reason, and present a case. Four short activities · 14–18 minutes. Leave and resume whenever you need.</Text>
    <Text accessibilityRole="text" style={styles.progress}>
      {!summary.storageReady ? "Available after setup" : summary.completed ? "Module 0 completed" : `${summary.completedCount} of ${summary.requiredCount} interactions complete`}
    </Text>
    {summary.activities.map((a, i) => <Pressable key={a.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/module-0", params: { activityId: a.id } })} style={styles.activity}>
      <Text style={styles.body}>{a.completed ? "✓" : `${i + 1}.`} {a.title}</Text>
      {a.completedCount !== null && <Text style={styles.small}>{a.completedCount}/{a.requiredCount}</Text>}
    </Pressable>)}
    {!summary.storageReady ? <Text style={styles.small}>Clinical Readiness is being prepared.</Text>
      : summary.entryBlocked ? <Text style={styles.small}>Complete all nine interactions to unlock Rotation 1. No passing score is required.</Text>
      : summary.completed ? <Text style={styles.small}>Your completion is saved. Review or practice without resetting it.</Text>
      : <Text style={styles.small}>Existing encounters remain available during validation.</Text>}
    <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.push(summary.completed ? { pathname: "/module-0", params: { mode: "review" } } : "/module-0")}><Text style={styles.buttonText}>{module0Action(summary)}</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: "#faf5ff", borderColor: "#ddd6fe", borderWidth: 1, borderRadius: 18, padding: 18, gap: 10, marginBottom: 16 },
  eyebrow: { color: "#6d28d9", fontWeight: "700" }, title: { color: "#312e81", fontSize: 22, fontWeight: "800" },
  body: { color: "#374151", fontSize: 15, lineHeight: 22, flexShrink: 1 }, small: { color: "#6b7280", fontSize: 13, lineHeight: 20 },
  progress: { color: "#5b21b6", fontWeight: "700" }, activity: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 5 },
  button: { backgroundColor: "#6d28d9", padding: 12, borderRadius: 10, alignItems: "center" }, buttonText: { color: "white", fontWeight: "700" },
});
