import { useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useAuth, useClerk, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/** One account menu for all tabs, using the established Clerk session sign-out flow. */
export function AccountSettingsButton() {
  const { userId, sessionId } = useAuth();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const focused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const owner = `${userId || ""}:${sessionId || ""}`;
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const [anchor, setAnchor] = useState({ x: 16, y: 60, width: 260 });
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trigger = useRef<any>(null), firstAction = useRef<any>(null);
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const visible = focused && openedFor === owner;
  const account = isLoaded && !!user && user.id === userId
    ? user.fullName || user.firstName || user.username || user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "Account"
    : "Account unavailable";
  const dismiss = () => {
    setOpenedFor(null);
    requestAnimationFrame(() => trigger.current?.focus?.());
  };
  useEffect(() => { setOpenedFor(null); setError(null); setSigningOut(false); }, [owner, focused]);
  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); dismiss(); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [visible]);
  const open = () => {
    if (visible) return dismiss();
    if (!userId) { router.replace("/signin"); return; }
    const requestedOwner = owner;
    const panelWidth = Math.min(280, width - 32);
    setAnchor({ x: Math.max(16, width - panelWidth - 16), y: 60, width: panelWidth });
    setError(null); setOpenedFor(owner);
    trigger.current?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
      if (currentOwner.current !== requestedOwner) return;
      const panelWidth = Math.min(280, width - 32);
      setAnchor({ x: Math.max(16, Math.min(x + w - panelWidth, width - panelWidth - 16)), y: Math.max(8, Math.min(y + h + 6, height - 150)), width: panelWidth });
      setError(null); setOpenedFor(owner);
    });
  };
  const handleSignOut = async () => {
    if (signingOut || currentOwner.current !== owner) return;
    const requestedOwner = owner;
    setSigningOut(true); setOpenedFor(null);
    try {
      await signOut({ sessionId: sessionId || undefined, redirectUrl: "/signin" });
      if (currentOwner.current === requestedOwner) router.replace("/signin");
    } catch (err) {
      if (currentOwner.current !== requestedOwner) return;
      setSigningOut(false); setError("Could not sign out. Please try again."); setOpenedFor(owner);
    }
  };
  return <>
    <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel="Account settings" accessibilityState={{ expanded: visible, disabled: signingOut }} disabled={signingOut} onPress={open} style={styles.gear}>
      <MaterialCommunityIcons name="cog-outline" size={25} color="#152044" accessible={false} />
    </Pressable>
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss} onShow={() => firstAction.current?.focus?.()}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss account settings" onPress={dismiss} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal accessibilityLabel="Account settings menu" style={[styles.menu, { left: anchor.x, top: anchor.y, width: anchor.width }]}>
          <Text style={styles.label}>Account</Text><Text style={styles.account}>{account}</Text>
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable ref={firstAction} accessibilityRole="button" onPress={handleSignOut} disabled={signingOut} style={styles.action}><Text style={styles.actionText}>Sign Out</Text></Pressable>
        </View>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  gear: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  overlay: { flex: 1 },
  menu: { position: "absolute", backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#E6E8F2", padding: 16, elevation: 8, boxShadow: "0px 4px 18px rgba(21,32,68,0.12)" },
  label: { color: "#727EA1", fontSize: 11, marginBottom: 4 },
  account: { color: "#152044", fontSize: 14, fontWeight: "600" },
  action: { minHeight: 44, justifyContent: "center", marginTop: 8 },
  actionText: { color: "#6150ED", fontSize: 14, fontWeight: "600" },
  error: { color: "#9c3232", fontSize: 12, marginTop: 8 },
});
