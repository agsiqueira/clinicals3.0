const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("../../mobile/node_modules/typescript");

// Execute the real API client and session bridge, without live credentials.
function clientHarness(fetcher, base = "http://module0.example.test") {
  const timers = new Map(); const durations = []; let sequence = 0;
  function compile(file, requireFn) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../../mobile", file), "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    vm.runInNewContext(code, {
      exports, require: requireFn, process: { env: { EXPO_PUBLIC_API_BASE_URL: base } },
      AbortController, Headers, fetch: (...args) => fetcher(...args),
      setTimeout: (fn, ms) => { const id = ++sequence; timers.set(id, fn); durations.push(ms); return id; },
      clearTimeout: id => timers.delete(id),
    });
    return exports;
  }
  const session = compile("src/api/sessionToken.js", () => ({ selectDraftLearner() {} }));
  const { api } = compile("src/api/client.js", () => session);
  return { api, session, timers, durations, expireRequest: () => [...timers.values()].at(-1)() };
}
const payload = {
  activityId: "starting-encounter", stepId: "opening-question", kind: "required",
  response: "What brings you to the clinic today?", requestId: "synthetic-submit", expectedRevision: 0,
};

test("Module 0 uses its 45-second override, other APIs retain their existing timeouts and authenticated transport", async () => {
  const calls = [];
  const h = clientHarness(async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.headers.get("authorization"), "Bearer synthetic-token");
    assert.equal(options.headers.get("x-clerk-user-id"), null);
    return new Response('{}');
  });
  h.session.bindSession("A", "session_A", async () => "synthetic-token");
  await h.api.submitModule0Interaction(payload, { expectedUserId: "A", "x-clerk-user-id": "B" });
  assert.equal(calls[0].url, "http://module0.example.test/api/modules/clinical-readiness/interactions");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), payload);
  await h.api.getModule0Progress({ expectedUserId: "A" });
  await h.api.speakVoice({ text: "Synthetic teaching", voice: "am_adam" }, { expectedUserId: "A" });
  await h.api.speakPatientVoice({ authorization: "synthetic-approval" }, { expectedUserId: "A" });
  assert.deepEqual(h.durations, [45000, 10000, 90000, 90000]);
  assert.equal(h.timers.size, 0);
});

test("Module 0 timeout is distinguishable from navigation cancellation and never retries the POST automatically", async () => {
  let calls = 0;
  const h = clientHarness(async (_url, options) => {
    calls++;
    return new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
  });
  h.session.bindSession("A", "session_A", async () => "synthetic-token");
  const timed = h.api.submitModule0Interaction(payload, { expectedUserId: "A" });
  const timedCheck = assert.rejects(timed, { code: "REQUEST_TIMEOUT" });
  await new Promise(resolve => setImmediate(resolve));h.expireRequest();await timedCheck;
  const controller = new AbortController();
  const cancelled = h.api.submitModule0Interaction(payload, { expectedUserId: "A" }, controller.signal);
  const cancelledCheck = assert.rejects(cancelled, { name: "AbortError" });
  await new Promise(resolve => setImmediate(resolve));controller.abort();await cancelledCheck;
  assert.equal(calls, 2);assert.equal(h.timers.size, 0);
});

test("submission timeout stays active through a delayed response body", async () => {
  let reading;
  const h = clientHarness(async (_url, options) => ({ ok: true, status: 200,
    text: () => new Promise((_resolve, reject) => { reading = true;options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))); }),
    json() {}, arrayBuffer() {}, blob() {},
  }));
  h.session.bindSession("A", "session_A", async () => "synthetic-token");
  const request = h.api.submitModule0Interaction(payload, { expectedUserId: "A" });
  const check = assert.rejects(request, { code: "REQUEST_TIMEOUT" });
  await new Promise(resolve => setImmediate(resolve));assert.equal(reading, true);
  assert.equal(h.timers.size, 1);h.expireRequest();await check;assert.equal(h.timers.size, 0);
});

test("Module 0 refreshes an expired token once, keeps the same request ID and fails visibly for a missing session", async () => {
  let calls = 0;const tokens = [];
  const h = clientHarness(async () => new Response('{}', { status: ++calls === 1 ? 401 : 200 }));
  h.session.bindSession("A", "session_A", async options => { tokens.push(options);return "synthetic-token"; });
  await h.api.submitModule0Interaction(payload, { expectedUserId: "A" });
  assert.equal(calls, 2);assert.equal(tokens[1].skipCache, true);
  h.session.bindSession(null, null, null);
  await assert.rejects(h.api.submitModule0Interaction(payload, { expectedUserId: "A" }), { status: 401 });
  assert.equal(calls, 2);assert.equal(h.timers.size, 0);
});

test("account switching aborts Module 0 transport and rejects a delayed previous-account response", async () => {
  let release, signal;
  const h = clientHarness(async (_url, options) => { signal = options.signal;return new Promise(resolve => { release = resolve; }); });
  h.session.bindSession("A", "session_A", async () => "synthetic-A-token");
  const request = h.api.submitModule0Interaction(payload, { expectedUserId: "A" });
  const check = assert.rejects(request, { status: 401 });
  await new Promise(resolve => setImmediate(resolve));
  h.session.bindSession("B", "session_B", async () => "synthetic-B-token");
  assert.equal(signal.aborted, true);release(new Response('{}'));await check;
});

test("real frontend client POST reaches Clerk-verified lesson route, persists feedback and isolates learners", async t => {
  const express = require("express");
  const { token, options } = require("./helpers/clerkSession");
  const { createStudentAuth } = require("../src/middleware/studentAuth");
  const { createClinicalReadinessService } = require("../src/services/clinicalReadiness");
  const { createClinicalReadinessRouter } = require("../src/routes/clinicalReadiness");
  const catalog = require("../src/content/clinicalReadiness.json");
  const rows = new Map();let evaluations = 0;
  const service = createClinicalReadinessService({ client: { learnerModuleProgress: {
    findUnique: async ({ where }) => structuredClone(rows.get(where.userId_moduleId.userId) || null),
    create: async ({ data }) => { const row = { id: data.userId, revision: 0, startedAt: new Date(), completedAt: null, ...structuredClone(data) };rows.set(data.userId, row);return structuredClone(row); },
    updateMany: async ({ where, data }) => { const row = rows.get(where.userId);if (!row || row.revision !== where.revision) return { count: 0 };Object.assign(row, structuredClone(data), { revision: row.revision + 1 });return { count: 1 }; },
  } }, evaluate: async ({ response }) => {
    evaluations++;assert.equal(rows.get("user_A").state.pending.response, response);
    return { label: "Needs More Practice", feedback: "Connect your question to the patient's concern.", evidence: [response.slice(0,20)] };
  } });
  const app = express();app.use(express.json());app.use(createStudentAuth(options));
  app.use("/api/modules/clinical-readiness", createClinicalReadinessRouter({ service, resolveUser: async req => ({ id: req.studentIdentity.clerkUserId }) }));
  const server = app.listen(0, "127.0.0.1");await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const h = clientHarness(fetch, `http://127.0.0.1:${server.address().port}`);
  h.session.bindSession("user_A", "session_A", async () => token("user_A"));
  const submission = { ...payload, activityId: catalog.activities[0].id, stepId: catalog.activities[0].steps[0].id };
  const result = await h.api.submitModule0Interaction(submission, { expectedUserId: "user_A" });
  assert.equal(result.status, "saved");assert.equal(result.result.evaluation.label, "Needs More Practice");
  assert.equal(result.progress.completedCount, 1);assert.equal(result.progress.next.stepId, catalog.activities[0].steps[1].id);
  await h.api.submitModule0Interaction(submission, { expectedUserId: "user_A" });assert.equal(evaluations, 1);
  h.session.bindSession("user_B", "session_B", async () => token("user_B"));
  const other = await h.api.getModule0Progress({ expectedUserId: "user_B" });assert.equal(other.completedCount, 0);
  assert.equal(rows.has("user_B"), false);
  assert.equal(other.activities[0].steps[0].saved, null);
});
