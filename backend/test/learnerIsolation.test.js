const test = require("node:test");
const assert = require("node:assert/strict");
const { options, token } = require("./helpers/clerkSession");
const users = [{ id: "neon_A", clerkUserId: "user_A" }, { id: "neon_B", clerkUserId: "user_B" }];
const conversations = users.map((user, i) => ({
  id: `conv_${i}`, userId: user.id, caseId: "case-db", status: "IN_PROGRESS",
  patientCase: { caseId: "uti_level1", level: 1 }, user,
  messages: [{ role: "USER", content: `Private transcript ${i}` }],
  submission: null, sessionAttempt: null,
}));
const calls = [];
const fixture = new Proxy({}, { get(_target, model) {
  if (model === "$transaction") return async operations => Promise.all(operations);
  return new Proxy({}, { get(_delegate, operation) { return async args => {
    calls.push({ model, operation, args });
    const where = args?.where || {};
    if (model === "user" && operation === "findUnique") return users.find(u => u.clerkUserId === where.clerkUserId || u.id === where.id) || null;
    if (model === "conversation" && ["findFirst", "findUnique"].includes(operation)) return conversations.find(c => c.id === where.id && (!where.userId || c.userId === where.userId)) || null;
    if (model === "conversation" && operation === "create") {
      const row = { id: "created-conversation", ...args.data, status: "IN_PROGRESS", patientCase: { caseId: "uti_level1", level: 1 }, user: users.find(user => user.id === args.data.userId), messages: [], submission: null };
      conversations.push(row); return row;
    }
    if (["achievementResult", "badgeAward", "sessionFeedback"].includes(model) && operation === "upsert") return args.create;
    if (model === "sessionAttempt" && operation === "update") return { id: where.id, userId: "neon_B", ...args.data };
    if (model === "conversation" && operation === "findMany") return conversations.filter(c => c.userId === where.userId && (!where.caseId || c.caseId === where.caseId) && c.submission);
    if (model === "submission" && operation === "create") {
      const submission = { id: "synthetic-submission", ...args.data };
      conversations.find(c => c.id === submission.conversationId).submission = submission;
      return submission;
    }
    if (model === "patientSession" && operation === "findFirst" && where.slug === "example") return { id: "session-example", slug: "example", title: "Synthetic session", achievements: [], unit: { learningPath: { preceptorPersona: { name: "Dr. Martinez" } } } };
    if (model === "sessionAttempt" && operation === "findUnique" && where.id) return { id: where.id, userId: "neon_B", conversationId: "conv_1", patientSessionId: "synthetic-session", patientSession: { title: "Synthetic session", goldThreshold: 84, achievements: [{ id: "synthetic-achievement", slug: "formal-introduction", title: "Introduction", weightPercent: 100, rubricCriterionIds: ["professional_intro_name"], requiredForCompletion: true }] } };
    if (model === "case" && operation === "upsert") return { id: "case-db", ...args.create };
    if (model === "conversation" && operation === "update") return conversations.find(c => c.id === where.id);
    if (model === "message" && operation === "create") return { id: "synthetic-message", ...args.data };
    if (model === "case" && operation === "findUnique") return { id: "case-db", caseId: "uti_level1" };
    if (operation === "findMany") return [];
    if (operation === "findUnique" || operation === "findFirst") return null;
    if (model === "userProgress" && operation === "upsert") return args.create;
    throw new Error(`Unexpected synthetic operation ${String(model)}.${String(operation)}`);
  }; } });
} });
// Inject only the data store, preserving production routes, services and real Clerk verification.
require.cache[require.resolve("../src/db/prisma")] = { exports: fixture };
process.env.GRADING_LLM_DISABLED = "true";
// Synthetic AI fixtures: paid operations never call a vendor or expose credentials.
require.cache[require.resolve("../src/llm/navigatorClient")] = { exports: {
  getTtsConfig: () => ({ model: "kokoro", voice: "af_heart", speed: 1 }),
  createPatientReply: async () => "I have burning when I urinate.",
  createSpeechAudio: async () => ({ audioBase64: "c3ludGhldGlj", mimeType: "audio/mpeg" }),
  transcribeAudio: async () => ({ text: "Synthetic transcription", language: "en" }),
} };
const { createApp } = require("../src/app");
const names = ["cases", "chat", "grade", "conversations", "voice", "progress", "learningPaths", "clinicalPortfolio", "today", "profile"];
async function start(t) {
  const routers = Object.fromEntries(names.map(name => [`${name}Router`, require(`../src/routes/${name}`)]));
  const server = createApp(routers, options).listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/api`;
}
function headers(userId = "user_A") { return { Authorization: `Bearer ${token(userId)}`, "Content-Type": "application/json", "x-clerk-user-id": "user_B", "x-user-email": "attacker@example.test" }; }
const protectedRoutes = [
  ["GET", "/cases/uti_level1"], ["POST", "/chat"], ["POST", "/grade"],
  ["POST", "/voice/speak"], ["POST", "/voice/transcribe"], ["POST", "/conversations"],
  ["GET", "/conversations/by-case/uti_level1"], ["GET", "/conversations/conv_0"],
  ["POST", "/conversations/conv_0/messages"], ["POST", "/conversations/conv_0/submit"],
  ["POST", "/conversations/conv_0/debrief-chat"], ["GET", "/progress"],
  ["GET", "/today"], ["GET", "/clinical-portfolio"], ["GET", "/profile/competencies"],
  ["GET", "/learning-paths"], ["GET", "/learning-paths/patient-sessions/example"],
  ["POST", "/learning-paths/patient-sessions/example/preceptor-chat"],
];
test("all personal and paid routes reject anonymous/header impersonation and expired tokens before data access", async t => {
  const base = await start(t); calls.length = 0;
  for (const [method, path] of protectedRoutes) {
    for (const authorization of [null, `Bearer ${token("user_A", { exp: 1 })}`, "Bearer forged"]) {
      const response = await fetch(base + path, { method, headers: { "x-clerk-user-id": "user_A", ...(authorization ? { Authorization: authorization } : {}) } });
      assert.equal(response.status, 401, `${method} ${path}`);
    }
  }
  assert.equal(calls.length, 0);
});
test("two synthetic learners can read and append only their own conversations/transcripts", async t => {
  const base = await start(t);
  for (let i = 0; i < 2; i++) {
    const auth = headers(users[i].clerkUserId);
    const own = await fetch(`${base}/conversations/conv_${i}`, { headers: auth });
    assert.equal(own.status, 200);
    assert.equal((await own.json()).messages[0].content, `Private transcript ${i}`);
    const write = await fetch(`${base}/conversations/conv_${i}/messages`, { method: "POST", headers: auth, body: JSON.stringify({ role: "user", content: "Synthetic new message", userId: users[1-i].id }) });
    assert.equal(write.status, 200);
    for (const [method, suffix, body] of [["GET", "", null], ["POST", "/messages", { role: "user", content: "attack" }], ["POST", "/submit", { hpi: "attack" }], ["POST", "/debrief-chat", { message: "attack" }]]) {
      const response = await fetch(`${base}/conversations/conv_${1-i}${suffix}`, { method, headers: auth, ...(body ? { body: JSON.stringify(body) } : {}) });
      assert.equal(response.status, 404, `${method} ${suffix}`);
    }
    const chat = await fetch(`${base}/chat`, { method: "POST", headers: auth, body: JSON.stringify({ caseId: "uti_level1", conversationId: `conv_${1-i}`, messages: [] }) });
    assert.equal(chat.status, 404, "Even empty chat openers verify ownership");
  }
});
test("authorized learner dashboards, portfolio, competencies and case metadata remain available", async t => {
  const base = await start(t); calls.length = 0;
  for (const path of ["/progress", "/today", "/clinical-portfolio", "/profile/competencies", "/learning-paths", "/conversations/by-case/uti_level1", "/cases/uti_level1"]) {
    const response = await fetch(base + path, { headers: headers() });
    assert.equal(response.status, 200, path);
  }
  for (const call of calls) {
    if (["conversation", "sessionAttempt"].includes(call.model) && call.operation === "findMany") assert.equal(call.args.where.userId, "neon_A");
    if (call.model === "achievementResult") assert.equal(call.args.where.sessionAttempt.userId, "neon_A");
  }
});

test("authorized paid AI workflows retain chat, coaching, grading, transcription and playback contracts", async t => {
  const base = await start(t);
  const workflows = [
    ["/chat", { caseId: "uti_level1", conversationId: "conv_0", messages: [{ role: "user", content: "What brings you in today?" }] }, "reply"],
    ["/learning-paths/patient-sessions/example/preceptor-chat", { message: "How should I practice?", messages: [] }, "reply"],
    ["/voice/speak", { text: "Synthetic patient response" }, "audio_base64"],
    ["/voice/transcribe", { audio_base64: "c3ludGhldGlj", mime_type: "audio/wav" }, "text"],
    ["/grade", { caseId: "uti_level1", conversation: [{ role: "user", content: "What brings you in today?" }], hpi: "Synthetic HPI" }, "score"],
  ];
  for (const [path, body, field] of workflows) {
    const response = await fetch(base + path, { method: "POST", headers: headers(), body: JSON.stringify(body) });
    assert.equal(response.status, 200, path);
    assert.ok(field in await response.json(), path);
  }
});

test("submission persists grades for each owner and cross-user grade retrieval remains denied", async t => {
  const base = await start(t);
  for (let i = 0; i < 2; i++) {
    const response = await fetch(`${base}/conversations/conv_${i}/submit`, { method: "POST", headers: headers(users[i].clerkUserId), body: JSON.stringify({ hpi: `Synthetic HPI learner ${i}`, userId: users[1-i].id }) });
    assert.equal(response.status, 200);
    assert.equal(typeof (await response.json()).score, "number");
    assert.equal(conversations[i].submission.details.hpi, `Synthetic HPI learner ${i}`);
    const own = await fetch(`${base}/conversations/conv_${i}`, { headers: headers(users[i].clerkUserId) });
    assert.equal(own.status, 200);
    assert.equal((await own.json()).submission.details.hpi, `Synthetic HPI learner ${i}`);
    const other = await fetch(`${base}/conversations/conv_${i}`, { headers: headers(users[1-i].clerkUserId) });
    assert.equal(other.status, 404);
  }
});
test("attempt debriefs, achievement finalization and evidence reject mismatched owners before writes", async () => {
  const { getSessionDebriefForAttempt, finalizeSessionAttemptFromSubmission } = require("../src/services/sessionAttempts");
  calls.length = 0;
  await assert.rejects(getSessionDebriefForAttempt("attempt_B", "neon_A"), { status: 404 });
  await assert.rejects(finalizeSessionAttemptFromSubmission({ sessionAttemptId: "attempt_B", userId: "neon_A", submission: { conversationId: "conv_0", sessionAttemptId: "attempt_B" } }), { status: 404 });
  await assert.rejects(finalizeSessionAttemptFromSubmission({ sessionAttemptId: "attempt_B", userId: "neon_B", submission: { conversationId: "conv_0", sessionAttemptId: "attempt_B" } }), { status: 404 });
  assert.ok(calls.every(call => call.operation === "findUnique"));
});

test("conversation creation uses the verified learner despite body/header impersonation", async t => {
  const base = await start(t);
  const response = await fetch(`${base}/conversations`, { method: "POST", headers: headers(), body: JSON.stringify({ caseId: "uti_level1", userId: "neon_B", clerkUserId: "user_B" }) });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(conversations.find(row => row.id === data.conversationId).userId, "neon_A");
});
test("owned attempt finalization still writes achievement, badge and feedback evidence for its verified owner", async () => {
  const { finalizeSessionAttemptFromSubmission } = require("../src/services/sessionAttempts");
  calls.length = 0;
  const result = await finalizeSessionAttemptFromSubmission({ sessionAttemptId: "attempt_B", userId: "neon_B", submission: { id: "submission_B", conversationId: "conv_1", sessionAttemptId: "attempt_B", details: { criteria_results: [{ id: "professional_intro_name", status: "met", points: 3, earned_points: 3, evidence: ["Synthetic introduction"] }] } } });
  assert.equal(result.sessionAttemptId, "attempt_B");
  assert.equal(result.achievementResults.length, 1);
  assert.ok(calls.some(call => call.model === "achievementResult" && call.operation === "upsert"));
  const badge = calls.find(call => call.model === "badgeAward" && call.operation === "upsert");
  assert.equal(badge.args.create.userId, "neon_B");
  assert.equal(badge.args.create.sessionAttemptId, "attempt_B");
  assert.ok(calls.some(call => call.model === "sessionFeedback" && call.operation === "upsert"));
});
