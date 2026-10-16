import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { module0Fonts as f } from "../module0/tokens";
import { achievementState, encounterMetadata, finiteValue, type PortfolioMilestone, type RecentPatient, type StoryIdentity, type StoryPath } from "./gallery";

// Exact matches to the corrected Figma frame; the existing Today/Roadmap assets are unchanged.
export const portfolioArtwork = {
  hero: require("../../../assets/today/a889e.png"),
  milestone: require("../../../assets/roadmap/destination.png"),
  introduction: require("../../../assets/portfolio/introduction.png"),
  encounter: require("../../../assets/roadmap/encounter.png"),
};

export function LearnerStoryHero({ identity, path, streak, progress }: {
  identity: StoryIdentity; path?: StoryPath; streak?: number | null; progress: ReactNode;
}) {
  const { width, fontScale = 1 } = useWindowDimensions();
  const narrow = width < 360;
  const title = identity.levelTitle || "Your clinical story";
  // Reserve full-width copy when the title would crowd the illustration.
  // The same content budget applies to every backend title and font scale.
  const stacked = narrow || title.length * fontScale > 32;
  const level = finiteValue(identity.professionalLevel), xp = finiteValue(identity.xp), days = finiteValue(streak);
  const completed = finiteValue(path?.completedSessions), total = finiteValue(path?.totalSessions);
  return <View testID="portfolio-story-hero" style={s.hero}>
    <View testID="portfolio-story-row" style={[s.heroRow, stacked && s.stackedHeroRow]}>
      <View testID="portfolio-story-copy" style={[s.heroCopy, stacked && s.stackedHeroCopy]}>
        <Text style={s.eyebrow}>YOUR CLINICAL STORY</Text>
        <Text accessibilityRole="header" style={[s.heroTitle, narrow && s.narrowTitle]}>{title}</Text>
        <Text style={s.heroMeta}>Level {level ?? "—"} · {xp ?? "—"} XP</Text>
      </View>
      <Image testID="portfolio-story-art" source={portfolioArtwork.hero} contentFit="cover" accessible={false} style={[s.heroArt, narrow && s.narrowHeroArt]} />
    </View>
    <Text style={s.path}>{path?.pathTitle || "Learning path"}</Text>
    {progress}
    <View style={s.heroFoot}>
      <Text style={s.completion}>{completed !== null && total !== null ? `${completed} of ${total} encounters completed` : "Progress unavailable"}</Text>
      <View style={s.streak}><Ionicons name="flame-outline" size={13} color="#6150ED"/><Text style={s.streakText}>{days === null ? "Streak unavailable" : `${days} ${days === 1 ? "day" : "days"}`}</Text></View>
    </View>
  </View>;
}

export function AchievementGallery({ milestones, renderDetail }: {
  milestones: PortfolioMilestone[]; renderDetail: (milestone: PortfolioMilestone) => ReactNode;
}) {
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const visible = expanded ? milestones : milestones.slice(0, 3);
  const detail = milestones.find(m => m.slug === selected);
  return <View testID="portfolio-achievement-gallery" style={s.section}>
    <View style={s.heading}><Text style={s.eyebrow}>COLLECT YOUR MILESTONES</Text><Text accessibilityRole="header" style={s.sectionTitle}>My Achievements</Text></View>
    {milestones.length === 0 ? <Text style={s.body}>Milestones will appear as your clinical work is evaluated.</Text> : <View testID="portfolio-badge-grid" style={s.grid}>
      {visible.map(milestone => {
        const state = achievementState(milestone.status);
        const open = selected === milestone.slug;
        return <Pressable key={milestone.slug} testID={`portfolio-badge-${milestone.slug}`} accessibilityRole="button" accessibilityLabel={`${milestone.title}, ${state.label}`} accessibilityState={{expanded:open}} onPress={() => setSelected(open ? null : milestone.slug)} style={[s.badge, {width:width < 390 ? "47.8%" : width >= 720 ? "23.8%" : "31%"}, state.locked && s.lockedBadge]}>
          {state.locked ? <View style={s.lockedArt}><Ionicons name="lock-closed-outline" size={26} color="#8A829F" /></View> : <Image testID={`portfolio-badge-art-${milestone.slug}`} source={milestone.category === "competency" ? portfolioArtwork.introduction : portfolioArtwork.milestone} contentFit="cover" accessible={false} style={s.badgeArt} />}
          <Text style={s.badgeTitle}>{milestone.title}</Text>
          <Text style={[s.badgeState, state.earned && s.earnedText]}>{state.label.toUpperCase()}</Text>
        </Pressable>;
      })}
    </View>}
    {milestones.length > 3 && <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={() => {setExpanded(!expanded); setSelected(null);}} style={s.viewAll}><Text style={s.link}>{expanded ? "Show fewer milestones" : `View all ${milestones.length} milestones`} →</Text></Pressable>}
    {detail && <View testID="portfolio-selected-milestone">{renderDetail(detail)}</View>}
  </View>;
}

export function EncounterGallery({ patients, expanded, onViewAll }: {
  patients: RecentPatient[]; expanded: boolean; onViewAll: () => void;
}) {
  const { width } = useWindowDimensions();
  const patient = patients[0];
  const metadata = patient ? encounterMetadata(patient) : null;
  return <View testID="portfolio-encounter-gallery" style={s.section}>
    <View style={s.heading}><Text style={s.eyebrow}>YOUR EXPERIENCE</Text><Text accessibilityRole="header" style={s.sectionTitle}>Patients You’ve Encountered</Text></View>
    {patient && metadata ? <View testID="portfolio-encounter-preview" style={s.encounter}>
      <Image testID="portfolio-encounter-art" source={portfolioArtwork.encounter} contentFit="cover" accessible={false} style={[s.encounterArt, width < 360 && {width:72,height:82}]} />
      <View style={s.encounterCopy}>
        <Text style={s.encounterLabel}>COMPLETED ENCOUNTER</Text>
        <Text style={s.patientTitle}>{metadata.name}</Text>
        {!!metadata.task && <Text style={s.body}>{metadata.task}</Text>}
        <View style={s.encounterMeta}>
          {!!metadata.medal && <Image source={metadata.medal} contentFit="contain" accessible={false} style={{width:14,height:14}}/>}
          <Text style={s.metaText}>{metadata.result}</Text>
        </View>
      </View>
    </View> : <Text style={s.body}>Completed patient encounters will appear here.</Text>}
    {patients.length > 0 && <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={onViewAll} style={s.viewAll}><Text style={s.link}>{expanded ? "Hide completed encounter history" : "View all completed encounters"} →</Text></Pressable>}
  </View>;
}

const s = StyleSheet.create({
  hero:{backgroundColor:"#F2EEFF",borderRadius:22,paddingHorizontal:17,paddingVertical:18,gap:12},
  heroRow:{flexDirection:"row",alignItems:"center",gap:7}, heroCopy:{flex:1,minWidth:0,gap:6},
  stackedHeroRow:{flexDirection:"column",alignItems:"stretch"}, stackedHeroCopy:{flexGrow:0,flexShrink:0,flexBasis:"auto",width:"100%"},
  eyebrow:{fontFamily:f.bold,fontSize:10,lineHeight:12,color:"#6150ED"},
  heroTitle:{fontFamily:f.bold,fontSize:24,lineHeight:29,color:"#152044"},narrowTitle:{fontSize:22,lineHeight:27},
  heroMeta:{fontFamily:f.semibold,fontSize:12,lineHeight:15,color:"#727EA1"},
  heroArt:{width:132,height:154,borderRadius:18,flexShrink:0},narrowHeroArt:{width:96,height:112},
  path:{fontFamily:f.semibold,fontSize:12,lineHeight:15,color:"#152044"},
  heroFoot:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",columnGap:10,rowGap:6},
  completion:{fontFamily:f.regular,fontSize:11,lineHeight:14,color:"#727EA1",flexShrink:1},
  streak:{flexDirection:"row",alignItems:"center",gap:3},streakText:{fontFamily:f.semibold,fontSize:11,lineHeight:14,color:"#6150ED",flexShrink:1},
  section:{gap:12},heading:{gap:5},sectionTitle:{fontFamily:f.bold,fontSize:19,lineHeight:23,color:"#152044"},
  grid:{flexDirection:"row",flexWrap:"wrap",gap:11,alignItems:"stretch"},
  badge:{backgroundColor:"#F2EEFF",paddingHorizontal:8,paddingVertical:11,borderRadius:15,gap:7,alignItems:"center",minHeight:44},
  lockedBadge:{backgroundColor:"#F7F6FC"},badgeArt:{width:87,height:86,borderRadius:12},
  lockedArt:{width:84,height:86,borderRadius:13,backgroundColor:"#E6E3EF",alignItems:"center",justifyContent:"center"},
  badgeTitle:{fontFamily:f.semibold,fontSize:11,lineHeight:14,color:"#152044",alignSelf:"stretch"},
  badgeState:{fontFamily:f.semibold,fontSize:9,lineHeight:12,color:"#727EA1",alignSelf:"stretch"},earnedText:{color:"#6150ED"},
  body:{fontFamily:f.regular,fontSize:11,lineHeight:17,color:"#727EA1"},
  encounter:{backgroundColor:"#F7F6FC",borderRadius:17,padding:12,flexDirection:"row",alignItems:"center",gap:12},
  encounterArt:{width:88,height:100,borderRadius:13,flexShrink:0},encounterCopy:{flex:1,minWidth:0,gap:8},
  encounterLabel:{fontFamily:f.bold,fontSize:9,lineHeight:13,color:"#6150ED"},patientTitle:{fontFamily:f.bold,fontSize:17,lineHeight:23,color:"#152044"},
  encounterMeta:{flexDirection:"row",alignItems:"center",gap:4},metaText:{fontFamily:f.semibold,fontSize:11,lineHeight:17,color:"#152044",flexShrink:1},
  viewAll:{backgroundColor:"#F2EEFF",borderRadius:12,padding:12,minHeight:44,justifyContent:"center"},link:{fontFamily:f.semibold,fontSize:12,lineHeight:18,color:"#6150ED"},
});
