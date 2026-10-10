import { useAuth } from "@clerk/clerk-expo";
import { captureSession } from "../api/sessionToken";
import { createSpeechPlaybackOwner } from "../api/speechPlayback";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { api } from "../api/client";

function createAudioBlobUrl(audioBase64: string, mimeType: string) {
  const binary = window.atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return URL.createObjectURL(new Blob([bytes], { type: mimeType || "audio/mpeg" }));
}

type SpeechPlaybackOptions = {
  voice?: string | null;
  speed?: number;
  channel?: "patient" | "mentor";
  enabled?: boolean;
  exclusive?: boolean;
  scopeKey?: string;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: unknown) => void;
};
type PatientSpeech = { authorization: string; turnId: string; conversationId: string; caseId: string };

export function useSpeechPlayback({ voice, speed, channel = "mentor", enabled = true, exclusive = enabled, scopeKey = "", onStart, onStop, onError }: SpeechPlaybackOptions = {}) {
  const { userId } = useAuth();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const soundFilePathRef = useRef<string | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const webAudioUrlRef = useRef<string | null>(null);
  const optionsRef = useRef({ enabled, onStart, onStop, onError });
  optionsRef.current = { enabled, onStart, onStop, onError };
  const mountedRef = useRef(true);
  const counterRef = useRef(0);
  const contextRef = useRef({ userId, scopeKey });
  contextRef.current = { userId, scopeKey };

  const cleanup = useCallback(() => {
    const webAudio = webAudioRef.current;
    webAudioRef.current = null;
    if (webAudio) {
      webAudio.onended = null; webAudio.onerror = null;
      try { webAudio.pause(); webAudio.src = ""; } catch { /* Already released. */ }
    }
    const url = webAudioUrlRef.current;
    webAudioUrlRef.current = null;
    if (url) { try { URL.revokeObjectURL(url); } catch { /* Already released. */ } }
    const sound = soundRef.current;
    soundRef.current = null;
    const file = soundFilePathRef.current;
    soundFilePathRef.current = null;
    // Only captured resources are cleaned: an older cleanup cannot touch a newer turn.
    const released = (async () => {
      if (sound) { try { sound.setOnPlaybackStatusUpdate(null); } catch { /* Already released. */ } await sound.stopAsync().catch(() => {}); await sound.unloadAsync().catch(() => {}); }
      if (file) await FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {});
    })();
    if (mountedRef.current) { setIsSpeaking(false); optionsRef.current.onStop?.(); }
    return released;
  }, []);
  const ownerRef = useRef<ReturnType<typeof createSpeechPlaybackOwner> | null>(null);
  if (!ownerRef.current) ownerRef.current = createSpeechPlaybackOwner(cleanup);
  const stop = useCallback(async () => { ownerRef.current?.stop(); }, []);

  const speak = useCallback(async (text: string, patientSpeech?: PatientSpeech, isApprovedTurnCurrent?: () => boolean) => {
    const inputText = String(text || "").trim();
    if (!mountedRef.current || !optionsRef.current.enabled || !inputText || contextRef.current.userId !== userId) return;
    if (channel === "patient" && !patientSpeech) return;
    if (isApprovedTurnCurrent && !isApprovedTurnCurrent()) return;
    const speechScope = contextRef.current.scopeKey;
    const lease = ownerRef.current!.begin(patientSpeech?.turnId || `mentor-${++counterRef.current}`);
    if (!lease) return;
    const current = () => mountedRef.current && optionsRef.current.enabled && contextRef.current.userId === userId && contextRef.current.scopeKey === speechScope && lease.isCurrent();
    try {
      const assertSession = captureSession(userId);
      const assertCurrent = () => { assertSession(); if (!current()) throw new Error("Superseded speech"); };
      assertCurrent();
      const payload = channel === "patient"
        ? await api.speakPatientVoice({ authorization: patientSpeech!.authorization, conversationId: patientSpeech!.conversationId, caseId: patientSpeech!.caseId }, { expectedUserId: userId || "" })
        : await api.speakVoice({ text: inputText, ...(voice ? { voice } : {}), ...(speed ? { speed } : {}) }, { expectedUserId: userId || "" });
      assertCurrent();
      await lease.ready;
      assertCurrent();
      if (channel === "patient" && payload?.turnId !== patientSpeech!.turnId) throw new Error("Unexpected patient speech turn");
      const audioBase64 = String(payload?.audio_base64 || "").trim();
      const mimeType = String(payload?.mime_type || "audio/mpeg").toLowerCase();
      if (!audioBase64) { lease.finish(); return; }
      if (Platform.OS === "web") {
        const url = createAudioBlobUrl(audioBase64, mimeType);
        const audio = new window.Audio(url);
        audio.volume = 1.0; audio.muted = false;
        webAudioUrlRef.current = url; webAudioRef.current = audio;
        audio.onended = () => { if (current()) lease.finish(); };
        audio.onerror = () => { if (current()) { lease.finish(); optionsRef.current.onError?.(new Error("Audio playback failed")); } };
        assertCurrent(); setIsSpeaking(true); optionsRef.current.onStart?.();
        await audio.play(); assertCurrent();
        return;
      }
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) throw new Error("No writable filesystem directory for audio playback.");
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true }).catch(() => {});
      assertCurrent();
      const file = `${baseDir}${channel}-tts-${Date.now()}-${counterRef.current++}.${mimeType.includes("wav") ? "wav" : "mp3"}`;
      await FileSystem.writeAsStringAsync(file, audioBase64, { encoding: FileSystem.EncodingType.Base64 });
      if (!current()) { await FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {}); return; }
      soundFilePathRef.current = file; assertCurrent();
      const { sound } = await Audio.Sound.createAsync({ uri: file }, { shouldPlay: false, volume: 1.0, isMuted: false });
      if (!current()) { await sound.unloadAsync().catch(() => {}); return; }
      soundRef.current = sound; assertCurrent();
      sound.setOnPlaybackStatusUpdate(status => {
        if (!current()) return;
        if (!status.isLoaded && status.error) { lease.finish(); optionsRef.current.onError?.(new Error("Audio playback failed")); }
        else if (status.isLoaded && status.didJustFinish) lease.finish();
      });
      setIsSpeaking(true); optionsRef.current.onStart?.();
      await sound.playAsync(); assertCurrent();
    } catch {
      if (current()) { lease.finish(); optionsRef.current.onError?.(new Error("Speech playback unavailable")); }
    }
  }, [channel, speed, voice, userId, scopeKey]);

  useEffect(() => {
    const owner = ownerRef.current!;
    owner.stop();
    if (channel === "patient") { owner.reserve(); if (!exclusive) owner.release(); }
    return () => { owner.stop(); owner.release(); };
  }, [userId, scopeKey, enabled, exclusive, channel]);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; ownerRef.current?.stop(); ownerRef.current?.release(); };
  }, []);
  const capture = useCallback(() => {
    const valid = ownerRef.current!.capture();
    const speechScope = contextRef.current.scopeKey;
    return () => valid() && mountedRef.current && optionsRef.current.enabled && contextRef.current.userId === userId && contextRef.current.scopeKey === speechScope;
  }, [userId, scopeKey]);
  return { isSpeaking, speak, stop, capture };
}
