import { StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { AccountSettingsButton } from "./AccountSettingsButton";
import { LearnerStatusCard } from "./LearnerStatusCard";
import type { LearnerIdentity } from "./learnerStatus";

/** Fixed flex sibling of the ScrollView. The screen supplies its safe-area inset. */
export function ProgressHeader({ title, identity }: { title: "Today" | "Roadmap"; identity?: LearnerIdentity | null }) {
  useFonts({ RoadmapInterBold: require("../../assets/module0/Inter-Bold.ttf") });
  return <View style={styles.region} testID="progress-header">
    <View style={styles.content}>
      <View style={styles.row}><Text accessibilityRole="header" style={styles.title}>{title}</Text><AccountSettingsButton /></View>
      <LearnerStatusCard identity={identity} />
    </View>
  </View>;
}
export const progressLayout = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 },
});
const styles = StyleSheet.create({
  region: { backgroundColor: "white", zIndex: 1, flexShrink: 0 },
  content: { width: "100%", maxWidth: 600, alignSelf: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 8 },
  row: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 29, fontWeight: "700", color: "#152044", fontFamily: "RoadmapInterBold" },
});
