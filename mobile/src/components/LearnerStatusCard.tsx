import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";

import { learnerStatus, type LearnerIdentity } from "./learnerStatus";

/** Informational progress only. Account controls belong exclusively to the gear. */
export function LearnerStatusCard({ identity, rotationTitle }: { identity?: LearnerIdentity | null; rotationTitle?: string | null }) {
  useFonts({ RoadmapInter: require("../../assets/module0/Inter-Regular.ttf"), RoadmapInterBold: require("../../assets/module0/Inter-Bold.ttf") });
  const status = learnerStatus(identity, rotationTitle);
  return <View style={styles.card} testID="learner-status-card">
    <Text style={styles.caption}>CURRENT ROTATION</Text>
    <Text style={styles.rotation}>{status.rotation}</Text>
    <View style={styles.indicators}>
      <View style={styles.indicator}><MaterialCommunityIcons name="fire" size={18} color="#F05D30" accessible={false} /><Text accessibilityLabel={`Streak: ${status.streak}`} style={styles.value}>{status.streak}</Text></View>
      <View style={styles.indicator}><MaterialCommunityIcons name="star" size={17} color="#6150ED" accessible={false} /><Text style={styles.value}>{status.level === null ? "Level unavailable" : `Level ${status.level}`}</Text></View>
      <View style={styles.xp}>
        <Text style={styles.xpText}>{status.label}</Text>
        <View accessibilityRole="progressbar" accessibilityLabel="XP toward next level" accessibilityValue={status.ratio === null ? { text: "Progress unavailable" } : { min: 0, max: 100, now: Math.round(status.ratio * 100) }} style={styles.track}>
          {status.ratio !== null && <View style={[styles.fill, { width: `${status.ratio * 100}%` }]} />}
        </View>
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: "#F2EEFF", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, gap: 3 },
  caption: { color: "#727EA1", fontSize: 10, lineHeight: 12, fontFamily: "RoadmapInterBold" },
  rotation: { color: "#152044", fontSize: 14, lineHeight: 18, fontFamily: "RoadmapInterBold" },
  indicators: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 8, marginTop: 5 },
  indicator: { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 1 },
  value: { color: "#152044", fontSize: 12, lineHeight: 18, fontFamily: "RoadmapInter", flexShrink: 1 },
  xp: { flexGrow: 1, flexBasis: 80, gap: 4 },
  xpText: { color: "#727EA1", fontSize: 11, lineHeight: 15, fontFamily: "RoadmapInter" },
  track: { height: 6, borderRadius: 3, backgroundColor: "#E6E8F2", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3, backgroundColor: "#6150ED" },
});
