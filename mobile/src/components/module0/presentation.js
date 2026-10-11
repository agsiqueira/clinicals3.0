// These are presentation choices, not a grading key or a completion record.
export const provisionalOpeningChoices = [
  "What brings you in today?",
  "Is your chest hurting?",
  "Do you feel short of breath?",
];
export function hasApprovedChoices(activity, step, kind = "required") {
  return activity?.id === "starting-the-encounter" && step?.id === "open-the-interview" && kind === "required" && !step.completed;
}
export function initialPresentation(progress, requestedActivity) {
  if (!progress || progress.pending) return null;
  // Explicit activity links remain reviewable; the module landing uses server state.
  if (!requestedActivity && progress.completed) return "module-complete";
  if (!requestedActivity && progress.completedCount > 0) return "resume";
  const requested = progress.activities?.find(a=>a.id === requestedActivity);
  if(requested && !requested.completed && requestedActivity !== "starting-the-encounter") return "introduction";
  if (progress.completedCount > 0 || progress.completed) return null;
  if (requestedActivity && requestedActivity !== "starting-the-encounter") return null;
  return requestedActivity ? "introduction" : "welcome";
}
export function exerciseTitle(step, activity) {
  return exerciseTitles[step?.id] || "Exercise";
}
// Display metadata keyed by the curriculum IDs; no assessment criteria are shipped here.
export const exerciseTitles = {
 "open-the-interview":"Open the Interview", "organize-old-carts":"Organize OLD CARTS",
 "soap-and-data-types":"SOAP and Data Types", "history-and-context":"History and Context",
 "review-of-systems":"Review of Systems", "focused-examination":"Focused Examination",
 "evidence-and-differential":"Evidence and Differential Diagnosis", "sbar":"SBAR", "snapps":"SNAPPS"
};
/** @type {Record<string,string>} */
export const activityIntroductions = {
 "starting-the-encounter":"You'll practice how to open a patient interview and organize symptoms.",
 "organizing-clinical-information":"Organize clinical information using SOAP, explore the patient's history and context, and use the review of systems to uncover patient-reported symptoms.",
 "clinical-reasoning":"Use the history to guide a focused examination, then connect the evidence to a working possibility and alternatives.",
 "presenting-to-the-preceptor":"Organize a clear preceptor presentation using SBAR and SNAPPS, connecting the case facts with your reasoning and learning questions."
};
export function afterFeedback(progress, activityId) {
  const activity = progress.activities.find(a => a.id === activityId);
  return activity?.completed ? "activity-complete" : null;
}
export function isSubmissionResult(result, submission) {
  return !!result && !!submission && result.requestId === submission.requestId
    && result.activityId === submission.activityId && result.stepId === submission.stepId
    && result.kind === submission.kind;
}

export function lessonPosition(progress, activity, step) {
 const activities=progress?.activities || (activity ? [activity] : []);
 const activityIndex=activities.findIndex(a=>a.id===activity?.id);
 const steps=activities.flatMap(a=>a.steps);
 const stepIndex=steps.findIndex(s=>s.id===step?.id);
 return {activityNumber:activityIndex+1,activityTotal:activities.length,exerciseNumber:stepIndex+1,exerciseTotal:progress?.requiredCount ?? steps.length,completedCount:progress?.completedCount ?? 0};
}
