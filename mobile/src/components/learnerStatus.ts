export type LearnerIdentity = {
  professionalLevel?: number | null;
  xp?: number | null;
  nextLevelXp?: number | null;
  streak?: { currentCount?: number | null } | null;
};
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
export function xpPresentation(identity?: LearnerIdentity | null) {
  const xp = finite(identity?.xp) ? identity.xp : null;
  const threshold = finite(identity?.nextLevelXp) && identity.nextLevelXp > 0 ? identity.nextLevelXp : null;
  return {
    level: finite(identity?.professionalLevel) ? identity.professionalLevel : null,
    label: xp === null ? "XP unavailable" : threshold === null ? `${xp} XP` : `${xp} / ${threshold} XP`,
    ratio: xp !== null && threshold !== null ? Math.min(1, xp / threshold) : null,
  };
}
export function learnerStatus(identity?: LearnerIdentity | null, rotationTitle?: string | null) {
  const count = identity?.streak?.currentCount;
  return {
    ...xpPresentation(identity),
    rotation: rotationTitle?.trim() || "No active rotation",
    streak: finite(count) ? `${count} ${count === 1 ? "day" : "days"}` : "Streak unavailable",
  };
}
