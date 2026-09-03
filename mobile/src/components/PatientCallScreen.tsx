import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { patientCallStyles as styles } from "../../assets/styles/patient-call.styles";
import { AnimatedPatientAvatar, type AnimatedPatientAvatarState } from "./AnimatedPatientAvatar";
import { getPatientInitials, getPatientStateImageSource } from "../utils/patientAssets";
import {
  playIncomingCallAudio,
  stopIncomingCallAudio,
  unloadIncomingCallAudio,
} from "../utils/incomingCallAudio";

type CallState = "incoming" | "active" | "ended";
type CallMessage = { id: string; role: "user" | "assistant"; content: string };
type MediaFocalPoint = { horizontal?: number; vertical?: number; scale?: number };

const HANDHELD_MOTION = {
  perspective: 1200,
  maximumHorizontalRatio: 0.015,
  maximumVerticalRatio: 0.012,
  maximumPitchDegrees: 4,
  maximumYawDegrees: 5.5,
  maximumRollDegrees: 1.8,
  minimumDistanceScale: 0.97,
  maximumDistanceScale: 1.06,
  minimumHoldDurationMs: 2500,
  maximumHoldDurationMs: 6000,
  minimumExtendedHoldDurationMs: 6000,
  maximumExtendedHoldDurationMs: 10000,
  extendedHoldProbability: 0.22,
  strongSequenceProbability: 0.17,
  correctionProbability: 0.68,
  minimumPrimaryDurationMs: 550,
  maximumPrimaryDurationMs: 1000,
  minimumSettlingPauseMs: 250,
  maximumSettlingPauseMs: 550,
  minimumCorrectionDurationMs: 400,
  maximumCorrectionDurationMs: 750,
  edgeSafetyPixels: 2,
} as const;

const NORMAL_HANDHELD_ENVELOPE = {
  maximumHorizontalRatio: 0.012,
  maximumVerticalRatio: 0.01,
  maximumPitchDegrees: 3.2,
  maximumYawDegrees: 4.2,
  maximumRollDegrees: 1.3,
  minimumDistanceScale: 0.982,
  maximumDistanceScale: 1.04,
} as const;

type HandheldPose = {
  x: number;
  y: number;
  pitch: number;
  yaw: number;
  roll: number;
  distanceScale: number;
};

type HandheldGesture =
  | "wristTurnLeft"
  | "wristTurnRight"
  | "phoneRaise"
  | "phoneLower"
  | "moveCloser"
  | "moveFarther"
  | "gripAdjustment"
  | "recenter";

type HandheldSequenceStrength = "normal" | "strong";

const NEUTRAL_HANDHELD_POSE: HandheldPose = {
  x: 0,
  y: 0,
  pitch: 0,
  yaw: 0,
  roll: 0,
  distanceScale: 1,
};

const GESTURE_WEIGHTS: { gesture: HandheldGesture; weight: number }[] = [
  { gesture: "wristTurnLeft", weight: 20 },
  { gesture: "wristTurnRight", weight: 20 },
  { gesture: "gripAdjustment", weight: 22 },
  { gesture: "phoneRaise", weight: 8 },
  { gesture: "phoneLower", weight: 8 },
  { gesture: "moveCloser", weight: 7 },
  { gesture: "moveFarther", weight: 7 },
  { gesture: "recenter", weight: 8 },
];

function randomBetween(minimum: number, maximum: number) {
  return minimum + Math.random() * (maximum - minimum);
}

function randomSign() {
  return Math.random() < 0.5 ? -1 : 1;
}

function rangeAtStrength(minimum: number, maximum: number, strength: number) {
  return minimum + (maximum - minimum) * strength;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function poseNearEnvelope(pose: HandheldPose) {
  const distanceOffset = pose.distanceScale - 1;
  const distanceMagnitude = distanceOffset >= 0
    ? distanceOffset / (HANDHELD_MOTION.maximumDistanceScale - 1)
    : Math.abs(distanceOffset) / (1 - HANDHELD_MOTION.minimumDistanceScale);
  return Math.max(
    Math.abs(pose.x) / HANDHELD_MOTION.maximumHorizontalRatio,
    Math.abs(pose.y) / HANDHELD_MOTION.maximumVerticalRatio,
    Math.abs(pose.pitch) / HANDHELD_MOTION.maximumPitchDegrees,
    Math.abs(pose.yaw) / HANDHELD_MOTION.maximumYawDegrees,
    Math.abs(pose.roll) / HANDHELD_MOTION.maximumRollDegrees,
    distanceMagnitude
  ) > 0.72;
}

function chooseWeightedGesture(currentPose: HandheldPose) {
  if (poseNearEnvelope(currentPose) && Math.random() < 0.55) return "recenter" as const;
  const totalWeight = GESTURE_WEIGHTS.reduce((total, choice) => total + choice.weight, 0);
  let selection = Math.random() * totalWeight;
  for (const choice of GESTURE_WEIGHTS) {
    selection -= choice.weight;
    if (selection <= 0) return choice.gesture;
  }
  return "recenter";
}

function poseForGesture(
  gesture: HandheldGesture,
  currentPose: HandheldPose,
  sequenceStrength: HandheldSequenceStrength
): HandheldPose {
  const strong = sequenceStrength === "strong";
  const envelope = strong ? HANDHELD_MOTION : NORMAL_HANDHELD_ENVELOPE;
  const quietX = randomBetween(-0.0025, 0.0025);
  const quietY = randomBetween(-0.002, 0.002);
  const arcDirection = randomSign();
  const arcDistance = strong ? randomBetween(0.03, 0.06) : randomBetween(0.012, 0.04);
  const arcDistanceScale = clamp(
    1 + arcDirection * arcDistance,
    envelope.minimumDistanceScale,
    envelope.maximumDistanceScale
  );
  switch (gesture) {
    case "wristTurnLeft": {
      const strength = Math.random();
      return { x: -rangeAtStrength(strong ? 0.008 : 0.005, strong ? 0.015 : 0.01, strength), y: quietY,
        pitch: arcDirection * rangeAtStrength(strong ? 0.8 : 0.4, strong ? 1.6 : 1, strength),
        yaw: -rangeAtStrength(strong ? 4.2 : 2.5, strong ? 5.5 : 4.2, strength),
        roll: rangeAtStrength(strong ? 1.2 : 0.6, strong ? 1.8 : 1.3, strength),
        distanceScale: arcDistanceScale };
    }
    case "wristTurnRight": {
      const strength = Math.random();
      return { x: rangeAtStrength(strong ? 0.008 : 0.005, strong ? 0.015 : 0.01, strength), y: quietY,
        pitch: -arcDirection * rangeAtStrength(strong ? 0.8 : 0.4, strong ? 1.6 : 1, strength),
        yaw: rangeAtStrength(strong ? 4.2 : 2.5, strong ? 5.5 : 4.2, strength),
        roll: -rangeAtStrength(strong ? 1.2 : 0.6, strong ? 1.8 : 1.3, strength),
        distanceScale: arcDistanceScale };
    }
    case "phoneRaise": {
      const direction = randomSign();
      const strength = Math.random();
      return { x: quietX, y: -rangeAtStrength(strong ? 0.009 : 0.006, strong ? 0.012 : 0.01, strength),
        pitch: rangeAtStrength(strong ? 3.2 : 2, strong ? 4 : 3.2, strength),
        yaw: direction * rangeAtStrength(strong ? 0.7 : 0.35, strong ? 1.4 : 0.8, strength),
        roll: -direction * rangeAtStrength(strong ? 0.45 : 0.2, strong ? 0.9 : 0.5, strength),
        distanceScale: arcDistanceScale };
    }
    case "phoneLower": {
      const direction = randomSign();
      const strength = Math.random();
      return { x: quietX, y: rangeAtStrength(strong ? 0.009 : 0.006, strong ? 0.012 : 0.01, strength),
        pitch: -rangeAtStrength(strong ? 3.2 : 2, strong ? 4 : 3.2, strength),
        yaw: -direction * rangeAtStrength(strong ? 0.7 : 0.35, strong ? 1.4 : 0.8, strength),
        roll: direction * rangeAtStrength(strong ? 0.45 : 0.2, strong ? 0.9 : 0.5, strength),
        distanceScale: arcDistanceScale };
    }
    case "moveCloser": {
      const direction = randomSign();
      const strength = Math.random();
      return { x: quietX, y: quietY,
        pitch: direction * rangeAtStrength(strong ? 1.4 : 0.7, strong ? 2.5 : 1.6, strength),
        yaw: -direction * rangeAtStrength(strong ? 1.2 : 0.6, strong ? 2.4 : 1.4, strength),
        roll: direction * rangeAtStrength(strong ? 0.45 : 0.2, strong ? 1 : 0.55, strength),
        distanceScale: rangeAtStrength(strong ? 1.04 : 1.025, strong ? 1.06 : 1.04, strength) };
    }
    case "moveFarther": {
      const direction = randomSign();
      const strength = Math.random();
      return { x: quietX, y: quietY,
        pitch: -direction * rangeAtStrength(strong ? 1.2 : 0.6, strong ? 2.2 : 1.4, strength),
        yaw: direction * rangeAtStrength(strong ? 1 : 0.5, strong ? 2.2 : 1.3, strength),
        roll: -direction * rangeAtStrength(strong ? 0.4 : 0.18, strong ? 0.9 : 0.5, strength),
        distanceScale: rangeAtStrength(strong ? 0.982 : 0.99, strong ? 0.97 : 0.982, strength) };
    }
    case "gripAdjustment": {
      const direction = randomSign();
      const strength = Math.random();
      return { x: randomBetween(-0.0015, 0.0015), y: randomBetween(-0.001, 0.001),
        pitch: currentPose.pitch * randomBetween(0.35, 0.65),
        yaw: direction * rangeAtStrength(strong ? 2 : 1, strong ? 3.2 : 2.2, strength),
        roll: -direction * rangeAtStrength(strong ? 1.2 : 0.7, strong ? 1.8 : 1.3, strength),
        distanceScale: clamp(1 + arcDirection * (strong ? randomBetween(0.015, 0.035) : randomBetween(0.006, 0.018)),
          envelope.minimumDistanceScale, envelope.maximumDistanceScale) };
    }
    case "recenter": {
      const factor = randomBetween(0.25, 0.55);
      return { x: currentPose.x * factor, y: currentPose.y * factor, pitch: currentPose.pitch * factor,
        yaw: currentPose.yaw * factor, roll: currentPose.roll * factor,
        distanceScale: 1 + (currentPose.distanceScale - 1) * factor };
    }
  }
}

function correctionPoseForSequence(
  priorPose: HandheldPose,
  safePrimaryPose: HandheldPose
): HandheldPose {
  const orientationReturn = randomBetween(0.45, 0.7);
  const distanceReturn = randomBetween(0.4, 0.7);
  const framingReturn = randomBetween(0.3, 0.5);
  const corrected: HandheldPose = {
    x: safePrimaryPose.x + (priorPose.x - safePrimaryPose.x) * framingReturn,
    y: safePrimaryPose.y + (priorPose.y - safePrimaryPose.y) * framingReturn,
    pitch: safePrimaryPose.pitch + (priorPose.pitch - safePrimaryPose.pitch) * randomBetween(0.3, 0.5),
    yaw: safePrimaryPose.yaw + (priorPose.yaw - safePrimaryPose.yaw) * orientationReturn,
    roll: safePrimaryPose.roll + (priorPose.roll - safePrimaryPose.roll) * orientationReturn,
    distanceScale: safePrimaryPose.distanceScale +
      (priorPose.distanceScale - safePrimaryPose.distanceScale) * distanceReturn,
  };

  if (Math.random() < 0.06) {
    const overshoot = randomBetween(1.05, 1.15);
    const axis = Math.random();
    if (axis < 0.4) corrected.yaw = safePrimaryPose.yaw + (priorPose.yaw - safePrimaryPose.yaw) * overshoot;
    else if (axis < 0.8) corrected.roll = safePrimaryPose.roll + (priorPose.roll - safePrimaryPose.roll) * overshoot;
    else corrected.distanceScale = safePrimaryPose.distanceScale +
      (priorPose.distanceScale - safePrimaryPose.distanceScale) * overshoot;
  }

  return corrected;
}

function projectedPoseBounds(pose: HandheldPose, width: number, height: number, baselineScale: number) {
  const pitch = pose.pitch * (Math.PI / 180);
  const yaw = pose.yaw * (Math.PI / 180);
  const roll = pose.roll * (Math.PI / 180);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosRoll = Math.cos(roll);
  const sinRoll = Math.sin(roll);
  const totalScale = baselineScale * pose.distanceScale;
  const projected = [
    [-width / 2, -height / 2],
    [width / 2, -height / 2],
    [width / 2, height / 2],
    [-width / 2, height / 2],
  ].map(([cornerX, cornerY]) => {
    const pitchedY = cornerY * cosPitch;
    const pitchedZ = cornerY * sinPitch;
    const yawedX = cornerX * cosYaw + pitchedZ * sinYaw;
    const yawedZ = -cornerX * sinYaw + pitchedZ * cosYaw;
    const rolledX = yawedX * cosRoll - pitchedY * sinRoll;
    const rolledY = yawedX * sinRoll + pitchedY * cosRoll;
    const perspectiveScale = HANDHELD_MOTION.perspective / (HANDHELD_MOTION.perspective - yawedZ);
    return {
      x: rolledX * perspectiveScale * totalScale,
      y: rolledY * perspectiveScale * totalScale,
    };
  });
  return {
    minimumX: Math.min(...projected.map((corner) => corner.x)),
    maximumX: Math.max(...projected.map((corner) => corner.x)),
    minimumY: Math.min(...projected.map((corner) => corner.y)),
    maximumY: Math.max(...projected.map((corner) => corner.y)),
  };
}

function safeProjectedPose(rawPose: HandheldPose, width: number, height: number, baselineScale: number) {
  const boundedPose: HandheldPose = {
    x: clamp(rawPose.x, -HANDHELD_MOTION.maximumHorizontalRatio, HANDHELD_MOTION.maximumHorizontalRatio),
    y: clamp(rawPose.y, -HANDHELD_MOTION.maximumVerticalRatio, HANDHELD_MOTION.maximumVerticalRatio),
    pitch: clamp(rawPose.pitch, -HANDHELD_MOTION.maximumPitchDegrees, HANDHELD_MOTION.maximumPitchDegrees),
    yaw: clamp(rawPose.yaw, -HANDHELD_MOTION.maximumYawDegrees, HANDHELD_MOTION.maximumYawDegrees),
    roll: clamp(rawPose.roll, -HANDHELD_MOTION.maximumRollDegrees, HANDHELD_MOTION.maximumRollDegrees),
    distanceScale: clamp(
      rawPose.distanceScale,
      HANDHELD_MOTION.minimumDistanceScale,
      HANDHELD_MOTION.maximumDistanceScale
    ),
  };

  const fitTranslation = (pose: HandheldPose) => {
    const bounds = projectedPoseBounds(pose, width, height, baselineScale);
    const minimumX = width / 2 + HANDHELD_MOTION.edgeSafetyPixels - bounds.maximumX;
    const maximumX = -width / 2 - HANDHELD_MOTION.edgeSafetyPixels - bounds.minimumX;
    const minimumY = height / 2 + HANDHELD_MOTION.edgeSafetyPixels - bounds.maximumY;
    const maximumY = -height / 2 - HANDHELD_MOTION.edgeSafetyPixels - bounds.minimumY;
    if (minimumX > maximumX || minimumY > maximumY) return null;
    return {
      ...pose,
      x: clamp(pose.x * width, minimumX, maximumX) / width,
      y: clamp(pose.y * height, minimumY, maximumY) / height,
    };
  };

  const directFit = fitTranslation(boundedPose);
  if (directFit) return directFit;

  const distanceSafePose = { ...boundedPose, distanceScale: Math.max(1, boundedPose.distanceScale) };
  const distanceFit = fitTranslation(distanceSafePose);
  if (distanceFit) return distanceFit;

  for (const orientationFactor of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0]) {
    const softenedPose = {
      ...distanceSafePose,
      pitch: distanceSafePose.pitch * orientationFactor,
      yaw: distanceSafePose.yaw * orientationFactor,
      roll: distanceSafePose.roll * orientationFactor,
    };
    const fit = fitTranslation(softenedPose);
    if (fit) return fit;
  }

  return { ...NEUTRAL_HANDHELD_POSE };
}

type PatientCallScreenProps = {
  callState: CallState; patientName: string; patientSessionSlug?: string | null; caseId: string;
  avatarState: AnimatedPatientAvatarState; elapsedSeconds: number; messages: CallMessage[];
  voiceEnabled: boolean; onToggleVoice: () => void;
  onMicrophonePress: () => void; microphoneDisabled: boolean; microphoneActive: boolean; microphoneProcessing: boolean;
  microphoneError?: string | null;
  onAnswer: () => void; answering: boolean; onHangUp: () => void; hangUpDisabled: boolean;
  composer: ReactNode; mediaFocalPoint?: MediaFocalPoint;
};

function durationLabel(totalSeconds: number) {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function CallControl({ icon, label, accessibilityLabel, onPress, disabled = false, active = false, end = false }: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; accessibilityLabel: string; onPress: () => void;
  disabled?: boolean; active?: boolean; end?: boolean;
}) {
  return (
    <View style={styles.controlItem}>
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} disabled={disabled}
        hitSlop={10} style={({ pressed }) => [styles.circle, active && styles.circleActive, end && styles.endCircle,
          pressed && !disabled && styles.circlePressed, disabled && styles.disabled]}>
        <MaterialCommunityIcons name={icon} size={25} style={[styles.icon, active && styles.iconActive]} />
      </Pressable>
      <Text style={styles.controlLabel}>{label}</Text>
    </View>
  );
}

export function PatientCallScreen({
  callState, patientName, patientSessionSlug, caseId, avatarState, elapsedSeconds, messages,
  voiceEnabled, onToggleVoice, onMicrophonePress, microphoneDisabled, microphoneActive, microphoneProcessing, microphoneError,
  onAnswer, answering, onHangUp, hangUpDisabled, composer,
  mediaFocalPoint = { horizontal: 0, vertical: 0, scale: 1.08 },
}: PatientCallScreenProps) {
  const [composerVisible, setComposerVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [showWebUnmute, setShowWebUnmute] = useState(false);
  const [mediaViewport, setMediaViewport] = useState({ width: 0, height: 0 });
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(true);
  const handheldX = useRef(new Animated.Value(0)).current;
  const handheldY = useRef(new Animated.Value(0)).current;
  const handheldPitch = useRef(new Animated.Value(0)).current;
  const handheldYaw = useRef(new Animated.Value(0)).current;
  const handheldRoll = useRef(new Animated.Value(0)).current;
  const handheldDistanceScale = useRef(new Animated.Value(1)).current;
  const completedPoseRef = useRef<HandheldPose>({ ...NEUTRAL_HANDHELD_POSE });
  const previousSequenceWasStrongRef = useRef(false);
  const repositionAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handheldGenerationRef = useRef(0);
  const incomingPulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const incomingSecondPulseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomingEffectsGenerationRef = useRef(0);
  const webRingtoneStartedRef = useRef(false);

  const stopIncomingEffects = useCallback(() => {
    incomingEffectsGenerationRef.current += 1;
    webRingtoneStartedRef.current = false;
    setShowWebUnmute(false);
    if (incomingPulseIntervalRef.current) {
      clearInterval(incomingPulseIntervalRef.current);
      incomingPulseIntervalRef.current = null;
    }
    if (incomingSecondPulseRef.current) {
      clearTimeout(incomingSecondPulseRef.current);
      incomingSecondPulseRef.current = null;
    }
    if (Platform.OS === "web" && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(0);
    }
    void stopIncomingCallAudio().catch(() => {});
  }, []);

  const attemptIncomingRingtone = useCallback(() => {
    if (callState !== "incoming" || webRingtoneStartedRef.current) return;
    webRingtoneStartedRef.current = true;
    const generation = incomingEffectsGenerationRef.current;
    void playIncomingCallAudio().then(() => {
      if (incomingEffectsGenerationRef.current !== generation || callState !== "incoming") {
        void stopIncomingCallAudio().catch(() => {});
        return;
      }
      setShowWebUnmute(false);
    }).catch(() => {
      if (incomingEffectsGenerationRef.current !== generation || callState !== "incoming") return;
      webRingtoneStartedRef.current = false;
      if (Platform.OS === "web") setShowWebUnmute(true);
    });
  }, [callState]);

  const resetHandheldMotion = useCallback(() => {
    handheldGenerationRef.current += 1;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    repositionAnimationRef.current?.stop();
    repositionAnimationRef.current = null;
    handheldX.setValue(0);
    handheldY.setValue(0);
    handheldPitch.setValue(0);
    handheldYaw.setValue(0);
    handheldRoll.setValue(0);
    handheldDistanceScale.setValue(1);
    completedPoseRef.current = { ...NEUTRAL_HANDHELD_POSE };
    previousSequenceWasStrongRef.current = false;
  }, [handheldDistanceScale, handheldPitch, handheldRoll, handheldX, handheldY, handheldYaw]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotionEnabled(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotionEnabled);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    stopIncomingEffects();
    if (callState !== "incoming") return;

    const generation = incomingEffectsGenerationRef.current;
    const playPulse = () => {
      if (incomingEffectsGenerationRef.current !== generation) return;
      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(reduceMotionEnabled ? 100 : [120, 120, 120]);
        }
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (!reduceMotionEnabled) {
        incomingSecondPulseRef.current = setTimeout(() => {
          incomingSecondPulseRef.current = null;
          if (incomingEffectsGenerationRef.current === generation) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
        }, 240);
      }
    };

    attemptIncomingRingtone();

    playPulse();
    incomingPulseIntervalRef.current = setInterval(playPulse, reduceMotionEnabled ? 3200 : 2400);
    return stopIncomingEffects;
  }, [attemptIncomingRingtone, callState, reduceMotionEnabled, stopIncomingEffects]);

  useEffect(() => () => {
    void unloadIncomingCallAudio();
  }, []);

  const scale = mediaFocalPoint.scale ?? 1.08;

  useEffect(() => {
    resetHandheldMotion();
    if (callState !== "active" || reduceMotionEnabled || !mediaViewport.width || !mediaViewport.height) return;

    const generation = handheldGenerationRef.current;
    const useNativeDriver = Platform.OS !== "web";

    const poseWasReduced = (requestedPose: HandheldPose, safePose: HandheldPose) =>
      (Object.keys(requestedPose) as (keyof HandheldPose)[])
        .some((key) => Math.abs(requestedPose[key] - safePose[key]) > 0.0001);

    const animateToPose = (
      targetPose: HandheldPose,
      duration: number,
      onFinished: () => void
    ) => {
      const animation = Animated.parallel([
        Animated.timing(handheldX, {
          toValue: (targetPose.x * mediaViewport.width) / scale,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
        Animated.timing(handheldY, {
          toValue: (targetPose.y * mediaViewport.height) / scale,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
        Animated.timing(handheldPitch, {
          toValue: targetPose.pitch,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
        Animated.timing(handheldYaw, {
          toValue: targetPose.yaw,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
        Animated.timing(handheldRoll, {
          toValue: targetPose.roll,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
        Animated.timing(handheldDistanceScale, {
          toValue: targetPose.distanceScale,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
      ]);
      repositionAnimationRef.current = animation;
      animation.start(({ finished }) => {
        repositionAnimationRef.current = null;
        if (finished && handheldGenerationRef.current === generation) onFinished();
      });
    };

    const scheduleStableHold = () => {
      if (handheldGenerationRef.current !== generation) return;
      const extendedHold = Math.random() < HANDHELD_MOTION.extendedHoldProbability;
      const holdDuration = Math.round(
        (extendedHold ? HANDHELD_MOTION.minimumExtendedHoldDurationMs : HANDHELD_MOTION.minimumHoldDurationMs) +
          Math.random() * (
            (extendedHold ? HANDHELD_MOTION.maximumExtendedHoldDurationMs : HANDHELD_MOTION.maximumHoldDurationMs) -
            (extendedHold ? HANDHELD_MOTION.minimumExtendedHoldDurationMs : HANDHELD_MOTION.minimumHoldDurationMs)
          )
      );
      holdTimerRef.current = setTimeout(reposition, holdDuration);
    };

    const reposition = () => {
      if (handheldGenerationRef.current !== generation) return;
      holdTimerRef.current = null;
      const priorPose = completedPoseRef.current;
      const gesture = chooseWeightedGesture(priorPose);
      const strong = gesture !== "recenter" && !previousSequenceWasStrongRef.current &&
        Math.random() < HANDHELD_MOTION.strongSequenceProbability;
      const sequenceStrength: HandheldSequenceStrength = strong ? "strong" : "normal";
      const primaryDuration = Math.round(
        HANDHELD_MOTION.minimumPrimaryDurationMs +
          Math.random() *
            (HANDHELD_MOTION.maximumPrimaryDurationMs - HANDHELD_MOTION.minimumPrimaryDurationMs)
      );
      const requestedPrimaryPose = poseForGesture(gesture, priorPose, sequenceStrength);
      const safePrimaryPose = safeProjectedPose(
        requestedPrimaryPose,
        mediaViewport.width,
        mediaViewport.height,
        scale
      );
      const hasCorrection = gesture !== "recenter" && Math.random() < HANDHELD_MOTION.correctionProbability;
      const requestedCorrectionPose = hasCorrection
        ? correctionPoseForSequence(priorPose, safePrimaryPose)
        : null;
      const safeCorrectionPose = requestedCorrectionPose
        ? safeProjectedPose(requestedCorrectionPose, mediaViewport.width, mediaViewport.height, scale)
        : null;
      if (__DEV__) {
        console.debug("[PatientCall handheld sequence]", {
          gesture,
          strength: sequenceStrength,
          requestedPrimaryPose,
          safePrimaryPose,
          primarySafetyReduced: poseWasReduced(requestedPrimaryPose, safePrimaryPose),
          requestedCorrectionPose,
          safeCorrectionPose,
          correctionSafetyReduced: requestedCorrectionPose && safeCorrectionPose
            ? poseWasReduced(requestedCorrectionPose, safeCorrectionPose)
            : false,
        });
      }
      animateToPose(safePrimaryPose, primaryDuration, () => {
        if (!safeCorrectionPose) {
          completedPoseRef.current = safePrimaryPose;
          previousSequenceWasStrongRef.current = strong;
          scheduleStableHold();
          return;
        }

        const settlingPause = Math.round(
          HANDHELD_MOTION.minimumSettlingPauseMs + Math.random() *
            (HANDHELD_MOTION.maximumSettlingPauseMs - HANDHELD_MOTION.minimumSettlingPauseMs)
        );
        holdTimerRef.current = setTimeout(() => {
          holdTimerRef.current = null;
          if (handheldGenerationRef.current !== generation) return;
          const correctionDuration = Math.round(
            HANDHELD_MOTION.minimumCorrectionDurationMs + Math.random() *
              (HANDHELD_MOTION.maximumCorrectionDurationMs - HANDHELD_MOTION.minimumCorrectionDurationMs)
          );
          animateToPose(safeCorrectionPose, correctionDuration, () => {
            completedPoseRef.current = safeCorrectionPose;
            previousSequenceWasStrongRef.current = strong;
            scheduleStableHold();
          });
        }, settlingPause);
      });
    };

    scheduleStableHold();
    return resetHandheldMotion;
  }, [
    callState, handheldDistanceScale, handheldPitch, handheldRoll, handheldX, handheldY, handheldYaw,
    mediaViewport, reduceMotionEnabled, resetHandheldMotion, scale,
  ]);

  const handleMediaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMediaViewport((current) =>
      current.width === width && current.height === height ? current : { width, height }
    );
  }, []);

  const handleAnswer = useCallback(() => {
    stopIncomingEffects();
    onAnswer();
  }, [onAnswer, stopIncomingEffects]);

  if (callState === "ended") {
    return <View style={styles.screen} accessibilityLiveRegion="polite"><View style={[styles.viewport, styles.endedViewport]}>
      <Text style={styles.endedIcon}>☎</Text><Text style={styles.endedText}>Call ended</Text>
      <Text style={styles.duration}>{durationLabel(elapsedSeconds)}</Text>
    </View></View>;
  }

  const latestPatientMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const incomingPortraitSource = getPatientStateImageSource({ patientSessionSlug, caseId, state: "idle" });
  const patientInitials = getPatientInitials(patientName, "PT");
  const translateX = mediaFocalPoint.horizontal ?? 0;
  const translateY = mediaFocalPoint.vertical ?? 0;

  return <View style={styles.screen}><View style={styles.viewport}>
    {callState === "active" ? <View style={styles.mediaCrop} onLayout={handleMediaLayout}>
      <View style={[styles.mediaTransform, { transform: [{ translateX }, { translateY }, { scale }] }]}>
        <Animated.View style={[styles.slowHandheldMedia, { transform: [
          { translateX: handheldX }, { translateY: handheldY }, { scale: handheldDistanceScale },
        ] }]}>
          <Animated.View style={[styles.slowHandheldMedia, { transform: [
            { perspective: HANDHELD_MOTION.perspective },
            { rotateX: handheldPitch.interpolate({ inputRange: [-1, 1], outputRange: ["-1deg", "1deg"] }) },
            { rotateY: handheldYaw.interpolate({ inputRange: [-1, 1], outputRange: ["-1deg", "1deg"] }) },
            { rotateZ: handheldRoll.interpolate({ inputRange: [-1, 1], outputRange: ["-1deg", "1deg"] }) },
          ] }]}>
            <AnimatedPatientAvatar patientName={patientName} patientSessionSlug={patientSessionSlug} caseId={caseId}
              state={avatarState} fill borderRadius={0} />
          </Animated.View>
        </Animated.View>
      </View>
    </View> : null}
    <View pointerEvents="none" style={styles.topShade} /><View pointerEvents="none" style={styles.bottomShade} />
    <View style={styles.header} accessibilityLiveRegion="polite">
      {callState === "incoming" ? <Text style={styles.incomingLabel}>Incoming patient call</Text> : null}
      <Text style={styles.name}>{patientName}</Text>
      {callState === "incoming" && showWebUnmute ? <Pressable
        accessibilityRole="button" accessibilityLabel="Unmute incoming call"
        onPress={attemptIncomingRingtone} hitSlop={8}
        style={({ pressed }) => [styles.unmuteButton, pressed && styles.unmuteButtonPressed]}
      >
        <MaterialCommunityIcons name="volume-mute" size={17} color="#fff" />
        <Text style={styles.unmuteText}>Unmute</Text>
      </Pressable> : null}
      {callState === "active" ? <Text style={styles.duration}>{durationLabel(elapsedSeconds)}</Text> : null}
    </View>
    {callState === "incoming" ? <>
      <View pointerEvents="none" style={styles.incomingPortraitFrame}>
        {incomingPortraitSource ? <Image source={incomingPortraitSource} style={styles.incomingPortrait} resizeMode="cover" /> :
          <Text style={styles.incomingPortraitInitials}>{patientInitials}</Text>}
      </View>
      <View pointerEvents="box-none" style={styles.incomingAction}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Answer patient call from ${patientName}`}
        onPress={handleAnswer} disabled={answering} style={[styles.circle, styles.answerCircle, answering && styles.disabled]}>
        <Text style={styles.phoneIcon}>☎</Text>
      </Pressable><Text pointerEvents="none" style={styles.incomingActionLabel}>{answering ? "Answering…" : "Answer"}</Text>
      </View>
    </> : <>
      <Pressable accessibilityRole="button" accessibilityLabel="Call Options"
        onPress={() => { setOptionsVisible((visible) => !visible); setComposerVisible(false); }}
        style={[styles.optionsButton, optionsVisible && styles.optionsButtonActive]}>
        <MaterialCommunityIcons name="cog-outline" size={25} color="#fff" />
      </Pressable>
      {captionsEnabled && latestPatientMessage ? <View style={styles.captionWrap} pointerEvents="none" accessibilityLiveRegion="polite">
        <Text style={styles.caption} numberOfLines={3}>{latestPatientMessage.content}</Text>
      </View> : null}
      <View style={styles.bottomOverlay}>
        {optionsVisible ? <View style={styles.optionsPanel} accessibilityLabel="Call Options">
          <Text style={styles.optionsTitle}>Call Options</Text>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: voiceEnabled }}
            accessibilityLabel="Speaker" onPress={onToggleVoice} style={styles.optionRow}>
            <Text style={styles.optionText}>Speaker</Text><Text style={styles.optionValue}>{voiceEnabled ? "On" : "Off"}</Text>
          </Pressable>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: captionsEnabled }}
            accessibilityLabel="Captions" onPress={() => setCaptionsEnabled((enabled) => !enabled)} style={styles.optionRow}>
            <Text style={styles.optionText}>Captions</Text><Text style={styles.optionValue}>{captionsEnabled ? "On" : "Off"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Type instead" onPress={() => {
            setOptionsVisible(false); setComposerVisible(true);
          }} style={styles.optionRow}>
            <Text style={styles.optionText}>Type instead</Text><MaterialCommunityIcons name="keyboard-outline" size={22} color="#fff" />
          </Pressable>
        </View> : null}
        {composerVisible ? <View style={styles.composerPanel}>{composer}</View> : null}
        {microphoneError ? <View style={styles.microphoneErrorWrap} accessibilityLiveRegion="polite">
          <Text style={styles.microphoneErrorText}>{microphoneError}</Text>
        </View> : null}
        <View style={styles.controls}>
          <CallControl icon="microphone" label={microphoneProcessing ? "Processing..." : microphoneActive ? "Listening..." : "Talk"}
            accessibilityLabel={microphoneProcessing ? "Processing speech" : microphoneActive ? "Listening" : "Talk to patient"}
            onPress={onMicrophonePress} disabled={microphoneDisabled || microphoneActive} active={microphoneActive} />
          <CallControl icon="phone-hangup" label="End call" accessibilityLabel="End call" onPress={onHangUp} disabled={hangUpDisabled} end />
        </View>
      </View>
    </>}
  </View></View>;
}

export type { CallState, MediaFocalPoint };
