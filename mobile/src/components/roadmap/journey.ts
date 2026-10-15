/** Presentation only: backend statuses remain the sole source of availability. */
export type JourneySession = {
  id: string; slug: string; title: string; objective?: string | null;
  description?: string | null; status: "locked" | "available" | "completed";
  entryBlocked?: boolean; badgeTier?: "GOLD" | "SILVER" | "BRONZE" | "NONE" | null;
  bestSessionScore?: number | null; latestSessionScore?: number | null;
  requiresHpi?: boolean; workflow?: { requiresHpi?: boolean };
};
export type JourneyUnit<S extends JourneySession = JourneySession> = {
  id: string; slug: string; title: string; objective?: string | null; sessions: S[];
};
export type JourneyPath<S extends JourneySession = JourneySession> = {
  id: string; title: string; description?: string | null; units: JourneyUnit<S>[];
};
export function isRotationMastered(unit: JourneyUnit) {
  return unit.sessions.length > 0 && unit.sessions.every(s =>
    s.status === "completed" && typeof s.bestSessionScore === "number" && s.bestSessionScore >= 84);
}
export function buildJourney<S extends JourneySession>(paths: JourneyPath<S>[], recommendedSlug?: string | null) {
  let rotationNumber = 0;
  // Match Today: available encounter first, otherwise a completed encounter needing retry.
  const all = paths.flatMap(p => p.units.flatMap(u => u.sessions));
  const current = all.find(s => s.slug === recommendedSlug && s.status !== "locked" && !s.entryBlocked)
    ?? all.find(s => s.status === "available" && !s.entryBlocked)
    ?? (all.some(s => s.status === "locked")
      ? [...all].reverse().find(s => s.status === "completed" && !s.entryBlocked &&
          typeof s.bestSessionScore === "number" && s.bestSessionScore < 84)
      : undefined);
  return paths.map(path => ({ ...path, rotations: path.units.map(unit => {
    const masteredCount = unit.sessions.filter(s => s.status === "completed" &&
      typeof s.bestSessionScore === "number" && s.bestSessionScore >= 84).length;
    return {
      ...unit, rotationNumber: ++rotationNumber, mastered: isRotationMastered(unit), masteredCount,
      locked: unit.sessions.length > 0 && unit.sessions.every(s => s.status === "locked" || s.entryBlocked),
      encounters: unit.sessions.map((session, index) => {
        const disabled = session.status === "locked" || !!session.entryBlocked;
        const score = session.bestSessionScore ?? session.latestSessionScore ?? null;
        const task = `${session.title} ${session.objective ?? ""}`;
        const reasoning = /reasoning|differential/i.test(task);
        const presentation = /preceptor|handoff|sbar|snapps|present(?:ation|ing)\b/i.test(task);
        const requiresHpi = session.workflow?.requiresHpi ?? session.requiresHpi;
        // Match the actual task, never assume the third/fourth encounter is a mockup lesson.
        // Reasoning/presentation source artwork embeds a lock, so use it only while disabled.
        const artwork: "reasoning" | "presentation" | "encounter" | "introduction" = disabled && reasoning ? "reasoning" : disabled && presentation ? "presentation"
          : requiresHpi === true || reasoning || presentation ? "encounter"
          : requiresHpi === false || index % 2 === 0 ? "introduction" : "encounter";
        return {
          session, number: index + 1, disabled, current: session === current, artwork,
          medal: session.badgeTier === "GOLD" || session.badgeTier === "SILVER" || session.badgeTier === "BRONZE"
            ? session.badgeTier : null,
          score: typeof score === "number" && Number.isFinite(score) ? score : null,
          action: disabled ? null : session.status === "completed"
            ? (session === current ? "Retry" : "Practice Again") : "Continue",
          prerequisite: session.entryBlocked ? "Complete Module 0 to enter this encounter."
            : session.status === "locked" ? "Reach 84% on the preceding encounter to unlock." : null,
        };
      }),
    };
  }) }));
}

/** Existing history is case-wide, never session-filtered. */
export function previousAttemptsRoute(overview?: { linkedCase?: { caseId?: string | null } | null } | null) {
  const caseId = overview?.linkedCase?.caseId;
  return caseId ? { pathname: "/attempts" as const, params: { caseId } } : null;
}
