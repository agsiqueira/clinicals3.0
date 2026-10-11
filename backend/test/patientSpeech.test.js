const test = require("node:test");
const assert = require("node:assert/strict");
const { approvePatientSpeech, verifyPatientSpeech, ownedActiveEncounter } = require("../src/utils/patientSpeech");
const { getTtsConfig } = require("../src/llm/navigatorClient");
const context = { clerkUserId: "synthetic_A", conversationId: "encounter_A", caseId: "synthetic_case" };
const settings = { model: "kokoro", voice: "af_heart", speed: 1.1 };
function issue(extra = {}) { return approvePatientSpeech({ ...context, text: "My throat hurts.", settings, now: 1000, ...extra }); }
test("speech approvals bind approved text, learner, encounter, turn and exact speech settings", () => {
  const speech = issue(); const approved = verifyPatientSpeech({ ...context, authorization: speech.authorization, now: 1001 });
  assert.equal(approved.text, "My throat hurts."); assert.deepEqual(approved.settings, settings); assert.equal(approved.turnId, speech.turnId);
  assert.equal(Buffer.from(speech.authorization, "base64url").includes(Buffer.from("My throat hurts.")), false);
});
test("altered, expired, malformed, cross-learner and cross-encounter approvals are rejected", () => {
  const speech = issue();
  for (const extra of [{ clerkUserId: "synthetic_B" }, { conversationId: "encounter_B" }, { caseId: "other" }, { now: 181000 }, { authorization: "invalid" }, { authorization: speech.authorization.slice(0, -8) + "tampered" }]) {
    assert.throws(() => verifyPatientSpeech({ ...context, authorization: speech.authorization, now: 1001, ...extra }), /invalid or expired/);
  }
});
test("internal text cannot receive a patient speech approval", () => {
  assert.throws(() => issue({ text: "My throat hurts. The student asked about a fever." }), /invalid or expired/);
});
test("both patient encounters snapshot the existing backend defaults without voice reassignment", t => {
  const names = ["NAVIGATOR_TTS_MODEL", "NAVIGATOR_TTS_VOICE", "NAVIGATOR_TTS_SPEED"];
  const prior = names.map(name => process.env[name]);
  t.after(() => names.forEach((name, i) => { if (prior[i] === undefined) delete process.env[name]; else process.env[name] = prior[i]; }));
  process.env.NAVIGATOR_TTS_MODEL = "kokoro"; process.env.NAVIGATOR_TTS_VOICE = "af_heart"; process.env.NAVIGATOR_TTS_SPEED = "1.2";
  for (const caseId of ["patient_A", "patient_B"]) {
    const speech = issue({ caseId, settings: undefined });
    const approved = verifyPatientSpeech({ ...context, caseId, authorization: speech.authorization, now: 1001 });
    assert.deepEqual(approved.settings, getTtsConfig());
  }
  assert.deepEqual(getTtsConfig({ voice: "am_adam" }), { model: "kokoro", voice: "am_adam", speed: 1.2 });
});
test("speech requires an owned active encounter", async () => {
  const row = { user: { clerkUserId: context.clerkUserId }, patientCase: { caseId: context.caseId }, status: "IN_PROGRESS" };
  const prisma = { conversation: { findUnique: async () => row } };
  assert.equal(await ownedActiveEncounter(prisma, context.clerkUserId, context.conversationId, context.caseId), row);
  await assert.rejects(ownedActiveEncounter(prisma, "synthetic_B", context.conversationId, context.caseId));
  row.status = "SUBMITTED"; await assert.rejects(ownedActiveEncounter(prisma, context.clerkUserId, context.conversationId, context.caseId));
});
