import { Platform } from "react-native";
import { Audio } from "expo-av";

const INCOMING_CALL_VOLUME = 0.45;
const INCOMING_CALL_SOURCE = require("../../assets/incoming-call.wav");

let sound: Audio.Sound | null = null;
let loadPromise: Promise<Audio.Sound> | null = null;

export function prepareIncomingCallAudio() {
  if (sound) return Promise.resolve(sound);
  if (loadPromise) return loadPromise;

  loadPromise = Audio.Sound.createAsync(INCOMING_CALL_SOURCE, {
    shouldPlay: false,
    isLooping: true,
    volume: Platform.OS === "web" ? 0 : INCOMING_CALL_VOLUME,
  }).then(({ sound: loadedSound }) => {
    sound = loadedSound;
    return loadedSound;
  }).finally(() => {
    loadPromise = null;
  });
  return loadPromise;
}

export async function playIncomingCallAudio() {
  const loadedSound = await prepareIncomingCallAudio();
  await loadedSound.setStatusAsync({
    positionMillis: 0,
    isLooping: true,
    volume: INCOMING_CALL_VOLUME,
    shouldPlay: true,
  });
}

export async function stopIncomingCallAudio() {
  if (!sound) return;
  await sound.setStatusAsync({
    shouldPlay: false,
    positionMillis: 0,
    ...(Platform.OS === "web" ? { volume: 0 } : {}),
  });
}

export async function unloadIncomingCallAudio() {
  const loadedSound = sound;
  sound = null;
  if (!loadedSound) return;
  await loadedSound.stopAsync().catch(() => {});
  await loadedSound.unloadAsync().catch(() => {});
}
