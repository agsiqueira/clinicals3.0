import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Platform, StyleSheet, Text, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import {
  AnimatedPatientAvatarState,
  getPatientInitials,
  getPatientStateImageSource,
  getPatientTalkingVideoSource,
  getPatientVisualAssetKey,
} from "../utils/patientAssets";

const SHOW_AVATAR_DEBUG = __DEV__;
const SHOW_AVATAR_DEBUG_LABEL = __DEV__ && false;
const VIDEO_REVEAL_DURATION_MS = 100;

type AnimatedPatientAvatarProps = {
  patientName?: string | null;
  patientSessionSlug?: string | null;
  caseId?: string | null;
  state: AnimatedPatientAvatarState;
  size?: number;
  fill?: boolean;
  borderRadius?: number;
};

export function AnimatedPatientAvatar({
  patientName,
  patientSessionSlug,
  caseId,
  state,
  size = 100,
  fill = false,
  borderRadius,
}: AnimatedPatientAvatarProps) {
  const talkingVideoSource = getPatientTalkingVideoSource({ patientSessionSlug, caseId });
  const imageSource = getPatientStateImageSource({ patientSessionSlug, caseId, state });
  const idleSource = getPatientStateImageSource({ patientSessionSlug, caseId, state: "idle" });
  const talkingStillSource = getPatientStateImageSource({ patientSessionSlug, caseId, state: "talking" });
  const patientAssetKey = getPatientVisualAssetKey({ patientSessionSlug, caseId });
  const shouldShowVideo = state === "talking" && Boolean(talkingVideoSource);
  const initials = getPatientInitials(patientName, "PT");
  const hasFallbackImage = Boolean(imageSource);
  const player = useVideoPlayer(talkingVideoSource || null, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.timeUpdateEventInterval = 0.05;
  });
  const [hasUsableVideoFrame, setHasUsableVideoFrame] = useState(false);
  const videoOpacity = useRef(new Animated.Value(0)).current;
  const videoRevealAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  const hideVideo = useCallback(() => {
    videoRevealAnimationRef.current?.stop();
    videoRevealAnimationRef.current = null;
    videoOpacity.setValue(0);
  }, [videoOpacity]);

  useEffect(() => {
    if (!shouldShowVideo) {
      hideVideo();
      setHasUsableVideoFrame(false);
      return;
    }

    const subscription = player.addListener("timeUpdate", ({ currentTime }) => {
      if (currentTime > 0) setHasUsableVideoFrame(true);
    });
    return () => subscription.remove();
  }, [hideVideo, player, shouldShowVideo]);

  useEffect(() => {
    if (!shouldShowVideo || !hasUsableVideoFrame) {
      hideVideo();
      return;
    }

    const animation = Animated.timing(videoOpacity, {
      toValue: 1,
      duration: VIDEO_REVEAL_DURATION_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: Platform.OS !== "web",
    });
    videoRevealAnimationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished && videoRevealAnimationRef.current === animation) {
        videoRevealAnimationRef.current = null;
      }
    });
    return hideVideo;
  }, [hasUsableVideoFrame, hideVideo, shouldShowVideo, videoOpacity]);

  useEffect(() => {
    if (SHOW_AVATAR_DEBUG) {
      console.debug("[AnimatedPatientAvatar]", {
        patientSessionSlug,
        caseId,
        patientAssetKey,
        state,
        hasIdleAsset: Boolean(idleSource),
        hasTalkingAsset: Boolean(talkingVideoSource),
        hasTalkingStill: Boolean(talkingStillSource),
        shouldShowVideo,
      });
    }

    try {
      if (shouldShowVideo) {
        hideVideo();
        setHasUsableVideoFrame(false);
        player.play();
        return;
      }

      hideVideo();
      setHasUsableVideoFrame(false);
      player.pause();
      player.currentTime = 0;
    } catch {
      hideVideo();
      setHasUsableVideoFrame(false);
      // The native player may already be disposed during fast refresh or route changes.
    }
  }, [
    caseId,
    patientAssetKey,
    patientSessionSlug,
    player,
    shouldShowVideo,
    state,
    idleSource,
    talkingStillSource,
    talkingVideoSource,
    hideVideo,
  ]);

  useEffect(() => hideVideo, [hideVideo]);

  const resolvedBorderRadius = borderRadius ?? size / 2;
  const frameStyle = fill
    ? {
        width: "100%" as const,
        height: "100%" as const,
        borderRadius: resolvedBorderRadius,
      }
    : {
        width: size,
        height: size,
        borderRadius: resolvedBorderRadius,
      };

  return (
    <View style={[styles.frame, frameStyle]}>
      {hasFallbackImage ? (
        <Image
          source={imageSource}
          style={styles.mediaFill}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.initialsFrame, styles.mediaFill]}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      )}

      {talkingVideoSource ? (
        <Animated.View pointerEvents="none" style={[styles.mediaFill, styles.videoFill, { opacity: videoOpacity }]}>
          <VideoView
            key={`talking-${String(talkingVideoSource)}`}
            player={player}
            style={styles.mediaFill}
            contentFit="cover"
            surfaceType={Platform.OS === "android" ? "textureView" : undefined}
            nativeControls={false}
            allowsPictureInPicture={false}
          />
        </Animated.View>
      ) : null}

      {SHOW_AVATAR_DEBUG_LABEL ? (
        <View style={styles.debugBadge}>
          <Text style={styles.debugBadgeText}>{state.toUpperCase()}</Text>
        </View>
      ) : null}
    </View>
  );
}

export type { AnimatedPatientAvatarState };

const styles = StyleSheet.create({
  frame: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  mediaFill: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    backgroundColor: "#111827",
  },
  videoFill: {
    zIndex: 2,
    elevation: 2,
  },
  initialsFrame: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#faf5ff",
  },
  initials: {
    color: "#4c1d95",
    fontWeight: "900",
    fontSize: 22,
  },
  debugBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    zIndex: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(17, 24, 39, 0.72)",
  },
  debugBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
});
