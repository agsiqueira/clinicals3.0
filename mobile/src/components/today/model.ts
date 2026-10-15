import type { RotationUnit } from "../RotationCard";
import type { Module0Summary } from "../../types/clinicalReadiness";
export type TodayIdentity = {
  professionalLevel?: number | null;
  levelTitle?: string | null;
  xp?: number | null;
  nextLevelXp?: number | null;
  streak?: {
    currentCount?: number | null;
    longestCount?: number | null;
    status?: string | null;
  } | null;
};

export type TodayEncounter = {
  patientSessionId?: string | null;
  patientSessionSlug?: string | null;
  caseId?: string | null;
  title?: string | null;
  displayTitle?: string | null;
  description?: string | null;
  unitTitle?: string | null;
  status?: "locked" | "available" | "completed" | string;
  badgeTier?: "GOLD" | "SILVER" | "BRONZE" | "NONE" | string | null;
  bestSessionScore?: number | null;
  estimatedTime?: {
    min?: number | null;
    max?: number | null;
    label?: string | null;
  } | null;
  launchParams?: {
    caseId?: string | null;
    patientSessionSlug?: string | null;
    requiresHpi?: boolean | null;
  } | null;
};

type TodayRotation = RotationUnit;

export type TodayResponse = {
  module0?: Module0Summary | null;
  identity?: TodayIdentity | null;
  recommendedEncounter?: TodayEncounter | null;
  activeRotation?: TodayRotation | null;
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
  roadmapCta?: {
    title?: string | null;
    body?: string | null;
  } | null;
};


export { xpPresentation } from "../learnerStatus";
export function todayFocus(data?: TodayResponse | null) {
  const module = data?.module0;
  const encounter = data?.recommendedEncounter;
  if (module && (!module.completed || module.entryBlocked)) {
    const count = module.activities?.filter(a => a.completed).length;
    const total = module.activities?.length;
    return { kind: "module0", title: module.title || "Clinical Readiness", description: "Build your foundation for confident patient care.",
      progress: total ? `${count} of ${total} activities` : "Clinical Readiness", action: module.storageReady ? "Continue Learning" : "Review Clinical Readiness",
      route: { pathname: "/module-0" } };
  }
  const slug = encounter?.patientSessionSlug || encounter?.launchParams?.patientSessionSlug;
  if (encounter && slug && encounter.status !== "locked") {
    const sessions = data?.activeRotation?.sessions || [];
    const completed = sessions.filter(s => s.status === "completed").length;
    return { kind: "encounter", title: encounter.unitTitle || data?.activeRotation?.title || encounter.displayTitle || encounter.title || "Clinical learning",
      description: encounter.displayTitle || encounter.title || "Continue your clinical learning.",
      progress: sessions.length ? `${completed} of ${sessions.length} encounters` : encounter.status === "completed" ? "Retry to progress" : "Ready to continue",
      action: encounter.status === "completed" ? "Retry Encounter" : "Continue Learning",
      route: { pathname: "/(tabs)/cases", params: { focusSessionSlug: slug } } };
  }
  const locked = encounter?.status === "locked" || data?.activeRotation?.sessions?.some(s => s.status === "locked");
  return { kind: locked ? "locked" : "complete", title: locked ? data?.activeRotation?.title || "Next clinical encounter" : "Learning up to date",
    description: locked ? "Review your Roadmap for the next requirement." : "You've completed all currently available encounters.",
    progress: locked ? "Locked" : "All available encounters complete", action: locked ? "View Requirements" : "Review Your Roadmap", route: { pathname: "/(tabs)/cases" } };
}
