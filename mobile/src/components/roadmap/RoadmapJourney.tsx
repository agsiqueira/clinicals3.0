import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { Module0Card } from "../Module0Card";
import { CompactJourneyCard } from "../CompactJourneyCard";
import type { Module0Summary } from "../../types/clinicalReadiness";
import { sessionDisplayParts } from "../../utils/clinicalDisplay";
import { buildJourney, type JourneyPath, type JourneySession } from "./journey";
import { roadmapAssets as art } from "./assets";
import { JourneyChain, JourneyStage } from "./JourneyConnections";

const colors = { ink: "#152044", purple: "#6150ed", body: "#4c5b7b", lavender: "#f2eeff", muted: "#67748f" };
type Identity = { levelTitle?: string | null; professionalLevel?: number | null; xp?: number | null; streak?: { currentCount?: number | null } | null };

export function RoadmapHeader({ identity }: { identity?: Identity | null }) {
  const [expanded, setExpanded] = useState(false);
  const [anchor, setAnchor] = useState({ x: 16, y: 72, width: 280 });
  const trigger = useRef<any>(null);
  const closeButton = useRef<any>(null);
  const { width } = useWindowDimensions();
  const dismiss = () => { setExpanded(false); requestAnimationFrame(() => trigger.current?.focus?.()); };
  useEffect(() => {
    if (!expanded || Platform.OS !== "web") return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); dismiss(); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [expanded]);
  const toggle = () => {
    if (expanded) { dismiss(); return; }
    trigger.current?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
      const panelWidth = Math.min(340, width - 32);
      setAnchor({ x: Math.max(16, Math.min(x + w - panelWidth, width - panelWidth - 16)), y: y + h + 8, width: panelWidth });
      setExpanded(true);
    });
  };
  return <View style={styles.headerBlock}>
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>Roadmap</Text>
      {!!identity && <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel="Streak, level and XP" accessibilityState={{ expanded }} onPress={toggle} style={styles.streak}><Text style={styles.fire}>🔥</Text><Text style={styles.streakText}>{identity.streak?.currentCount ?? 0} day streak</Text></Pressable>}
    </View>
    <Modal transparent visible={expanded} animationType="none" onRequestClose={dismiss} onShow={() => closeButton.current?.focus?.()}>
      <View style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Dismiss level and XP" accessibilityRole="button" onPress={dismiss} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[styles.popover, { left: anchor.x, top: anchor.y, width: anchor.width }]}>
          <CompactJourneyCard levelTitle={identity?.levelTitle} professionalLevel={identity?.professionalLevel} xp={identity?.xp} streakCount={identity?.streak?.currentCount} />
          <Pressable ref={closeButton} accessibilityRole="button" onPress={dismiss} style={styles.disclosure}><Text style={styles.link}>Close level and XP</Text></Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}

/** Roadmap-only summary: preserve existing activity links and readiness policy in disclosure. */
export function RoadmapFoundation({ summary }: { summary?: Module0Summary | null }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  if (!summary) return null;
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel="Module 0, Clinical Readiness" onPress={() => router.push(summary.completed ? { pathname: "/module-0", params: { mode: "review" } } : "/module-0")} style={styles.foundation}>
      <JourneyStage id="foundation" style={styles.foundationArt}><Image source={art.module0} contentFit="contain" style={styles.nodeArt} accessible={false} /></JourneyStage>
      <View style={styles.foundationCopy}>
        <Text style={styles.eyebrow}>MODULE 0</Text><Text style={styles.foundationTitle}>Clinical Readiness</Text>
        <Text style={styles.body}>Build your foundation for confident patient care.</Text>
        <Text style={styles.foundationStatus}>{!summary.storageReady ? "Available after setup" : summary.completed ? "Review →" : "Continue →"}</Text>
      </View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={[styles.disclosure, styles.pathClearance]}>
      <Text style={styles.link}>{expanded ? "Hide" : "Show"} Module 0 activities and progress</Text>
    </Pressable>
    {expanded && <View style={styles.pathClearance}><Module0Card summary={summary} /></View>}
  </View>;
}

function Medal({ tier }: { tier: "GOLD" | "SILVER" | "BRONZE" | null }) {
  if (!tier) return null;
  return <View style={styles.medal} accessible accessibilityLabel={`${tier.toLowerCase()} medal`}>
    <Image accessible={false} source={tier === "GOLD" ? art.gold : tier === "SILVER" ? art.silver : art.bronze} contentFit="contain" style={styles.medalImage} />
  </View>;
}

/** Cross-platform edge veil; original landscape pixels and dimensions remain unchanged. */
export function RoadmapScenery() {
  const { width } = useWindowDimensions();
  const edges: ("top" | "bottom" | "left" | "right")[] = width > 600 ? ["top", "bottom", "left", "right"] : ["top", "bottom"];
  return <View pointerEvents="none" style={styles.scenery}>
    <View style={styles.sceneryImage}>
    <Image source={art.scenery} contentFit="contain" style={styles.nodeArt} accessible={false} />
    </View>
    {edges.map(edge => <View key={edge} style={[edge === "top" || edge === "bottom" ? styles.sceneryFade : styles.scenerySideFade, { [edge]: 0 }]}>
      {Array.from({ length: 24 }, (_, index) => <View key={index} style={{ flex: 1, backgroundColor: `rgba(255,255,255,${edge === "top" || edge === "left" ? 1 - index / 23 : index / 23})` }} />)}
    </View>)}
  </View>;
}

type Encounter<S extends JourneySession> = ReturnType<typeof buildJourney<S>>[number]["rotations"][number]["encounters"][number];
function EncounterNode<S extends JourneySession>({ encounter, onSessionPress, stageId }: { encounter: Encounter<S>; onSessionPress: (session: S) => void; stageId: string }) {
  const { width } = useWindowDimensions();
  const imageWidth = Math.min(210, (Math.min(width, 600) - 40) * (width < 360 ? 0.46 : 0.54));
  const { session, disabled, current, number, medal, action } = encounter;
  const bestScore = typeof session.bestSessionScore === "number" && Number.isFinite(session.bestSessionScore) ? session.bestSessionScore : null;
  const prerequisite = disabled ? session.entryBlocked ? "Complete Module 0 first" : "84% required on previous encounter" : null;
  const parts = sessionDisplayParts(session);
  const source = art[encounter.artwork];
  return <View style={styles.node} testID={`encounter-${session.slug}`}>
    <View style={styles.nodeMain}>
    <JourneyStage id={stageId} style={{ width: imageWidth, height: imageWidth * 1.25 }}>
      {disabled && <Image source={source} tintColor="white" contentFit="contain" accessible={false} style={[styles.nodeArt, { position: "absolute" }]} />}
      <Image source={source} contentFit="contain" accessible={false} style={[styles.nodeArt,
        disabled && { opacity: 0.5 }, disabled && Platform.OS === "web" && ({ filter: "grayscale(1)" } as any)]} />
      <Medal tier={medal} />
    </JourneyStage>
    <View style={styles.nodeCopy}>
      <View style={[styles.number, disabled ? styles.numberLocked : current ? styles.numberCurrent : styles.numberReady]}>
        <Text style={[styles.numberText, disabled && { color: colors.muted }]}>{number}</Text>
      </View>
      <Text style={[styles.patient, disabled && styles.lockedText]}>{parts.patientName}</Text>
      {!!parts.taskTitle && <Text style={[styles.nodeTitle, disabled && styles.lockedText]}>{parts.taskTitle}</Text>}
      <Text style={styles.status}>{disabled ? "🔒 Locked" : current ? action === "Retry" ? "Retry to progress" : "Current encounter" : session.status === "completed" ? "Completed" : "Available"}</Text>
      {bestScore !== null && <Text style={styles.score}>Best score: {String(bestScore)}%</Text>}
      {!!prerequisite && <Text style={styles.prerequisite}>{prerequisite}</Text>}
      {!disabled && <Pressable accessibilityRole="button" accessibilityLabel={`${action}: ${parts.title}`} onPress={() => onSessionPress(session)} style={[styles.action, !current && styles.secondaryAction]}>
        <Text style={[styles.actionText, !current && { color: colors.purple }]}>{action} →</Text>
      </Pressable>}
    </View>
    </View>
  </View>;
}

export function RoadmapJourney<S extends JourneySession>({ paths, onSessionPress, milestoneScales, recommendedSlug }: {
  paths: JourneyPath<S>[]; onSessionPress: (session: S) => void; milestoneScales?: Record<string, Animated.Value>; recommendedSlug?: string | null;
}) {
  useFonts({ RoadmapInter: require("../../../assets/module0/Inter-Regular.ttf"), RoadmapInterBold: require("../../../assets/module0/Inter-Bold.ttf") });
  const journey = buildJourney(paths, recommendedSlug);
  return <View style={styles.journey}>
    {journey.map((path, pathIndex) => <JourneyChain key={path.id} id={path.id} includeFoundation={pathIndex === 0} stages={path.rotations.flatMap(rotation => [`${path.id}:${rotation.id}:marker`, ...rotation.encounters.map(encounter => `${path.id}:${rotation.id}:${encounter.session.id}`), `${path.id}:${rotation.id}:destination`])}>
      {journey.length > 1 && <Text accessibilityRole="header" style={styles.pathTitle}>{path.title}</Text>}
      {path.rotations.map(rotation => <View key={rotation.id} style={styles.rotation}>
        <View style={styles.marker}>
          <JourneyStage id={`${path.id}:${rotation.id}:marker`} style={styles.flag}><Image source={rotation.rotationNumber % 2 ? art.mintFlag : art.pinkFlag} contentFit="contain" style={styles.nodeArt} accessible={false} /></JourneyStage>
          <View style={[styles.rotationLabel, rotation.rotationNumber % 2 === 0 && { backgroundColor: "#fde9ef" }]}>
            <Text style={styles.eyebrow}>ROTATION {rotation.rotationNumber}{rotation.locked ? " · 🔒" : ""}</Text>
            <Text accessibilityRole="header" style={styles.rotationTitle}>{rotation.title}</Text>
          </View>
        </View>
        {rotation.encounters.length === 0 ? <Text style={styles.empty}>No encounters available yet.</Text>
          : rotation.encounters.map((encounter, i) => <View key={encounter.session.id} style={{ marginTop: i === 0 ? 64 : 96 }}>
            <EncounterNode stageId={`${path.id}:${rotation.id}:${encounter.session.id}`} encounter={encounter} onSessionPress={onSessionPress} />
          </View>)}
        <JourneyStage id={`${path.id}:${rotation.id}:scenery`} region style={styles.destination} testID={`destination-${rotation.id}`}>
          <View style={styles.destinationCopy}>
            <Text style={styles.destinationTitle}>Rotation {rotation.rotationNumber} destination</Text>
            <Text style={[styles.body, styles.destinationBody]}>{rotation.mastered ? "Mastery achieved" : rotation.locked ? "Locked" : "In progress"}</Text>
            <Text style={styles.destinationProgress}>{rotation.masteredCount} of {rotation.sessions.length} encounters at 84% or above</Text>
          </View>
          <JourneyStage id={`${path.id}:${rotation.id}:destination`} style={styles.destinationArt}><Animated.View style={[styles.destinationImage, { transform: [{ scale: milestoneScales?.[rotation.id] ?? 1 }] }]}>
            <Image source={art.destination} contentFit="contain" style={styles.destinationImage} accessible={false} />
            {rotation.mastered && <View style={styles.masteredBadge} accessible accessibilityLabel="Rotation mastery achieved"><Text style={styles.masteredCheck}>✓</Text></View>}
          </Animated.View></JourneyStage>
        </JourneyStage>
      </View>)}
    </JourneyChain>)}
  </View>;
}

export const roadmapStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "white" },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, width: "100%", maxWidth: 600, alignSelf: "center" },
});
const styles = StyleSheet.create({
  headerBlock: { backgroundColor: "white", paddingHorizontal: 20, paddingVertical: 12, width: "100%", maxWidth: 600, alignSelf: "center", zIndex: 1 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  popover: { position: "absolute", backgroundColor: "white", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#ede8ff", elevation: 8 },
  title: { fontSize: 29, fontWeight: "700", color: colors.ink, fontFamily: "RoadmapInterBold" },
  streak: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: "#fff0e8", borderRadius: 24, minHeight: 47, paddingHorizontal: 12 },
  fire: { fontSize: 23 }, streakText: { fontSize: 13, fontWeight: "700", color: "#af3d1c" },
  disclosure: { minHeight: 44, justifyContent: "center", paddingVertical: 10 }, link: { backgroundColor: "white", alignSelf: "flex-start", color: colors.purple, fontSize: 13, fontWeight: "600" },
  foundation: { flexDirection: "row", backgroundColor: colors.lavender, borderRadius: 23, minHeight: 192, alignItems: "center", overflow: "hidden" },
  foundationArt: { width: "50%", aspectRatio: 1 }, foundationCopy: { flex: 1, paddingRight: 12, paddingVertical: 18, gap: 9 },
  eyebrow: { color: colors.purple, fontSize: 12, fontWeight: "700", fontFamily: "RoadmapInterBold" },
  foundationTitle: { color: colors.ink, fontSize: 22, fontWeight: "700", fontFamily: "RoadmapInterBold" },
  foundationStatus: { color: colors.purple, fontWeight: "600", fontSize: 13 }, body: { color: colors.body, fontSize: 13, lineHeight: 20 },
  journey: { gap: 16 }, pathTitle: { color: colors.ink, fontSize: 15, fontWeight: "600", marginTop: 14, marginLeft: 40, backgroundColor: "white" },
  pathClearance: { marginLeft: 40 },
  marker: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: "16%" }, flag: { width: 68, height: 68 },
  rotationLabel: { backgroundColor: "#ddf8ee", borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10, gap: 4, flex: 1 },
  rotationTitle: { fontSize: 14, fontWeight: "600", color: colors.ink },
  node: { paddingVertical: 8 }, nodeMain: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 224 },
  nodeArt: { width: "100%", height: "100%" }, nodeCopy: { flex: 1, gap: 7, paddingRight: 4 },
  number: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }, numberReady: { backgroundColor: "#ddf8ee" }, numberCurrent: { backgroundColor: "#ede8ff" }, numberLocked: { backgroundColor: "#edf0f6" },
  numberText: { color: colors.purple, fontSize: 18, fontWeight: "700" }, patient: { backgroundColor: "white", alignSelf: "flex-start", maxWidth: "100%", color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: "600" }, nodeTitle: { backgroundColor: "white", alignSelf: "flex-start", maxWidth: "100%", color: colors.ink, fontSize: 17, lineHeight: 22, fontWeight: "700", fontFamily: "RoadmapInterBold" },
  lockedText: { color: colors.muted }, status: { backgroundColor: "white", alignSelf: "flex-start", maxWidth: "100%", fontSize: 13, lineHeight: 20, color: colors.body }, score: { color: colors.body, fontSize: 13, lineHeight: 20 }, prerequisite: { backgroundColor: "white", alignSelf: "flex-start", maxWidth: "100%", fontSize: 12, lineHeight: 18, color: colors.muted },
  action: { minHeight: 44, justifyContent: "center", alignItems: "center", backgroundColor: colors.purple, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 9, marginTop: 4 }, secondaryAction: { backgroundColor: colors.lavender }, actionText: { color: "white", fontSize: 13, fontWeight: "700", textAlign: "center" },
  medal: { position: "absolute", right: 0, bottom: 6, width: 58, height: 72, alignItems: "center", justifyContent: "center" }, medalImage: { width: 58, height: 72 },
  rotation: { position: "relative", paddingTop: 64 }, scenery: { position: "absolute", top: 0, left: -20, right: -20, bottom: 0, overflow: "hidden" },
  sceneryImage: { position: "absolute", left: 0, right: 0, bottom: 0, aspectRatio: 853 / 1844 }, sceneryFade: { position: "absolute", left: 0, right: 0, height: 96 },
  scenerySideFade: { position: "absolute", top: 0, bottom: 0, width: 64, flexDirection: "row" },
  destination: { position: "relative", paddingBottom: 32, marginTop: 80 }, destinationArt: { width: "100%", aspectRatio: 752 / 900, marginTop: "-28%" }, destinationImage: { width: "100%", height: "100%" },
  masteredBadge: { position: "absolute", right: "7%", bottom: "23%", width: "24%", aspectRatio: 1, backgroundColor: "#ddf8ee", borderColor: "white", borderWidth: 6, borderRadius: 100, justifyContent: "center", alignItems: "center" }, masteredCheck: { fontSize: 26, lineHeight: 28, fontWeight: "700", color: "#147b62" },
  destinationCopy: { alignSelf: "flex-end", width: "52%", paddingRight: 4, gap: 7 }, destinationTitle: { color: "#295e57", fontSize: 15, fontWeight: "700" }, destinationBody: { color: colors.ink }, destinationProgress: { fontSize: 13, lineHeight: 20, color: colors.ink }, empty: { fontSize: 14, color: colors.body, paddingVertical: 30, paddingLeft: 40 },
});
