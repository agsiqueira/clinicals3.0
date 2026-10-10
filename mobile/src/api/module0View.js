// No learner data is stored globally or locally. Guards invalidate delayed UI work
// synchronously when the learner, navigation focus, activity or step changes.
export function createModule0Boundary() {
  let scope = null;
  let generation = 0;
  let active = false;
  return {
    enter(nextScope, enabled = true) {
      if (scope !== nextScope || active !== enabled) generation++;
      scope = nextScope; active = enabled;
    },
    capture() { const expected = generation; return () => active && generation === expected; },
    invalidate() { active = false; generation++; },
  };
}
export function module0Selection(progress, requestedActivityId, requestedStepId) {
  const pending = progress?.pending;
  const activity = progress?.activities?.find(a => a.id === requestedActivityId)
    || progress?.activities?.find(a => a.id === (pending?.activityId || progress.next?.activityId))
    || progress?.activities?.[0];
  const step = activity?.steps?.find(s => s.id === requestedStepId)
    || activity?.steps?.find(s => s.id === (pending?.activityId === activity.id ? pending.stepId : activity.nextStepId))
    || activity?.steps?.[0];
  return { activity, step };
}
export function module0Action(summary) {
  if (!summary?.storageReady) return "View Module 0";
  if (summary.completed) return "Review Module 0";
  return summary.completedCount ? "Continue Module 0" : "Start Module 0";
}
export function newLessonRequestId() {
  // Identity never comes from this ID. Server validates IDs and revisions.
  return `lesson-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
