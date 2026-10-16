import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { MentorAvatar } from "./MentorAvatar";
import { module0Fonts as f } from "./module0/tokens";
export function DebriefSheet({ visible, onClose, speaking, voice, children, composer, actions }: {
    visible: boolean;
    onClose: () => void;
    speaking: boolean;
    voice: ReactNode;
    children: ReactNode;
    composer: ReactNode;
    actions: ReactNode;
}) {
    const { width } = useWindowDimensions(), mobile = width < 720, insets = useSafeAreaInsets();
    useFonts({ Module0Inter: require("../../assets/module0/Inter-Regular.ttf"), Module0InterSemiBold: require("../../assets/module0/Inter-SemiBold.ttf"), Module0InterBold: require("../../assets/module0/Inter-Bold.ttf") });
    return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView testID="debrief-backdrop" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'} style={[styles.backdrop, { paddingTop: insets.top + (mobile ? 0 : 24), paddingBottom: insets.bottom + (mobile ? 0 : 24), paddingLeft: insets.left + (mobile ? 0 : 24), paddingRight: insets.right + (mobile ? 0 : 24) }]}>
      <View testID="clinical-debrief" style={[styles.sheet, mobile && styles.mobile]} onAccessibilityEscape={onClose} {...(Platform.OS === 'web' ? { onKeyDown: (e: any) => { if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
        } } } : {})}>
        <View style={[styles.header, { paddingHorizontal: mobile ? 17 : 28 }]}><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.label}>SESSION COMPLETE</Text><Text accessibilityRole="header" style={[styles.title, mobile && { fontSize: 23 }]}>Your Clinical Debrief</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close Clinical Debrief" onPress={onClose} style={styles.close}><Ionicons name="close" size={23} color="#152044"/></Pressable></View>
        <ScrollView testID="debrief-history" style={{ flex: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: mobile ? 17 : 28, paddingBottom: 17, gap: 15 }}>
          <View style={styles.identity}><MentorAvatar mentorName="Dr. Martinez" mentorSlug="dr-martinez" isSpeaking={speaking} size={mobile ? 58 : 72} variant="circle"/><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.name}>Dr. Martinez</Text><Text style={styles.subtitle}>Post-session coaching</Text></View>{voice}</View>
          {children}
        </ScrollView>
        <View testID="debrief-footer" style={[styles.footer, { paddingHorizontal: mobile ? 17 : 28 }]}>{composer}{actions}</View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({ backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#EDF0F7" }, sheet: { width: "100%", maxWidth: 736, height: 820, maxHeight: "100%", borderRadius: 20, backgroundColor: "white", overflow: "hidden" }, mobile: { height: "100%" }, header: { paddingVertical: 17, flexDirection: "row", alignItems: "center", gap: 8 }, label: { fontFamily: f.bold, fontSize: 11, color: "#6150ED" }, title: { fontFamily: f.bold, fontSize: 28, color: "#152044" }, close: { height: 44, width: 44, borderRadius: 22, backgroundColor: "#F2EEFF", alignItems: "center", justifyContent: "center" }, identity: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, backgroundColor: "#F7F6FC", padding: 14, borderRadius: 18 }, name: { fontFamily: f.bold, fontSize: 17, color: "#152044" }, subtitle: { fontFamily: f.regular, fontSize: 12, lineHeight: 18, color: "#727EA1" }, footer: { paddingVertical: 13, gap: 10, borderTopWidth: 1, borderColor: "#E5E3F4", backgroundColor: "white", flexShrink: 0 } });
