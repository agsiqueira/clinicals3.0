import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { PatientAvatar } from "./PatientAvatar";
import { module0Colors, module0Fonts as fonts } from "./module0/tokens";
import { overviewEncounterTitle, overviewPatientName, overviewReasonForVisit } from "../utils/clinicalDisplay";

type BriefData = {
  slug: string; title: string; linkedCase?: { caseId: string; title?: string | null } | null;
  achievements: { id: string; title: string }[];
  estimatedTime: { min?: number | null; max?: number | null };
};
type Props = {
  visible: boolean; loading: boolean; error: string | null; overview: BriefData | null;
  mission: string; preceptorName: string; evaluationExpanded: boolean;
  weights: (string | null)[]; thresholds: { gold: string; silver: string; bronze: string };
  hasPreviousAttempts: boolean; onToggleEvaluation: () => void; onPreviousAttempts: () => void;
  onClose: () => void; onMeetPreceptor: () => void;
};
const colors = { ...module0Colors, lavender: "#F2EEFF", muted: "#727EA1", surface: "#F7F6FC", border: "rgba(229,227,244,0.8)" };

/** Presentation only: the owning Roadmap retains authenticated data and clinical navigation. */
export function PatientBrief(props: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mobile = width < 768;
  useFonts({
    Module0Inter: require("../../assets/module0/Inter-Regular.ttf"),
    Module0InterSemiBold: require("../../assets/module0/Inter-SemiBold.ttf"),
    Module0InterBold: require("../../assets/module0/Inter-Bold.ttf"),
  });
  const { overview, onClose } = props;
  const close = <Pressable testID="patient-brief-close" accessibilityRole="button" accessibilityLabel="Close Patient Brief" onPress={onClose} style={styles.closeIcon}>
    <Ionicons name="close" size={23} color={colors.ink} />
  </Pressable>;
  return <Modal visible={props.visible} transparent animationType="fade" onRequestClose={onClose}>
    <View testID="patient-brief-backdrop" style={[styles.backdrop, mobile && styles.mobileBackdrop, { paddingTop: insets.top + (mobile ? 14 : 24), paddingBottom: insets.bottom + (mobile ? 14 : 24), paddingLeft: insets.left + (mobile ? 16 : 24), paddingRight: insets.right + (mobile ? 16 : 24) }]}>
      <View testID="patient-brief" accessibilityViewIsModal onAccessibilityEscape={onClose}
        {...(Platform.OS === "web" ? { onKeyDown: (event: any) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } } } : {})}
        style={[styles.card, mobile && styles.mobileCard]}>
        {mobile && <View style={styles.topBar}><Text style={styles.eyebrow}>PATIENT BRIEF</Text>{close}</View>}
        {props.loading ? <View style={styles.loading}><ActivityIndicator accessibilityLabel="Loading Patient Brief" />{!mobile && close}</View>
          : props.error ? <View style={styles.loading}><Text accessibilityRole="alert" style={styles.body}>{props.error}</Text>{!mobile && close}</View>
          : overview ? <>
            <ScrollView testID="patient-brief-scroll" style={styles.scroll} contentContainerStyle={[styles.content, mobile && styles.mobileContent]}>
              <View style={styles.identity}>
                <PatientAvatar patientName={overviewPatientName(overview)} patientSessionSlug={overview.slug} caseId={overview.linkedCase?.caseId} size={54} showRing={false} status="available" />
                <View style={styles.identityText}>
                  <Text accessibilityRole="header" style={[styles.name, mobile && styles.mobileName]}>{overviewPatientName(overview)}</Text>
                  <Text style={[styles.encounter, mobile && styles.mobileEncounter]}>{overviewEncounterTitle(overview)}</Text>
                </View>
                {!mobile && <View style={styles.badge}><Text style={styles.badgeText}>PATIENT BRIEF</Text></View>}
              </View>
              {!!overviewReasonForVisit(overview) && <View style={styles.reason}>
                <Text style={styles.smallLabel}>REASON FOR VISIT</Text>
                <Text style={[styles.reasonText, mobile && styles.mobileReason]}>{overviewReasonForVisit(overview)}</Text>
              </View>}
              <View style={styles.mission}><Text style={styles.eyebrow}>YOUR MISSION</Text><Text style={[styles.body, mobile && styles.mobileBody]}>{props.mission}</Text></View>
              <View style={[styles.focus, mobile && styles.mobileFocus]}>
                <Text accessibilityRole="header" style={[styles.sectionTitle, mobile && styles.mobileSectionTitle]}>Today’s Focus</Text>
                {overview.achievements.map(item => <View key={item.id} style={styles.objective}>
                  <Ionicons name="checkmark" size={16} color={colors.ink} /><Text style={styles.objectiveText}>{item.title}</Text>
                </View>)}
              </View>
              <View style={styles.duration}><Ionicons name="time-outline" size={18} color={colors.primary} /><Text style={styles.durationText}>Estimated time · {overview.estimatedTime.min || 3}–{overview.estimatedTime.max || 5} minutes</Text></View>
              <View style={styles.handoff}><Text style={styles.smallLabel}>NEXT STEP</Text><Text style={styles.handoffText}>Meet with {props.preceptorName} before entering the encounter.</Text></View>
              <View style={styles.secondary}>
                <Pressable accessibilityRole="button" accessibilityLabel={props.evaluationExpanded ? "Hide evaluation details" : "Show evaluation details"} accessibilityState={{ expanded: props.evaluationExpanded }} onPress={props.onToggleEvaluation} style={styles.secondaryButton}>
                  <Text style={[styles.link, mobile && styles.mobileLink]}>Evaluation details</Text><Ionicons name={props.evaluationExpanded ? "chevron-down" : "chevron-forward"} size={14} color={colors.primary} />
                </Pressable>
                {props.hasPreviousAttempts && <Pressable accessibilityRole="button" accessibilityLabel="View Previous Attempts" accessibilityHint="All attempts for this patient's case, across encounters." onPress={props.onPreviousAttempts} style={styles.secondaryButton}>
                  <Text style={[styles.link, mobile && styles.mobileLink]}>Previous attempts</Text><Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </Pressable>}
              </View>
              {props.evaluationExpanded && <View testID="patient-brief-evaluation" style={styles.focus}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>How You’ll Be Evaluated</Text>
                {overview.achievements.map((item, index) => <View key={item.id} style={styles.evaluationRow}><Text style={styles.objectiveText}>{item.title}</Text>{!!props.weights[index] && <Text style={styles.detail}>Worth {props.weights[index]} of your session score</Text>}</View>)}
                <Text accessibilityRole="header" style={styles.sectionTitle}>Performance Levels</Text>
                {(["gold", "silver", "bronze"] as const).map(tier => <View key={tier} style={styles.performance}><Ionicons name="medal-outline" size={20} color={tier === "gold" ? "#A57516" : tier === "silver" ? "#67748F" : "#986137"} /><Text style={styles.objectiveText}>{tier[0].toUpperCase() + tier.slice(1)}</Text><Text style={styles.detail}>{props.thresholds[tier]}</Text></View>)}
              </View>}
            </ScrollView>
            <View testID="patient-brief-footer" style={[styles.footer, mobile && styles.mobileFooter]}>
              {!mobile && <Pressable accessibilityRole="button" accessibilityLabel="Close Patient Brief" onPress={onClose} style={styles.closeButton}><Text style={styles.closeText}>Close</Text></Pressable>}
              <Pressable accessibilityRole="button" onPress={props.onMeetPreceptor} style={[styles.primary, mobile && styles.mobilePrimary]}><Text style={[styles.primaryText, mobile && styles.mobilePrimaryText]}>Meet Preceptor</Text><Ionicons name="arrow-forward" size={18} color="white" /></Pressable>
            </View>
          </> : null}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#EEF0F7", alignItems: "center", justifyContent: "center" },
  mobileBackdrop: { backgroundColor: "white", justifyContent: "flex-start" },
  card: { width: "100%", maxWidth: 736, maxHeight: "100%", flexShrink: 1, backgroundColor: "white", borderWidth: 1, borderColor: colors.border, borderRadius: 24, overflow: "hidden" },
  mobileCard: { maxWidth: 480 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, marginTop: 18, marginHorizontal: 18, marginBottom: 17, flexShrink: 0 },
  closeIcon: { height: 44, width: 44, borderRadius: 22, backgroundColor: colors.lavender, alignItems: "center", justifyContent: "center" },
  scroll: { flexShrink: 1 },
  content: { padding: 26, paddingBottom: 0, gap: 18 },
  mobileContent: { padding: 18, paddingTop: 0, paddingBottom: 0, gap: 17 },
  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  identityText: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontFamily: fonts.bold, fontSize: 25, color: colors.ink },
  mobileName: { fontSize: 22 },
  encounter: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.muted },
  mobileEncounter: { fontSize: 12, lineHeight: 17 },
  badge: { backgroundColor: colors.lavender, padding: 10, borderRadius: 14, minHeight: 40, justifyContent: "center" },
  badgeText: { color: colors.primary, fontFamily: fonts.semibold, fontSize: 11 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
  smallLabel: { fontFamily: fonts.bold, fontSize: 10, color: colors.primary },
  reason: { backgroundColor: colors.lavender, borderRadius: 18, padding: 15, gap: 5 },
  reasonText: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  mobileReason: { fontSize: 17 },
  mission: { gap: 8 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink },
  mobileBody: { fontSize: 14 },
  focus: { borderRadius: 18, backgroundColor: colors.surface, padding: 18, gap: 12 },
  mobileFocus: { padding: 14 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  mobileSectionTitle: { fontSize: 16 },
  objective: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "white", borderRadius: 10, minHeight: 40, paddingHorizontal: 12, paddingVertical: 10 },
  objectiveText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 19, color: colors.ink, flexShrink: 1 },
  duration: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 10 },
  durationText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 19, color: colors.muted, flexShrink: 1 },
  handoff: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 5 },
  handoffText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 19, color: colors.ink },
  secondary: { flexDirection: "row", gap: 16 },
  secondaryButton: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 },
  link: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.primary, flexShrink: 1 },
  mobileLink: { fontSize: 12 },
  evaluationRow: { gap: 4 },
  detail: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted },
  performance: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  footer: { flexDirection: "row", gap: 8, padding: 26, paddingTop: 18, flexShrink: 0, backgroundColor: "white" },
  mobileFooter: { padding: 18, paddingTop: 17 },
  closeButton: { minHeight: 44, borderRadius: 14, paddingHorizontal: 12, minWidth: 90, alignItems: "flex-start", justifyContent: "center", backgroundColor: colors.surface },
  closeText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.ink },
  primary: { minHeight: 44, borderRadius: 17, paddingHorizontal: 16, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  mobilePrimary: { flex: 1 },
  primaryText: { fontFamily: fonts.bold, fontSize: 15, color: "white" },
  mobilePrimaryText: { fontSize: 16 },
  loading: { padding: 26, gap: 18, alignItems: "center" },
});
