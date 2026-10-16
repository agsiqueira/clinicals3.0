import type { RefObject } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { MentorAvatar } from "./MentorAvatar";
import { ClinicalsChatComposer } from "./ClinicalsChatComposer";
import { module0Colors as colors, module0Fonts as fonts } from "./module0/tokens";

type Props = {
  visible: boolean; name: string; role: string; slug: string; speaking: boolean;
  welcome: string; messages: { role: "user" | "assistant"; content: string }[]; suggestions: string[];
  voiceEnabled: boolean; onToggleVoice: () => void; input: string; onChangeInput: (text: string) => void;
  sending: boolean; error: string | null; onAsk: (question?: string) => void;
  onMic: () => void; recording: boolean; transcribing: boolean; recordingBusy: boolean;
  onClose: () => void; onBack: () => void; onMeetPatient: () => void;
  dialogueRef: RefObject<ScrollView | null>; onContentSizeChange: () => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

/** Layout only: conversation, audio ownership and clinical navigation stay with the owning screen. */
export function MeetPreceptor(props: Props) {
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const insets = useSafeAreaInsets();
  useFonts({ Module0Inter: require("../../assets/module0/Inter-Regular.ttf"), Module0InterSemiBold: require("../../assets/module0/Inter-SemiBold.ttf"), Module0InterBold: require("../../assets/module0/Inter-Bold.ttf") });
  return <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
    <KeyboardAvoidingView testID="meet-preceptor-backdrop" behavior={Platform.OS === "ios" ? "padding" : "height"} enabled={Platform.OS !== "web"}
      style={[styles.backdrop, mobile && styles.mobileBackdrop, { paddingTop: insets.top + (mobile ? 0 : 24), paddingBottom: insets.bottom + (mobile ? 0 : 24), paddingLeft: insets.left + (mobile ? 0 : 24), paddingRight: insets.right + (mobile ? 0 : 24) }]}>
      <View testID="meet-preceptor" accessibilityViewIsModal onAccessibilityEscape={props.onClose}
        {...(Platform.OS === "web" ? { onKeyDown: (event: any) => { if (event.key === "Escape") { event.stopPropagation(); props.onClose(); } } } : {})}
        style={[styles.card, mobile && styles.mobileCard]}>
        <View style={[styles.header, mobile && styles.mobileHeader]}>
          <Text style={styles.label}>YOUR PRECEPTOR</Text>
          <Pressable testID="meet-preceptor-close" accessibilityRole="button" accessibilityLabel="Close Meet Preceptor" onPress={props.onClose} style={styles.close}>
            <Ionicons name="close" size={24} color={colors.ink} />
          </Pressable>
        </View>
        <ScrollView ref={props.dialogueRef} testID="meet-preceptor-history" style={styles.history} contentContainerStyle={[styles.content, mobile && styles.mobileContent]}
          keyboardShouldPersistTaps="handled" onContentSizeChange={props.onContentSizeChange} onScroll={props.onScroll} scrollEventThrottle={16}>
          <View style={[styles.identity, mobile && styles.mobileIdentity]}>
            <MentorAvatar mentorName={props.name} mentorSlug={props.slug} isSpeaking={props.speaking} size={mobile ? 94 : 124} variant="circle" />
            <View style={styles.identityText}>
              <Text accessibilityRole="header" style={[styles.name, mobile && styles.mobileName]}>{props.name}</Text>
              <Text style={[styles.role, mobile && styles.mobileRole]}>{props.role}</Text>
              <Pressable accessibilityRole="switch" accessibilityLabel="Preceptor voice" accessibilityState={{ checked: props.voiceEnabled }} onPress={props.onToggleVoice} style={styles.voice}>
                <Ionicons name={props.voiceEnabled ? "volume-high-outline" : "volume-mute-outline"} size={16} color={colors.primary} />
                <Text style={styles.voiceText}>Voice: {props.voiceEnabled ? "On" : "Off"}</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.intro}><Text style={styles.label}>ASK YOUR PRECEPTOR</Text><Text style={[styles.introText, mobile && styles.mobileIntroText]}>Get ready for your patient encounter.</Text></View>
          <View style={[styles.bubble, mobile && styles.mobileBubble]}>
            <Text style={styles.label}>{props.name.toUpperCase()}</Text><Text selectable style={[styles.message, mobile && styles.mobileMessage]}>{props.welcome}</Text>
          </View>
          {props.messages.map((message, index) => <View key={`${message.role}-${index}`} style={[styles.bubble, mobile && styles.mobileBubble, message.role === "user" && styles.userBubble]}>
            <Text style={styles.label}>{message.role === "user" ? "YOU" : props.name.toUpperCase()}</Text><Text selectable style={[styles.message, mobile && styles.mobileMessage]}>{message.content}</Text>
          </View>)}
          {props.sending && <View accessibilityLiveRegion="polite" style={styles.loading}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.status}>{props.name} is responding...</Text></View>}
          <View style={styles.suggestions}><Text style={styles.label}>SUGGESTED QUESTIONS</Text>
            {props.suggestions.map((question, index) => <Pressable key={question} accessibilityRole="button" disabled={props.sending} accessibilityState={{ disabled: props.sending }} onPress={() => props.onAsk(question)}
              style={({ pressed }) => [styles.suggestion, mobile ? styles.mobileSuggestion : { minWidth: [274, 250, 235][index] }, (props.sending || pressed) && styles.dimmed]}><Text style={styles.suggestionText}>{question}</Text></Pressable>)}
          </View>
        </ScrollView>
        <View testID="meet-preceptor-footer" style={[styles.footer, mobile && styles.mobileFooter]}>
          {!!props.error && <Text accessibilityRole="alert" style={styles.error}>{props.error}</Text>}
          <ClinicalsChatComposer preceptor value={props.input} onChangeText={props.onChangeInput} editable={!props.sending}
            placeholder={mobile ? `Ask ${props.name} a question...` : "Ask a question before meeting your patient..."} placeholderTextColor="#727EA1"
            submitLabel="Ask" onSubmit={() => props.onAsk()} sendDisabled={props.sending || !props.input.trim()} sending={props.sending}
            onMicPress={props.onMic} micDisabled={props.sending || props.transcribing || props.recordingBusy} transcribing={props.transcribing} isRecording={props.recording} />
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={props.onBack} style={[styles.back, mobile && styles.mobileBack]}><Text style={styles.backText}>Back</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={props.onMeetPatient} style={[styles.primary, mobile && styles.mobilePrimary]}><Text style={styles.primaryText}>Meet Patient</Text><Ionicons name="arrow-forward" size={18} color="white" /></Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF0F7" },
  mobileBackdrop: { backgroundColor: "white" },
  card: { width: "100%", maxWidth: 736, height: 816, maxHeight: "100%", backgroundColor: "white", borderWidth: 1, borderColor: "rgba(229,227,244,0.8)", borderRadius: 22, overflow: "hidden" },
  mobileCard: { height: "100%" },
  header: { paddingHorizontal: 30, paddingTop: 26, paddingBottom: 19, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  mobileHeader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F2EEFF", alignItems: "center", justifyContent: "center" },
  label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 16, color: colors.primary },
  history: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 30, paddingBottom: 26, gap: 19 },
  mobileContent: { paddingHorizontal: 16, paddingBottom: 20, gap: 16 },
  identity: { borderRadius: 20, backgroundColor: "#F7F6FC", paddingHorizontal: 20, paddingVertical: 18, flexDirection: "row", alignItems: "center", gap: 15 },
  mobileIdentity: { padding: 14 },
  identityText: { flex: 1, minWidth: 0, gap: 6 },
  name: { fontFamily: fonts.bold, fontSize: 26, color: colors.ink },
  mobileName: { fontSize: 22 },
  role: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: "#727EA1" },
  mobileRole: { fontSize: 12, lineHeight: 18 },
  voice: { alignSelf: "flex-start", minHeight: 44, paddingHorizontal: 9, borderRadius: 14, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, backgroundColor: "#F2EEFF" },
  voiceText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary },
  intro: { gap: 6 },
  introText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: "#727EA1" },
  mobileIntroText: { fontSize: 14 },
  bubble: { backgroundColor: "#EEF1FB", borderRadius: 16, padding: 20, gap: 8 },
  mobileBubble: { paddingHorizontal: 16, paddingVertical: 17 },
  userBubble: { backgroundColor: "#F2EEFF" },
  message: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.ink },
  mobileMessage: { fontSize: 14, lineHeight: 21 },
  suggestions: { gap: 9 },
  suggestion: { alignSelf: "flex-start", maxWidth: "100%", paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: "center", borderRadius: 12, backgroundColor: "#F2EEFF" },
  mobileSuggestion: { alignSelf: "stretch" },
  suggestionText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.primary },
  loading: { flexDirection: "row", alignItems: "center", gap: 8 },
  status: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: "#727EA1" },
  footer: { borderTopWidth: 1, borderColor: "#E5E3F4", backgroundColor: "white", paddingHorizontal: 30, paddingVertical: 12, gap: 12, flexShrink: 0 },
  mobileFooter: { paddingHorizontal: 16 },
  error: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: "#B42318" },
  actions: { flexDirection: "row", gap: 10 },
  back: { width: 110, minHeight: 44, borderRadius: 14, backgroundColor: "#F7F6FC", alignItems: "flex-start", justifyContent: "center", paddingHorizontal: 12 },
  mobileBack: { width: 86 },
  backText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  primary: { minWidth: 192, minHeight: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.primary, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  mobilePrimary: { flex: 1, minWidth: 0 },
  primaryText: { fontFamily: fonts.bold, fontSize: 14, color: "white" },
  dimmed: { opacity: 0.5 },
});
