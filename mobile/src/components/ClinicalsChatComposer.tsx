import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { module0Colors as c, module0Fonts as f } from "./module0/tokens";

type ClinicalsChatComposerProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend?: () => void;
  onSubmit?: () => void;
  onMicPress: () => void;
  placeholder?: string;
  placeholderTextColor?: string;
  submitLabel?: string;
  submitAccessibilityLabel?: string;
  editable?: boolean;
  sendDisabled?: boolean;
  micDisabled?: boolean;
  sending?: boolean;
  transcribing?: boolean;
  isRecording?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputAccessibilityLabel?: string;
  microphoneAccessibilityLabel?: string;
  showMicrophoneControl?: boolean;
  compact?: boolean;
  inputStyle?: StyleProp<TextStyle>;
  showSendControl?: boolean;
  lesson?: boolean;
  practice?: boolean;
  preceptor?: boolean;
};

export function ClinicalsChatComposer({
  value,
  onChangeText,
  onSend,
  onSubmit,
  onMicPress,
  placeholder = "Type a message...",
  placeholderTextColor,
  submitLabel = "Send",
  submitAccessibilityLabel,
  editable = true,
  sendDisabled = false,
  micDisabled = false,
  sending = false,
  transcribing = false,
  isRecording = false,
  containerStyle,
  inputAccessibilityLabel = "Message text input",
  microphoneAccessibilityLabel,
  showMicrophoneControl = true,
  compact = false,
  inputStyle,
  showSendControl = true,
  lesson = false,
  practice = false,
  preceptor = false,
}: ClinicalsChatComposerProps) {
  if (practice) return <PracticeComposer value={value} onChangeText={onChangeText} onSubmit={onSubmit || onSend} onMicPress={onMicPress}
    editable={editable} sendDisabled={sendDisabled} micDisabled={micDisabled} sending={sending} transcribing={transcribing} isRecording={isRecording}
    placeholder={placeholder} inputAccessibilityLabel={inputAccessibilityLabel} submitLabel={submitLabel} showSendControl={showSendControl} />;
  const submit = onSubmit || onSend || (() => {});
  const safelySubmit = () => { if (!sendDisabled && editable && !sending && !transcribing && !isRecording && value.trim()) submit(); };

  const field = (
    <View style={[styles.container, compact && styles.compactContainer, lesson && styles.lessonContainer, preceptor && styles.preceptorContainer, containerStyle]}>
      <TextInput
        accessibilityLabel={inputAccessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        style={[styles.input, compact && styles.compactInput, lesson && styles.lessonInput, preceptor && styles.preceptorInput, inputStyle]}
        editable={editable}
        returnKeyType="send"
        onSubmitEditing={lesson ? safelySubmit : submit}
      />
      {showMicrophoneControl && !lesson ? <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          microphoneAccessibilityLabel ||
          (isRecording ? "Stop microphone recording" : "Start microphone recording")
        }
        onPress={onMicPress}
        disabled={micDisabled}
        style={({ pressed }) => [
          styles.iconButton,
          preceptor && styles.preceptorMic,
          micDisabled && styles.disabled,
          pressed && !micDisabled && styles.pressed,
        ]}
      >
        {preceptor ? <MaterialCommunityIcons name={transcribing ? "progress-clock" : isRecording ? "stop" : "microphone-outline"} size={22} color={c.primary} /> : <Text style={styles.buttonText}>{transcribing ? "..." : isRecording ? "⏹️" : "🎤"}</Text>}
      </Pressable> : null}
      {showSendControl && <Pressable
        accessibilityRole="button"
        accessibilityLabel={submitAccessibilityLabel || submitLabel}
        accessibilityState={{disabled:sendDisabled || lesson && (isRecording || transcribing),busy:sending}}
        onPress={lesson ? safelySubmit : submit}
        disabled={sendDisabled || lesson && (isRecording || transcribing)}
        style={({ pressed }) => [
          styles.sendButton,
          preceptor && styles.preceptorSend,
          lesson && styles.lessonSend,
          (sendDisabled || lesson && (isRecording || transcribing)) && styles.disabled,
          pressed && !sendDisabled && styles.pressed,
        ]}
      >
        <Text style={[styles.sendButtonText,lesson && styles.lessonSendText, preceptor && styles.preceptorSendText]}>{sending ? "..." : submitLabel}</Text>
      </Pressable>}
    </View>
  );
  if (!lesson) return field;
  return <View style={styles.lessonWrapper}>
    {showMicrophoneControl && <Pressable accessibilityRole="button" accessibilityLabel={microphoneAccessibilityLabel || (isRecording ? "Stop microphone recording" : transcribing ? "Transcribing audio" : "Start microphone recording")} accessibilityState={{disabled:micDisabled,busy:transcribing,selected:isRecording}} onPress={onMicPress} disabled={micDisabled} style={({pressed})=>[styles.lessonMic,micDisabled && styles.disabled,pressed && styles.pressed]}><MaterialCommunityIcons name={isRecording ? "stop" : transcribing ? "progress-clock" : "microphone-outline"} size={24} color="#6150ed" /></Pressable>}
    {field}
  </View>;
}

/** Module 0 presentation variant; uses the same callbacks and one controlled text draft. */
function PracticeComposer({ value, onChangeText, onSubmit, onMicPress, editable = true, sendDisabled, micDisabled, sending,
  transcribing, isRecording, placeholder, inputAccessibilityLabel, submitLabel, showSendControl = true }: ClinicalsChatComposerProps) {
  const { height } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const shown = Keyboard.addListener("keyboardDidShow", event => setKeyboardHeight(event.endCoordinates.height));
    const hidden = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => { shown.remove(); hidden.remove(); };
  }, []);
  const availableHeight = Math.max(200, height - keyboardHeight);
  const [expansion, setExpansion] = useState<boolean | null>(null);
  const expanded = expansion ?? (value.length > 160 || value.split("\n").length > 2);
  // Leave a scrollable task/reference region above the dock even in a reduced viewport.
  const fieldHeight = Math.max(48, Math.min(expanded ? 162 : 54, availableHeight * (availableHeight < 600 ? 0.16 : 0.24)));
  const blocked = !editable || sendDisabled || sending || isRecording || transcribing || !value.trim();
  return <View style={practiceStyles.composer}>
    <TextInput multiline scrollEnabled textAlignVertical="top" accessibilityLabel={inputAccessibilityLabel}
      value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.placeholder}
      editable={editable} returnKeyType="default" submitBehavior="newline"
      style={[practiceStyles.input, { height: fieldHeight }]} />
    <View style={practiceStyles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={isRecording ? "Stop microphone recording" : transcribing ? "Transcribing audio" : "Start microphone recording"}
        accessibilityState={{ disabled: !!micDisabled, busy: !!transcribing, selected: !!isRecording }} disabled={micDisabled}
        onPress={onMicPress} style={[practiceStyles.icon, micDisabled && styles.disabled]}>
        <MaterialCommunityIcons name={isRecording ? "stop" : transcribing ? "progress-clock" : "microphone-outline"} size={24} color={c.primary} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? "Collapse response field" : "Expand response field"}
        accessibilityState={{ expanded }} aria-expanded={expanded} onPress={() => setExpansion(!expanded)} style={practiceStyles.icon}>
        <MaterialCommunityIcons name={expanded ? "arrow-collapse-vertical" : "arrow-expand-vertical"} size={22} color={c.body} />
      </Pressable>
    </View>
    {showSendControl && <Pressable accessibilityRole="button" accessibilityLabel={submitLabel} accessibilityState={{ disabled: !!blocked, busy: !!sending }} disabled={blocked}
      onPress={() => { if (!blocked) onSubmit?.(); }} style={({ pressed }) => [practiceStyles.submit, blocked && styles.disabled, pressed && styles.pressed]}>
      <Text style={practiceStyles.submitText}>{sending ? "Preparing feedback…" : submitLabel}</Text>
    </Pressable>}
  </View>;
}

const practiceStyles = StyleSheet.create({
  composer: { gap: 8 }, input: { fontFamily: f.regular, fontSize: 14, lineHeight: 22, color: c.ink, backgroundColor: c.reply,
    borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, width: "100%" },
  actions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: -6 },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  submit: { minHeight: 54, borderRadius: 14, backgroundColor: c.primary, padding: 14, alignItems: "center", justifyContent: "center" },
  submitText: { fontFamily: f.semibold, fontSize: 15, lineHeight: 21, color: c.background },
});

const styles = StyleSheet.create({
  preceptorContainer: { marginHorizontal: 0, marginTop: 0, padding: 7, gap: 4, borderWidth: 0, borderRadius: 16, backgroundColor: "#F7F6FC" },
  preceptorInput: { minHeight: 44, borderWidth: 0, borderRadius: 12, fontFamily: f.regular, fontWeight: "normal", fontSize: 13, color: c.ink },
  preceptorMic: { minHeight: 44, width: 44, minWidth: 44, paddingHorizontal: 0, paddingVertical: 0, borderWidth: 0, borderRadius: 14, justifyContent: "center" },
  preceptorSend: { minHeight: 44, minWidth: 52, paddingHorizontal: 10, paddingVertical: 0, borderWidth: 0, borderRadius: 14, backgroundColor: "#F2EEFF", justifyContent: "center" },
  preceptorSendText: { fontFamily: f.bold, fontWeight: "normal", fontSize: 12, color: c.primary },
  lessonWrapper:{width:"100%",paddingTop:4},
  lessonMic:{alignSelf:"center",width:44,height:44,alignItems:"center",justifyContent:"center",borderRadius:22,backgroundColor:"#f3f1ff",marginBottom:8},
  lessonContainer:{marginHorizontal:0,marginTop:0,padding:6,borderRadius:16,backgroundColor:"#ffffff",minHeight:64},
  lessonInput:{borderWidth:0,fontFamily:"Module0Inter",fontWeight:"normal",fontSize:16,lineHeight:24,minHeight:52},
  lessonSend:{minWidth:64,minHeight:44,borderWidth:0,borderRadius:12,backgroundColor:"#6150ed",justifyContent:"center"},
  lessonSendText:{fontFamily:"Module0InterSemiBold",fontWeight:"normal",color:"#ffffff",fontSize:14},
  container: {
    marginHorizontal: 12,
    marginTop: 4,
    padding: 10,
    width: "100%",
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#faf5ff",
  },
  input: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: "#ede9fe",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    color: "#111827",
    fontWeight: "600",
  },
  iconButton: {
    minWidth: 42,
    flexShrink: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  sendButton: {
    minWidth: 48,
    flexShrink: 0,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  buttonText: {
    color: "#6d28d9",
    fontWeight: "800",
  },
  sendButtonText: {
    color: "#6d28d9",
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.65,
  },
  compactContainer: {
    marginHorizontal: 0,
    marginTop: 0,
    borderWidth: 0,
    borderRadius: 14,
    backgroundColor: "transparent",
  },
  compactInput: {
    borderWidth: 0,
  },
});
