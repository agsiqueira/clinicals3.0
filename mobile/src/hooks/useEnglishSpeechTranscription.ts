import { useAuth } from "@clerk/clerk-expo";
import { captureSession } from "../api/sessionToken";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { api } from "../api/client";

function getMimeTypeFromRecordingUri(uri: string) {
  const normalized = String(uri || "").toLowerCase();
  if (normalized.endsWith(".wav")) return "audio/wav";
  if (normalized.endsWith(".caf")) return "audio/x-caf";
  if (normalized.endsWith(".3gp")) return "audio/3gpp";
  if (normalized.endsWith(".aac")) return "audio/aac";
  if (normalized.endsWith(".mp3")) return "audio/mpeg";
  return "audio/m4a";
}

async function blobToBase64(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

type UseEnglishSpeechTranscriptionOptions = {
  onText: (text: string) => void;
  onError?: (error: unknown) => void;
  enabled?: boolean;
  scopeKey?: string;
};

export function useEnglishSpeechTranscription({
  onText,
  onError,
  enabled = true,
  scopeKey = "",
}: UseEnglishSpeechTranscriptionOptions) {
  const { userId } = useAuth();
  const mountedRef = useRef(true);
  const contextRef = useRef({ userId, scopeKey, enabled });
  contextRef.current = { userId, scopeKey, enabled };
  const epochRef = useRef(0);
  const capture = useCallback(() => {
    const assertSession = captureSession(userId);
    const epoch = epochRef.current;
    return () => {
      assertSession();
      if (!mountedRef.current || !contextRef.current.enabled || contextRef.current.userId !== userId || contextRef.current.scopeKey !== scopeKey || epoch !== epochRef.current) throw new Error("Recording context changed");
    };
  }, [userId, scopeKey]);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webAudioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);

  const startRecording = useCallback(async () => {
    if (!enabled || recordingBusy || transcribing || isRecording) return;

    if (Platform.OS === "web") {
      const expectedScope = contextRef.current;
      const expectedEpoch = epochRef.current;
      const current = () => mountedRef.current && contextRef.current.enabled && contextRef.current.userId === expectedScope.userId && contextRef.current.scopeKey === expectedScope.scopeKey && epochRef.current === expectedEpoch;
      let localStream: MediaStream | null = null;
      setRecordingBusy(true);
      try {
        const assertCurrent = capture();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream = stream;
        try { assertCurrent(); } catch (error) { stream.getTracks().forEach(track => track.stop()); throw error; }
        const recorder = new MediaRecorder(stream);
        webAudioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (current() && event.data.size > 0) {
            webAudioChunksRef.current.push(event.data);
          }
        };

        recorder.start();
        webMediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (error) {
        if (localStream && current()) localStream.getTracks().forEach(track => track.stop());
        if (current()) onError?.(error);
      } finally {
        if (current()) setRecordingBusy(false);
      }
      return;
    }

    const expectedScope = contextRef.current;
    const expectedEpoch = epochRef.current;
    const current = () => mountedRef.current && contextRef.current.enabled && contextRef.current.userId === expectedScope.userId && contextRef.current.scopeKey === expectedScope.scopeKey && epochRef.current === expectedEpoch;
    let localRecording: Audio.Recording | null = null;
    setRecordingBusy(true);
    try {
      const assertCurrent = capture();
      const permission = await Audio.requestPermissionsAsync();
      assertCurrent();
      if (!permission.granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      assertCurrent();
      const recording = new Audio.Recording();
      localRecording = recording;
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      assertCurrent();
      await recording.startAsync();

      try { assertCurrent(); } catch (error) { await recording.stopAndUnloadAsync().catch(() => {}); throw error; }
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      if (localRecording) {
        await localRecording.stopAndUnloadAsync().catch(() => {});
        const uri = localRecording.getURI();
        if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      }
      if (current()) { recordingRef.current = null; setIsRecording(false); onError?.(error); }
    } finally {
      if (current()) setRecordingBusy(false);
    }
  }, [isRecording, onError, recordingBusy, transcribing, userId, enabled, capture]);

  const stopRecordingAndTranscribe = useCallback(async () => {
    if (!enabled || recordingBusy) return;

    const expectedScope = contextRef.current;
    const expectedEpoch = epochRef.current;
    const current = () => mountedRef.current && contextRef.current.enabled && contextRef.current.userId === expectedScope.userId && contextRef.current.scopeKey === expectedScope.scopeKey && epochRef.current === expectedEpoch;

    if (Platform.OS === "web") {
      const recorder = webMediaRecorderRef.current;
      if (!recorder) return;

      setRecordingBusy(true);
      setIsRecording(false);
      setTranscribing(true);

      try {
        const assertCurrent = capture();
        const chunks = webAudioChunksRef.current;
        const audioBlob: Blob = await new Promise((resolve) => {
          recorder.onstop = () => {
            resolve(new Blob(chunks, { type: "audio/webm" }));
          };
          recorder.stop();
        });

        recorder.stream.getTracks().forEach((track) => track.stop());
        if (webMediaRecorderRef.current === recorder) webMediaRecorderRef.current = null;

        const audioBase64 = await blobToBase64(audioBlob);
        assertCurrent();
        const data = await api.transcribeVoice({
          audio_base64: audioBase64,
          mime_type: "audio/webm",
          language: "en",
        }, { expectedUserId: userId || "" });

        assertCurrent();
        if (data?.text) onText(data.text);
      } catch (error) {
        if (current()) onError?.(error);
      } finally {
        if (current()) setTranscribing(false);
        if (current()) setRecordingBusy(false);
      }
      return;
    }

    const recording = recordingRef.current;
    if (!recording) return;

    setRecordingBusy(true);
    setIsRecording(false);
    recordingRef.current = null;

    let uri: string | null = null;
    try {
      const assertCurrent = capture();
      await recording.stopAndUnloadAsync();
      uri = recording.getURI();
      if (!uri) return;

      setTranscribing(true);
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.deleteAsync(uri, { idempotent: true });

      assertCurrent();
      const data = await api.transcribeVoice({
        audio_base64: audioBase64,
        mime_type: getMimeTypeFromRecordingUri(uri),
        language: "en",
      }, { expectedUserId: userId || "" });

      assertCurrent();
      if (data?.text) onText(data.text);
    } catch (error) {
      if (current()) onError?.(error);
    } finally {
      if (current()) setTranscribing(false);
      if (current()) setRecordingBusy(false);
    }
  }, [onError, onText, recordingBusy, userId, enabled, capture]);

  useEffect(() => {
    mountedRef.current = true;
    epochRef.current++;
    setIsRecording(false); setRecordingBusy(false); setTranscribing(false);
    return () => {
      epochRef.current++;
      mountedRef.current = false;
      const recorder = webMediaRecorderRef.current;
      webMediaRecorderRef.current = null;
      if (recorder) {
        if (recorder.state !== "inactive") recorder.stop();
        recorder.stream.getTracks().forEach(track => track.stop());
      }
      webAudioChunksRef.current = [];
      const recording = recordingRef.current;
      recordingRef.current = null;
      if (recording) void recording.stopAndUnloadAsync().then(async () => {
        const uri = recording.getURI();
        if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
      }).catch(() => {});
    };
  }, [userId, scopeKey, enabled]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      return stopRecordingAndTranscribe();
    }
    return startRecording();
  }, [isRecording, startRecording, stopRecordingAndTranscribe]);

  return {
    isRecording,
    transcribing,
    recordingBusy,
    startRecording,
    stopRecordingAndTranscribe,
    toggleRecording,
  };
}
