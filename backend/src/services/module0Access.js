const { createClinicalReadinessService } = require("./clinicalReadiness");
const catalog = require("../content/clinicalReadiness.json");

// Server-only rollout setting. Preview preserves current clinical access;
// enforcement must be enabled explicitly after database/E2E approval.
function enforcementActive() {
  const mode = process.env.MODULE0_PREREQUISITE_MODE || "preview";
  if (!["preview", "enforced"].includes(mode)) {
    const error = new Error("Invalid Module 0 prerequisite configuration"); error.status = 503; error.code = "MODULE0_CONFIGURATION_INVALID"; throw error;
  }
  return mode === "enforced";
}
async function getModule0Summary({ userId, client }) {
  const active = enforcementActive();
  try {
    const progress = await createClinicalReadinessService({ client }).getProgress(userId);
    return {
      moduleId: progress.moduleId, title: progress.title, estimatedMinutesRange: progress.estimatedMinutesRange,
      storageReady: true, enforcementActive: active, entryBlocked: active && !progress.completed,
      completed: progress.completed, completedCount: progress.completedCount, requiredCount: progress.requiredCount,
      next: progress.next,
      activities: progress.activities.map(({ id, title, completed, completedCount, requiredCount, estimatedMinutesRange }) => ({ id, title, completed, completedCount, requiredCount, estimatedMinutesRange })),
    };
  } catch (error) {
    if (error.code !== "MODULE_STORAGE_UNAVAILABLE") throw error;
    // Only known absent storage permits a preview card; never fail open in enforced mode.
    return {
      moduleId: catalog.moduleId, title: catalog.title, estimatedMinutesRange: catalog.estimatedMinutesRange,
      storageReady: false, enforcementActive: active, entryBlocked: active, completed: false,
      completedCount: null, requiredCount: 9, next: null,
      activities: catalog.activities.map(a => ({ id: a.id, title: a.title, estimatedMinutesRange: a.estimatedMinutesRange, completed: false, completedCount: null, requiredCount: a.steps.length })),
    };
  }
}
async function requireModule0(req, client) {
  if (!enforcementActive()) return; // Inactive: no additional DB calls or identity changes.
  const { resolveAuthenticatedUser } = require("../utils/userResolver");
  const user = await resolveAuthenticatedUser(req);
  const progress = await createClinicalReadinessService({ client }).getProgress(user.id);
  if (!progress.completed) {
    const error = new Error("Complete Module 0 before starting clinical training");
    error.status = 403; error.code = "MODULE0_REQUIRED"; throw error;
  }
}
function applyModule0ToRoadmap(roadmap, summary) {
  if (!summary.entryBlocked) return roadmap;
  // Keep scores and historical completion; block launching/retrying all clinical sessions.
  return roadmap.map(path => ({ ...path, units: path.units.map(unit => ({ ...unit,
    sessions: unit.sessions.map(session => ({ ...session, entryBlocked: true, prerequisite: "clinical-readiness" })),
  })) }));
}
module.exports = { enforcementActive, getModule0Summary, requireModule0, applyModule0ToRoadmap };
