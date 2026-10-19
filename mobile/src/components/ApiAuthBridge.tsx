import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useAuth, useClerk, useUser } from "@clerk/clerk-expo";
import { bindSession, onSessionExpired } from "../api/sessionToken";

/** Bind the transport before mounting any learner effects. */
export function ApiAuthBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth();
  const { isLoaded: profileLoaded, user } = useUser();
  const { signOut } = useClerk();
  const owner = `${userId || ""}:${sessionId || ""}`;
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const [bound, setBound] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState(false);
  const [profileTimedOut, setProfileTimedOut] = useState(false);
  const recoveringRef = useRef(false);

  const recover = async () => {
    if (recoveringRef.current) return;
    const requestedOwner = owner;
    recoveringRef.current = true;
    setRecovering(true); setRecoveryError(false);
    bindSession(null, null, null);
    try { await signOut({ sessionId: sessionId || undefined, redirectUrl: "/signin" }); }
    catch { if (currentOwner.current === requestedOwner) setRecoveryError(true); }
    finally { recoveringRef.current = false; }
  };
  useLayoutEffect(() => {
    bindSession(isLoaded && isSignedIn ? userId : null, isLoaded && isSignedIn ? sessionId : null, getToken);
    setBound(owner);
  }, [isLoaded, isSignedIn, userId, sessionId, getToken, owner]);
  useLayoutEffect(() => onSessionExpired(() => { void recover(); }), [owner, signOut]);
  useLayoutEffect(() => () => bindSession(null, null, null), []);
  useEffect(() => { setRecovering(false); setRecoveryError(false); setProfileTimedOut(false); }, [owner]);
  useEffect(() => {
    if (isLoaded && isSignedIn && (!userId || !sessionId)) void recover();
  }, [isLoaded, isSignedIn, userId, sessionId]);
  useEffect(() => {
    if (isLoaded && (!isSignedIn || (profileLoaded && user?.id === userId))) return;
    const timer = setTimeout(() => setProfileTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, profileLoaded, user?.id, userId]);

  if (!isLoaded || bound !== owner || (isSignedIn && (!profileLoaded || user?.id !== userId)) || recovering) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
      {!recoveryError && !profileTimedOut && <ActivityIndicator accessibilityLabel={recovering ? "Returning to sign in" : "Loading session"} />}
      {(recoveryError || profileTimedOut) && <><Text accessibilityRole="alert">Your session is unavailable. Sign in again to continue.</Text><Pressable accessibilityRole="button" onPress={() => { void recover(); }}><Text>Sign in again</Text></Pressable></>}
    </View>;
  }
  // Remount learner state/audio only when the account changes, not token refresh.
  return <LearnerBoundary key={userId || "signed-out"}>{children}</LearnerBoundary>;
}
function LearnerBoundary({ children }: { children: ReactNode }) { return <>{children}</>; }
