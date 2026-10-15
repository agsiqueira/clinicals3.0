import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../src/api/client";
import { captureSession } from "../../src/api/sessionToken";
import { TodayContent, TodayHeader, todayStyles } from "../../src/components/today/TodayPresentation";
import { todayFocus, type TodayResponse } from "../../src/components/today/model";

export default function TodayScreen() {
  const router = useRouter();
  const { userId: authUserId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const loadEpoch = useRef(0);
  const [dataUserId, setDataUserId] = useState<string | null>(null);
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userHeaders = useMemo<Record<string, string>>(() => ({ expectedUserId: user?.id || "" }), [user?.id]);

  const loadToday = useCallback(
    async ({ asRefresh = false } = {}) => {
      if (!userLoaded) {
        setLoading(true);
        return;
      }

      if (!user?.id) {
        setToday(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const epoch = ++loadEpoch.current;
      let assertSession: () => void;
      try { assertSession = captureSession(user.id); }
      catch { setToday(null); setDataUserId(null); setLoading(false); setRefreshing(false); return; }
      const current = () => { try { assertSession(); return epoch === loadEpoch.current; } catch { return false; } };
      try {
        setError(null);
        if (asRefresh) setRefreshing(true);
        else setLoading(true);

        const data = await api.getToday(userHeaders);
        if (!current()) return;
        setDataUserId(user.id);
        setToday(data || null);
      } catch (err: any) {
        if (current()) setError(err?.message || "Failed to load Today.");
      } finally {
        if (current()) { setLoading(false); setRefreshing(false); }
      }
    },
    [userHeaders, userLoaded]
  );

  useFocusEffect(
    useCallback(() => {
      loadToday();
    }, [loadToday])
  );

  const visibleToday = dataUserId === authUserId ? today : null;
  const focus = todayFocus(visibleToday);
  const continueLearning = () => {
    if (!visibleToday) return;
    const route = focus.route;
    router.push(route.pathname === "/module-0" ? "/module-0" :
      "params" in route ? { pathname: "/(tabs)/cases", params: { ...route.params, focusSessionToken: String(Date.now()) } } : "/(tabs)/cases");
  };

  if (loading && !visibleToday) {
    return (
      <SafeAreaView style={todayStyles.screen}>
        <View style={todayStyles.centered}>
          <ActivityIndicator />
          <Text style={todayStyles.body}>Loading Today...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={todayStyles.screen}>
    <TodayHeader />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={todayStyles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadToday({ asRefresh: true })} />}>
      {error && <View accessibilityRole="alert" style={todayStyles.error}><Text style={todayStyles.body}>{error}</Text><Pressable accessibilityRole="button" onPress={() => loadToday()} style={todayStyles.retry}><Text>Retry</Text></Pressable></View>}
      {visibleToday && <TodayContent data={visibleToday} onContinue={continueLearning} onRoadmap={() => router.push("/(tabs)/cases")} />}
    </ScrollView>
  </SafeAreaView>;
}
