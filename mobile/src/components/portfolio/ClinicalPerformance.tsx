import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { module0Fonts as f } from "../module0/tokens";
import { performanceGeometry, type ScoredEncounter } from "./performance";
export function ClinicalPerformance({ patients }: {
    patients: ScoredEncounter[];
}) {
    const [viewportWidth, setViewportWidth] = useState(292);
    const { points, path, width } = performanceGeometry(patients, viewportWidth);
    if (points.length < 2)
        return <View testID="clinical-performance-empty" style={styles.empty}><Text style={styles.body}>Complete at least two scored encounters to see how your performance changes over time.</Text></View>;
    // SVG is generated exclusively from validated numeric scores, never clinical text or illustrative data.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" font-family="Inter,Arial,sans-serif" width="${width}" height="130" viewBox="0 0 ${width} 130">${[100, 50, 0].map(score => `<line x1="33" y1="${92 - score * .82}" x2="${width - 15}" y2="${92 - score * .82}" stroke="#E5E3F4"/><text x="0" y="${96 - score * .82}" font-size="10" fill="#727EA1">${score}</text>`).join("")}<path d="${path}" fill="none" stroke="#6150ED" stroke-width="2.8"/>${points.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#6150ED" stroke="white"/><text x="${p.x}" y="${Math.max(8, p.y - 8)}" text-anchor="middle" font-size="10" fill="#6150ED">${p.score}%</text><text x="${p.x}" y="110" text-anchor="middle" font-size="10" fill="#727EA1">${i + 1}</text>`).join("")}</svg>`;
    return <View testID="clinical-performance-chart" onLayout={event => setViewportWidth(Math.max(1, event.nativeEvent.layout.width - 28))} style={styles.chart}>
    <Text style={styles.label}>SESSION SCORE TREND</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={width > viewportWidth} style={{ maxWidth: "100%" }}><Image source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` }} contentFit="contain" style={{ width, height: 130 }} accessible accessibilityLabel={`Encounter scores, chronological order, fixed 0 to 100 percent scale: ${points.map((p, i) => `${i + 1}: ${p.score}%`).join(", ")}`}/></ScrollView>
    <Text style={styles.caption}>Encounter sequence · Each point = one scored patient encounter</Text>
  </View>;
}
const styles = StyleSheet.create({ chart: { backgroundColor: "white", borderRadius: 12, padding: 14, gap: 8 }, empty: { paddingVertical: 7 }, label: { fontFamily: f.semibold, fontSize: 11, color: "#6150ED" }, caption: { fontFamily: f.regular, fontSize: 10, lineHeight: 15, color: "#727EA1" }, body: { fontFamily: f.regular, fontSize: 12, lineHeight: 18, color: "#727EA1" } });
