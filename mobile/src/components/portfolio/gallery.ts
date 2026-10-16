export type PortfolioMilestone = {
  slug: string; title: string; description?: string | null; category: string; icon?: string | null;
  status: "LOCKED" | "IN_PROGRESS" | "EARNED" | string; currentValue?: number | null; targetValue?: number | null; earnedAt?: string | null;
};
export type RecentPatient = {
  sessionAttemptId: string; patientSessionTitle?: string | null; caseTitle?: string | null; caseId?: string | null;
  sessionScore?: number | null; badgeTier?: string | null; passed?: boolean | null; scoredAt?: string | null;
};
export type StoryIdentity = {professionalLevel?:number|null; levelTitle?:string|null; xp?:number|null};
export type StoryPath = {pathTitle?:string|null; completedSessions?:number|null; totalSessions?:number|null};
/** Formatting only. Never derive an earned state or a learner level from a score. */
export function finiteValue(value:unknown):number|null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
export function achievementState(status?:string|null) {
  const earned = status === "EARNED", progressing = status === "IN_PROGRESS";
  return {earned,locked:!earned&&!progressing,label:earned?"Earned":progressing?"In progress":"Locked"};
}
const medals = {
  GOLD:require("../../../assets/roadmap/medal-gold.svg"),
  SILVER:require("../../../assets/roadmap/medal-silver.svg"),
  BRONZE:require("../../../assets/roadmap/medal-bronze.svg"),
};
export function encounterMetadata(patient:RecentPatient) {
  const title = patient.patientSessionTitle?.trim() || patient.caseTitle?.trim() || "Patient encounter";
  const [name,...rest] = title.split(":");
  const tier = patient.badgeTier;
  const badge = tier === "GOLD" ? "Gold" : tier === "SILVER" ? "Silver" : tier === "BRONZE" ? "Bronze" : tier === "NONE" ? "No badge" : "Badge unavailable";
  const score = finiteValue(patient.sessionScore);
  const date = patient.scoredAt && Number.isFinite(Date.parse(patient.scoredAt)) ? new Date(patient.scoredAt).toLocaleDateString(undefined,{month:"short",day:"numeric"}) : null;
  return {name:name.trim()||"Patient encounter",task:rest.join(":").trim(),medal:tier === "GOLD" || tier === "SILVER" || tier === "BRONZE" ? medals[tier] : null,
    result:[badge,score !== null && score <= 100 ? `${score}%` : "Score unavailable",date].filter(Boolean).join(" · ")};
}
