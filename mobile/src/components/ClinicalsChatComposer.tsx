import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
}: ClinicalsChatComposerProps) {
  const submit = onSubmit || onSend || (() => {});
  const safelySubmit = () => { if (!sendDisabled && editable && !sending && !transcribing && !isRecording && value.trim()) submit(); };

  const field = (
    <View style={[styles.container, compact && styles.compactContainer, lesson && styles.lessonContainer, containerStyle]}>
      <TextInput
        accessibilityLabel={inputAccessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        style={[styles.input, compact && styles.compactInput, lesson && styles.lessonInput, inputStyle]}
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
          micDisabled && styles.disabled,
          pressed && !micDisabled && styles.pressed,
        ]}
      >
        <Text style={styles.buttonText}>{transcribing ? "..." : isRecording ? "⏹️" : "🎤"}</Text>
      </Pressable> : null}
      {showSendControl && <Pressable
        accessibilityRole="button"
        accessibilityLabel={submitAccessibilityLabel || submitLabel}
        accessibilityState={{disabled:sendDisabled || lesson && (isRecording || transcribing),busy:sending}}
        onPress={lesson ? safelySubmit : submit}
        disabled={sendDisabled || lesson && (isRecording || transcribing)}
        style={({ pressed }) => [
          styles.sendButton,
          lesson && styles.lessonSend,
          (sendDisabled || lesson && (isRecording || transcribing)) && styles.disabled,
          pressed && !sendDisabled && styles.pressed,
        ]}
      >
        <Text style={[styles.sendButtonText,lesson && styles.lessonSendText]}>{sending ? "..." : submitLabel}</Text>
      </Pressable>}
    </View>
  );
  if (!lesson) return field;
  return <View style={styles.lessonWrapper}>
    {showMicrophoneControl && <Pressable accessibilityRole="button" accessibilityLabel={microphoneAccessibilityLabel || (isRecording ? "Stop microphone recording" : transcribing ? "Transcribing audio" : "Start microphone recording")} accessibilityState={{disabled:micDisabled,busy:transcribing,selected:isRecording}} onPress={onMicPress} disabled={micDisabled} style={({pressed})=>[styles.lessonMic,micDisabled && styles.disabled,pressed && styles.pressed]}><MaterialCommunityIcons name={isRecording ? "stop" : transcribing ? "progress-clock" : "microphone-outline"} size={24} color="#6150ed" /></Pressable>}
    {field}
  </View>;
}

const styles = StyleSheet.create({
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
