// In-memory only: no transcripts or tokens are written to browser storage.
// Drafts survive reauthentication in this app instance, and clear on account change.
const drafts = new Map();
let learner = null;
export function selectDraftLearner(userId) {
  if (userId && learner && learner !== userId) drafts.clear();
  if (userId) learner = userId;
}
export function readEncounterDraft(key) { return drafts.get(key) || null; }
export function saveEncounterDraft(key, value) { drafts.set(key, value); }
