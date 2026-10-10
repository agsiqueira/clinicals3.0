const { randomUUID } = require("node:crypto");
const defaultCatalog = require("../content/clinicalReadiness.json");
const { evaluateLesson, validateEvaluation } = require("../utils/clinicalReadinessTeaching");
const LEASE_MS = 120000;
const RETRY_DELAY_MS = 5000;
const OPTIONAL_LIMIT = 40; // Per kind, lifetime; bounded JSON and paid requests.
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
function fail(status, code) { const error = new Error(code); error.status = status; error.code = code; throw error; }
function isNonAttempt(response) {
  return /^(?:done|completed|ready|skip|idk|i don['’]?t know|no idea|test|asdf|\.+|n\/a|none|pass)[.!?\s]*$/i.test(response)
    || /^(.)\1{3,}$/u.test(response)
    || /^(?:ignore|disregard)\s+(?:(?:all|previous|the)\s+)?(?:instructions|rules|prompt)\b/i.test(response)
    || /^(?:please\s+)?(?:mark|set|make)\s+(?:this|me|the (?:step|module|activity))\s+(?:as\s+)?(?:complete|completed|ready|passed)[.!?\s]*$/i.test(response);
}
function initialState() { return { schemaVersion: 1, required: {}, interactions: {}, pending: null, activeActivityId: null }; }

function createClinicalReadinessService({ client, catalog = defaultCatalog, evaluate = evaluateLesson, now = () => Date.now() }) {
  const steps = catalog.activities.flatMap(a => a.steps);
  const key = userId => ({ userId_moduleId: { userId, moduleId: catalog.moduleId } });
  function store() {
    if (!client.learnerModuleProgress) fail(503, "MODULE_STORAGE_UNAVAILABLE");
    return client.learnerModuleProgress;
  }
  async function read(userId) {
    if (!userId) fail(401, "AUTHENTICATION_REQUIRED");
    try { return await store().findUnique({ where: key(userId) }); }
    catch (error) { if (["P2021", "P2022"].includes(error.code)) fail(503, "MODULE_STORAGE_UNAVAILABLE"); throw error; }
  }
  function stateOf(row) {
    if (!row) return initialState();
    const state = row.state;
    if (!state || state.schemaVersion !== 1 || !state.required || !state.interactions) fail(409, "MODULE_STATE_REVIEW_REQUIRED");
    if (row.contentVersion !== catalog.version) fail(409, "MODULE_VERSION_REVIEW_REQUIRED");
    return structuredClone(state);
  }
  function complete(state) { return steps.every(step => own(state.required, step.id)); }
  function view(row) {
    const state = stateOf(row);
    const activities = catalog.activities.map(activity => {
      const completedCount = activity.steps.filter(step => own(state.required, step.id)).length;
      const next = activity.steps.find(step => !own(state.required, step.id));
      return {
        id: activity.id, title: activity.title, estimatedMinutesRange: activity.estimatedMinutesRange,
        completedCount, requiredCount: activity.steps.length, completed: !next,
        feedbackLabel: completedCount ? (activity.steps.some(s => state.required[s.id]?.evaluation.label === "Needs More Practice") ? "Needs More Practice" : "Ready") : null,
        nextStepId: next?.id || null,
        steps: activity.steps.map(({ id, teach, question, answerHint, optionalPracticeQuestion }) => ({
          id, teach, question, answerHint, optionalPracticeQuestion, completed: own(state.required, id), saved: state.required[id] || null,
        })),
      };
    });
    const resumeActivity = activities.find(a => a.id === state.activeActivityId && a.nextStepId) || activities.find(a => a.nextStepId);
    return {
      moduleId: catalog.moduleId, contentVersion: catalog.version, title: catalog.title, personaSlug: catalog.personaSlug,
      estimatedMinutesRange: catalog.estimatedMinutesRange, scenario: { ...catalog.sharedScenario },
      revision: row?.revision || 0, startedAt: row?.startedAt || null, completedAt: row?.completedAt || null,
      completed: complete(state), completedCount: steps.filter(s => own(state.required, s.id)).length, requiredCount: steps.length,
      next: resumeActivity ? { activityId: resumeActivity.id, stepId: resumeActivity.nextStepId } : null,
      activities, history: Object.values(state.interactions).filter(r => r.kind !== "required"),
      pending: state.pending ? {
        requestId: state.pending.requestId, activityId: state.pending.activityId, stepId: state.pending.stepId,
        kind: state.pending.kind, response: state.pending.response, status: state.pending.status,
        retryAfter: new Date(state.pending.status === "failed" ? state.pending.retryAfter : state.pending.leaseUntil).toISOString(),
      } : null,
    };
  }
  function validate(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) fail(400, "INVALID_SUBMISSION");
    const allowed = ["activityId", "stepId", "kind", "response", "requestId", "expectedRevision"];
    if (Object.keys(input).some(k => !allowed.includes(k))) fail(400, "UNSUPPORTED_SUBMISSION_FIELDS");
    if (typeof input.requestId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{7,79}$/.test(input.requestId)) fail(400, "INVALID_REQUEST_ID");
    if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) fail(400, "INVALID_REVISION");
    if (!["required", "clarify", "practice"].includes(input.kind)) fail(400, "INVALID_INTERACTION_KIND");
    const activity = catalog.activities.find(a => a.id === input.activityId);
    const step = activity?.steps.find(s => s.id === input.stepId);
    if (!step) fail(400, "INVALID_STEP");
    if (typeof input.response !== "string" || input.response.length > 12000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(input.response)) fail(400, "INVALID_RESPONSE");
    const response = input.response.trim();
    if ((response.match(/\p{L}/gu) || []).length < 4 || isNonAttempt(response)) fail(400, "RESPONSE_ATTEMPT_REQUIRED");
    return { ...input, response, activity, step };
  }
  async function cas(row, state, extra = {}) {
    const result = await store().updateMany({ where: { id: row.id, userId: row.userId, revision: row.revision }, data: { state, revision: { increment: 1 }, ...extra } });
    if (result.count !== 1) fail(409, "PROGRESS_CHANGED");
    return { ...row, ...extra, state, revision: row.revision + 1 };
  }
  function same(request, input) {
    return ["activityId", "stepId", "kind", "response"].every(k => request[k] === input[k]);
  }
  async function submit(userId, input) {
    if (!userId) fail(401, "AUTHENTICATION_REQUIRED");
    const data = validate(input);
    let row = await read(userId);
    if (!row) {
      if (data.expectedRevision !== 0) fail(409, "PROGRESS_CHANGED");
      try { row = await store().create({ data: { userId, moduleId: catalog.moduleId, contentVersion: catalog.version, state: initialState() } }); }
      catch (error) { if (error.code !== "P2002") throw error; row = await read(userId); }
    }
    let state = stateOf(row);
    if (own(state.interactions, data.requestId)) {
      const saved = state.interactions[data.requestId];
      if (!same(saved, data)) fail(409, "REQUEST_ID_REUSED");
      return { status: "saved", result: saved, progress: view(row) };
    }
    if (state.pending) {
      const pending = state.pending;
      if (pending.requestId !== data.requestId || !same(pending, data)) fail(409, "EVALUATION_PENDING");
      if (data.expectedRevision !== pending.expectedRevision && data.expectedRevision !== row.revision) fail(409, "PROGRESS_CHANGED");
      const readyAt = pending.status === "failed" ? pending.retryAfter : pending.leaseUntil;
      if (now() < readyAt) return { status: "pending", progress: view(row) };
    } else {
      if (data.expectedRevision !== row.revision) fail(409, "PROGRESS_CHANGED");
      const next = data.activity.steps.find(step => !own(state.required, step.id));
      if (data.kind === "practice") {
        if (!own(state.required, data.stepId)) fail(409, "PRACTICE_REQUIRES_COMPLETED_STEP");
      } else if (next?.id !== data.stepId && !(data.kind === "clarify" && own(state.required, data.stepId))) fail(409, "STEP_NOT_CURRENT");
      if (data.kind !== "required" && Object.values(state.interactions).filter(r => r.kind === data.kind).length >= OPTIONAL_LIMIT) fail(429, "OPTIONAL_INTERACTION_LIMIT");
    }
    if (data.kind !== "practice") state.activeActivityId = data.activityId;
    const reservation = randomUUID();
    state.pending = { requestId: data.requestId, expectedRevision: data.expectedRevision, activityId: data.activityId, stepId: data.stepId, kind: data.kind, response: data.response, status: "evaluating", reservation, leaseUntil: now() + LEASE_MS };
    row = await cas(row, state); // Durable answer before any paid call.
    let evaluation;
    try { evaluation = validateEvaluation(await evaluate({ catalog, step: data.step, response: data.response, kind: data.kind }), data); }
    catch {
      // Never log or forward upstream exceptions: they may contain learner text.
      const current = await read(userId);
      const currentState = stateOf(current);
      if (currentState.pending?.reservation !== reservation) return { status: "superseded", progress: view(current) };
      currentState.pending.status = "failed";
      currentState.pending.retryAfter = now() + RETRY_DELAY_MS;
      try { row = await cas(current, currentState); }
      catch (error) { if (error.code !== "PROGRESS_CHANGED") throw error; row = await read(userId); }
      return { status: "pending", progress: view(row) };
    }
    const current = await read(userId);
    state = stateOf(current);
    if (state.pending?.reservation !== reservation) return { status: "superseded", progress: view(current) };
    const result = { requestId: data.requestId, activityId: data.activityId, stepId: data.stepId, kind: data.kind, response: data.response, evaluation, completedAt: new Date(now()).toISOString() };
    state.interactions[data.requestId] = result;
    if (data.kind === "required") state.required[data.stepId] = result;
    state.pending = null;
    try { row = await cas(current, state, complete(state) && !current.completedAt ? { completedAt: new Date(now()) } : {}); }
    catch (error) { if (error.code !== "PROGRESS_CHANGED") throw error; return { status: "superseded", progress: view(await read(userId)) }; }
    return { status: "saved", result, progress: view(row) };
  }
  return { getProgress: async userId => view(await read(userId)), submit };
}

module.exports = { createClinicalReadinessService };
