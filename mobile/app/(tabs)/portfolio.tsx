import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../src/api/client";
import { portfolioStyles } from "../../src/components/portfolio/presentation";
import { AchievementGallery, EncounterGallery, LearnerStoryHero } from "../../src/components/portfolio/IllustratedPortfolio";
import { encounterMetadata, type PortfolioMilestone, type RecentPatient } from "../../src/components/portfolio/gallery";
import { ClinicalPerformance } from "../../src/components/portfolio/ClinicalPerformance";
import { scoredEncounters } from "../../src/components/portfolio/performance";
import { useFonts } from "expo-font";
import { AccountSettingsButton } from "../../src/components/AccountSettingsButton";
import { CompetencyProfileTab } from "../../src/components/CompetencyProfileTab";
import { PatientAvatar } from "../../src/components/PatientAvatar";
import { Sparkline } from "../../src/components/Sparkline";
import { TimelineEvent } from "../../src/components/TimelineEvent";

type PortfolioCompetency = {
  slug: string;
  title: string;
  attempts: number;
  achievedCount: number;
  bestPercentScore?: number | null;
  latestPercentScore?: number | null;
};

type ClinicalPortfolio = {
  identity?: {
    professionalLevel?: number | null;
    levelTitle?: string | null;
    xp?: number | null;
    nextLevelXp?: number | null;
  };
  streak?: {
    currentCount?: number | null;
  };
  learningPathProgress?: {
    pathTitle?: string | null;
    completedSessions?: number | null;
    totalSessions?: number | null;
    percentComplete?: number | null;
    currentUnit?: {
      slug?: string | null;
      title?: string | null;
      sortOrder?: number | null;
    } | null;
    currentSession?: {
      slug?: string | null;
      title?: string | null;
      bestSessionScore?: number | null;
    } | null;
  };
  milestones?: PortfolioMilestone[];
  competencies?: PortfolioCompetency[];
  professionalQualities?: unknown[];
  mentorCommendations?: unknown[];
  recentPatients?: RecentPatient[];
};

type TodayBriefing = {
  dailyBriefing?: {
    motivation?: string | null;
    focus?: string | null;
    nextGoal?: {
      type?: string | null;
      slug?: string | null;
      title?: string | null;
      icon?: string | null;
      currentValue?: number | null;
      targetValue?: number | null;
      description?: string | null;
    } | null;
  } | null;
};

const CATEGORY_ORDER = [
  "milestone",
  "progression",
  "competency",
  "mastery",
  "improvement",
  "streak",
];

type PortfolioTab = "badges" | "achievements" | "competencies";

const PORTFOLIO_TABS: { id: PortfolioTab; label: string }[] = [
  { id: "badges", label: "Badges" },
  { id: "achievements", label: "Achievements" },
  { id: "competencies", label: "Competencies" },
];

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercent(value: unknown) {
  return Math.max(0, Math.min(100, toNumber(value, 0)));
}

function progressRatio(current?: number | null, target?: number | null) {
  const denominator = toNumber(target, 0);
  if (denominator <= 0) return 0;
  return Math.max(0, Math.min(100, (toNumber(current, 0) / denominator) * 100));
}

function formatScore(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return "--";
  return `${Math.round(Number(value))}%`;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusLabel(status?: string | null) {
  if (status === "EARNED") return "Earned";
  if (status === "IN_PROGRESS") return "In progress";
  return "Locked";
}

function badgeLabel(tier?: string | null) {
  if (tier === "GOLD") return "Gold";
  if (tier === "SILVER") return "Silver";
  if (tier === "BRONZE") return "Bronze";
  if (tier === "NONE") return "No badge";
  return tier || "Completed";
}

function badgeIcon(tier?: string | null) {
  if (tier === "GOLD") return "🥇";
  if (tier === "SILVER") return "🥈";
  if (tier === "BRONZE") return "🥉";
  return "✓";
}

function patientNameFromTitle(title?: string | null) {
  if (!title) return "Patient";
  return title.split(":")[0]?.trim() || title;
}

function categoryTitle(category: string) {
  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function groupMilestones(milestones: PortfolioMilestone[] = []) {
  return [...milestones].reduce<Record<string, PortfolioMilestone[]>>((groups, milestone) => {
    const category = milestone.category || "milestone";
    groups[category] = groups[category] || [];
    groups[category].push(milestone);
    return groups;
  }, {});
}

function highlightedMilestone(milestones: PortfolioMilestone[] = []) {
  const sortedEarned = milestones
    .filter((milestone) => milestone.status === "EARNED")
    .sort((a, b) => new Date(b.earnedAt || 0).getTime() - new Date(a.earnedAt || 0).getTime());
  if (sortedEarned[0]) return sortedEarned[0];

  const inProgress = milestones
    .filter((milestone) => milestone.status === "IN_PROGRESS")
    .sort((a, b) => {
      const aRemaining = toNumber(a.targetValue, 0) - toNumber(a.currentValue, 0);
      const bRemaining = toNumber(b.targetValue, 0) - toNumber(b.currentValue, 0);
      return aRemaining - bRemaining;
    });
  if (inProgress[0]) return inProgress[0];

  return milestones.find((milestone) => milestone.status === "LOCKED") || milestones[0] || null;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={portfolioStyles.progressTrack}>
      <View style={[portfolioStyles.progressFill, { width: `${clampPercent(value)}%` }]} />
    </View>
  );
}

function goalProgressDisplay(goal?: {
  title?: string | null;
  description?: string | null;
  type?: string | null;
  status?: string | null;
  currentValue?: number | null;
  targetValue?: number | null;
}) {
  const current = Number(goal?.currentValue);
  const target = Number(goal?.targetValue);
  if (goal?.status === "EARNED") {
    return {
      lines: ["Completed"],
      progressValue: 100,
      showProgress: false,
    };
  }
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return null;

  const context = `${goal?.title || ""} ${goal?.description || ""} ${goal?.type || ""}`;
  const isUnlockScoreGoal = target === 84 || /unlock|score|best/i.test(context);

  if (isUnlockScoreGoal) {
    return {
      lines: [
        `Current best: ${Math.round(current)}%`,
        `Goal: ${Math.round(target)}% to unlock the next encounter`,
      ],
      progressValue: progressRatio(current, target),
      showProgress: true,
    };
  }

  const unit = /streak|day/i.test(context) ? " days" : " encounters";
  return {
    lines: [`${Math.round(current)} / ${Math.round(target)}${unit}`],
    progressValue: progressRatio(current, target),
    showProgress: true,
  };
}

function MilestoneCard({ milestone }: { milestone: PortfolioMilestone }) {
  const earned = milestone.status === "EARNED";
  const target = milestone.targetValue;
  const current = milestone.currentValue;
  const earnedLabel = milestone.earnedAt ? `Earned ${formatDate(milestone.earnedAt)}` : "Completed";

  return (
    <View style={[portfolioStyles.milestoneCard, earned && portfolioStyles.milestoneCardEarned]}>
      <Text style={portfolioStyles.milestoneIcon}>{milestone.icon || "•"}</Text>
      <View style={portfolioStyles.milestoneBody}>
        <View style={portfolioStyles.milestoneHeader}>
          <Text style={portfolioStyles.milestoneTitle}>{milestone.title}</Text>
          <Text style={[portfolioStyles.statusPill, earned && portfolioStyles.statusPillEarned]}>
            {statusLabel(milestone.status)}
          </Text>
        </View>
        {!!milestone.description && (
          <Text style={portfolioStyles.cardSubText}>{milestone.description}</Text>
        )}
        {earned ? (
          <Text style={portfolioStyles.milestoneProgressText}>{earnedLabel}</Text>
        ) : target != null ? (
          <>
            <Text style={portfolioStyles.milestoneProgressText}>
              {toNumber(current, 0)} / {target}
            </Text>
            <ProgressBar value={progressRatio(current, target)} />
          </>
        ) : null}
      </View>
    </View>
  );
}

export default function ClinicalPortfolioScreen() {
  const {userId,sessionId} = useAuth();
  return <ClinicalPortfolioContent key={`${userId || "signed-out"}:${sessionId || ""}`} />;
}

function ClinicalPortfolioContent() {
  useFonts({Module0Inter:require("../../assets/module0/Inter-Regular.ttf"),Module0InterSemiBold:require("../../assets/module0/Inter-SemiBold.ttf"),Module0InterBold:require("../../assets/module0/Inter-Bold.ttf")});
  const { userId: authUserId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [portfolio, setPortfolio] = useState<ClinicalPortfolio | null>(null);
  const [today, setToday] = useState<TodayBriefing | null>(null);
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const [showAllEncounters, setShowAllEncounters] = useState(false);
  const [activeTab, setActiveTab] = useState<PortfolioTab>("badges");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userHeaders = useMemo<Record<string, string>>(() => ({ expectedUserId: user?.id || "" }), [user?.id]);

  const loadPortfolio = useCallback(
    async ({ asRefresh = false } = {}) => {
      if (!userLoaded) {
        setLoading(true);
        return;
      }

      if (!user?.id) {
        setPortfolio(null);
        setToday(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        setError(null);
        if (asRefresh) setRefreshing(true);
        else setLoading(true);

        const portfolioData = await api.getClinicalPortfolio(userHeaders);
        setPortfolio(portfolioData || null);

        try {
          const todayData = await api.getToday(userHeaders);
          setToday(todayData || null);
        } catch {
          setToday(null);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load your portfolio.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userHeaders, userLoaded]
  );

  useFocusEffect(
    useCallback(() => {
      loadPortfolio();
    }, [loadPortfolio])
  );

  const groupedMilestones = groupMilestones(portfolio?.milestones || []);
  const sortedCategories = Object.keys(groupedMilestones).sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a);
    const bIndex = CATEGORY_ORDER.indexOf(b);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
  const identity = portfolio?.identity || {};
  const streak = portfolio?.streak || {};
  const milestones = portfolio?.milestones || [];
  const currentGoal = today?.dailyBriefing?.nextGoal || highlightedMilestone(milestones);
  const currentGoalProgress = goalProgressDisplay(currentGoal);
  const allRecentPatients = portfolio?.recentPatients || [];
  const highlightedMilestones = milestones.slice(0, 6);
  const timelineEvents = [
    ...allRecentPatients.slice(0, 3).map((patient) => ({
      key: `patient-${patient.sessionAttemptId}`,
      icon: badgeIcon(patient.badgeTier),
      title: `${patientNameFromTitle(patient.patientSessionTitle)} completed`,
      detail: `${badgeLabel(patient.badgeTier)} · ${formatScore(patient.sessionScore)}`,
      date: formatDate(patient.scoredAt),
    })),
    ...milestones
      .filter((milestone) => milestone.status === "EARNED")
      .slice(0, 3)
      .map((milestone) => ({
        key: `milestone-${milestone.slug}`,
        icon: milestone.icon || "★",
        title: `${milestone.title} earned`,
        detail: milestone.description || "Professional milestone added to your portfolio.",
        date: formatDate(milestone.earnedAt),
      })),
  ].slice(0, 5);

  if (loading && !portfolio) {
    return (
      <SafeAreaView style={portfolioStyles.container}>
        <View style={portfolioStyles.centeredState}>
          <ActivityIndicator />
          <Text style={portfolioStyles.stateText}>Loading Portfolio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={portfolioStyles.container}>
      <ScrollView testID="portfolio-scroll"
        contentContainerStyle={portfolioStyles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadPortfolio({ asRefresh: true })} />
        }
      >
        <View style={portfolioStyles.screenHeaderRow}>
          <View style={portfolioStyles.screenHeaderText}>
            <Text style={portfolioStyles.screenTitle}>Portfolio</Text>
            <Text style={portfolioStyles.screenSubtitle}>Your clinical story, one encounter at a time.</Text>
          </View>
          <View style={portfolioStyles.settingsSurface}><AccountSettingsButton /></View>
        </View>

        {error ? (
          <View style={portfolioStyles.errorBox}>
            <Text style={portfolioStyles.errorText}>{error}</Text>
            <Pressable onPress={() => loadPortfolio()} style={portfolioStyles.retryButton}>
              <Text style={portfolioStyles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <LearnerStoryHero identity={identity} path={portfolio?.learningPathProgress} streak={streak.currentCount}
          progress={portfolio?.learningPathProgress?.percentComplete != null ? <ProgressBar value={portfolio.learningPathProgress.percentComplete} /> : null} />

        <View style={portfolioStyles.portfolioTabRow}>
          {PORTFOLIO_TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="tab"
                accessibilityState={{selected}}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  portfolioStyles.portfolioTabButton,
                  selected && portfolioStyles.portfolioTabButtonActive,
                ]}
              >
                <Text
                  style={[
                    portfolioStyles.portfolioTabText,
                    selected && portfolioStyles.portfolioTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === "badges" ? (
          <>
            <AchievementGallery milestones={milestones} renderDetail={milestone => <MilestoneCard milestone={milestone}/>} />
            <EncounterGallery patients={allRecentPatients} expanded={showAllEncounters} onViewAll={() => setShowAllEncounters(visible => !visible)} />
            {showAllEncounters && <View testID="portfolio-encounter-history" style={portfolioStyles.dashboardCard}>
              <Text style={portfolioStyles.sectionTitle}>Clinical Journey</Text>
              {                allRecentPatients.map((patient) => (
                  <View key={patient.sessionAttemptId} style={portfolioStyles.patientCompactCard}>
                    <PatientAvatar
                      patientName={patientNameFromTitle(patient.patientSessionTitle || patient.caseTitle)}
                      caseId={patient.caseId}
                      size={46}
                      status="completed"
                      tier={patient.badgeTier}
                    />
                    <View style={portfolioStyles.patientMain}>
                      <Text style={portfolioStyles.cardTitle}>
                        {patientNameFromTitle(patient.patientSessionTitle || patient.caseTitle)}
                      </Text>
                      {!!encounterMetadata(patient).task && <Text style={portfolioStyles.cardSubText}>{encounterMetadata(patient).task}</Text>}
                      <Text style={portfolioStyles.cardSubText}>
                        {badgeLabel(patient.badgeTier)} · {formatScore(patient.sessionScore)}
                      </Text>
                    </View>
                    <View style={portfolioStyles.patientMeta}>
                      <Text style={portfolioStyles.patientBadgeIcon}>{badgeIcon(patient.badgeTier)}</Text>
                      {!!patient.scoredAt && <Text style={portfolioStyles.dateText}>{formatDate(patient.scoredAt)}</Text>}
                    </View>
                  </View>
                ))}
            </View>}
            <View style={portfolioStyles.dashboardCard}>
              <Text style={portfolioStyles.sectionTitle}>Clinical Performance</Text>
              {scoredEncounters(allRecentPatients).length >= 2 && <Text style={portfolioStyles.cardSubText}>Session scores across completed patient encounters</Text>}
              <ClinicalPerformance patients={allRecentPatients} />
            </View>
          </>
        ) : null}

        {activeTab === "badges" || activeTab === "achievements" ? (
          <>
        <View style={portfolioStyles.dashboardCard}>
          <Text style={portfolioStyles.sectionTitle}>Clinical Growth</Text>
          <Text style={portfolioStyles.cardSubText}>Competencies develop across encounters</Text>
          {(portfolio?.competencies || []).length === 0 ? (
            <Text style={portfolioStyles.emptyText}>
              Complete more encounters to begin tracking your growth.
            </Text>
          ) : (
            (portfolio?.competencies || []).map((competency) => (
              <View key={competency.slug} style={portfolioStyles.growthRow}>
                <View style={portfolioStyles.growthCopy}>
                  <Text style={portfolioStyles.cardTitle}>{competency.title}</Text>
                  <Text style={portfolioStyles.cardSubText}>
                    Best {formatScore(competency.bestPercentScore)} · Latest {formatScore(competency.latestPercentScore)}
                  </Text>
                </View>
                <Sparkline
                  best={competency.bestPercentScore}
                  latest={competency.latestPercentScore}
                />
              </View>
            ))
          )}
        </View>

        {!!currentGoal && (
          <View style={portfolioStyles.dashboardCardAccent}>
            <Text style={portfolioStyles.smallLabel}>Current Goal</Text>
            <View style={portfolioStyles.goalHeader}>
              <Text style={portfolioStyles.goalIcon}>{currentGoal.icon || "★"}</Text>
              <View style={portfolioStyles.goalBody}>
                <Text style={portfolioStyles.cardTitle}>{currentGoal.title}</Text>
                {!!currentGoal.description && (
                  <Text style={portfolioStyles.cardSubText}>{currentGoal.description}</Text>
                )}
              </View>
            </View>
            {!!currentGoalProgress ? (
              <>
                {currentGoalProgress.lines.map((line) => (
                  <Text key={line} style={portfolioStyles.milestoneProgressText}>
                    {line}
                  </Text>
                ))}
                {currentGoalProgress.showProgress ? (
                  <ProgressBar value={currentGoalProgress.progressValue} />
                ) : null}
              </>
            ) : null}
          </View>
        )}

          </>
        ) : null}

        {activeTab === "achievements" ? (
          <>
        <View style={portfolioStyles.dashboardCard}>
          <Text style={portfolioStyles.sectionTitle}>Competency Growth</Text>
          {(portfolio?.competencies || []).map((competency) => (
            <View key={competency.slug} style={portfolioStyles.competencyRow}>
              <View style={portfolioStyles.competencyMain}>
                <Text style={portfolioStyles.cardTitle}>{competency.title}</Text>
                <Text style={portfolioStyles.cardSubText}>
                  Best {formatScore(competency.bestPercentScore)} · Latest {formatScore(competency.latestPercentScore)}
                </Text>
              </View>
              <Text style={portfolioStyles.competencyBadge}>
                {competency.achievedCount}/{competency.attempts}
              </Text>
            </View>
          ))}
        </View>

        <View style={portfolioStyles.dashboardCard}>
          <Text style={portfolioStyles.sectionTitle}>Growth Timeline</Text>
          {timelineEvents.length === 0 ? (
            <Text style={portfolioStyles.cardSubText}>
              Your completed encounters, badges, milestones, and competency growth will appear here as your clinical journey develops.
            </Text>
          ) : (
            timelineEvents.map((event) => (
              <TimelineEvent
                key={event.key}
                icon={event.icon}
                title={event.title}
                detail={event.detail}
                date={event.date}
              />
            ))
          )}
        </View>

        <View style={portfolioStyles.section}>
          <View style={portfolioStyles.sectionHeadingRow}>
            <Text style={portfolioStyles.sectionTitle}>Professional Milestones</Text>
            <Pressable
              onPress={() => setShowAllMilestones((visible) => !visible)}
              style={portfolioStyles.subtleToggle}
            >
              <Text style={portfolioStyles.subtleToggleText}>
                {showAllMilestones ? "Hide milestones" : "Show all milestones"}
              </Text>
            </Pressable>
          </View>
          {!showAllMilestones && highlightedMilestones.length > 0 ? (
            <View style={portfolioStyles.milestoneStrip}>
              {highlightedMilestones.map((milestone) => (
                <View
                  key={milestone.slug}
                  style={[
                    portfolioStyles.milestoneStripItem,
                    milestone.status === "EARNED" && portfolioStyles.milestoneStripItemEarned,
                  ]}
                >
                  <Text style={portfolioStyles.milestoneStripIcon}>{milestone.icon || "★"}</Text>
                  <Text style={portfolioStyles.milestoneStripText} numberOfLines={2}>
                    {milestone.title}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {showAllMilestones ? (
            sortedCategories.map((category) => (
              <View key={category} style={portfolioStyles.milestoneGroup}>
                <Text style={portfolioStyles.categoryTitle}>{categoryTitle(category)}</Text>
                {groupedMilestones[category].map((milestone) => (
                  <MilestoneCard key={milestone.slug} milestone={milestone} />
                ))}
              </View>
            ))
          ) : (
            highlightedMilestones.length === 0 && (
              <Text style={portfolioStyles.emptyText}>Milestones will appear as your clinical work is evaluated.</Text>
            )
          )}
        </View>

        <View style={portfolioStyles.deferredGrid}>
          <View style={portfolioStyles.placeholderCardSoft}>
            <Text style={portfolioStyles.smallLabel}>Professional Qualities</Text>
            <Text style={portfolioStyles.placeholderText}>
              Dr. Martinez will begin recognizing professional qualities as you complete more encounters.
            </Text>
          </View>
          <View style={portfolioStyles.placeholderCardSoft}>
            <Text style={portfolioStyles.smallLabel}>Mentor Commendations</Text>
            <Text style={portfolioStyles.placeholderText}>
              Commendations from Dr. Martinez will appear as your clinical portfolio grows.
            </Text>
          </View>
        </View>
          </>
        ) : null}

        {activeTab === "competencies" ? (
          <CompetencyProfileTab userHeaders={userHeaders} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
