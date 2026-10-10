const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { options, token } = require("./helpers/clerkSession");
const rows = [{ id: "encounter_A", user: { clerkUserId: "user_A" }, patientCase: { caseId: "uti_level1" }, status: "IN_PROGRESS" }, { id: "encounter_B", user: { clerkUserId: "user_B" }, patientCase: { caseId: "uti_level1" }, status: "IN_PROGRESS" }];
const paid = []; let drafts = []; let modelCalls = 0;
require.cache[require.resolve("../src/db/prisma")] = { exports: { conversation: {
  findUnique: async ({ where }) => rows.find(row => row.id === where.id) || null,
  update: async () => ({}),
} } };
require.cache[require.resolve("../src/llm/navigatorClient")] = { exports: {
  getTtsConfig: () => ({ model: "kokoro", voice: "af_heart", speed: 1.1 }),
  createPatientReply: async () => { modelCalls++; return drafts.shift() || "My throat hurts."; },
  createSpeechAudio: async params => { paid.push(params); return { audioBase64: "c3ludGhldGlj", mimeType: "audio/mpeg" }; },
  transcribeAudio: async () => ({ text: "Synthetic transcription", language: "en" }),
} };
const { createApp } = require("../src/app");
async function start(t) {
  const routers = Object.fromEntries(["cases", "grade", "conversations", "progress", "learningPaths", "clinicalPortfolio", "today", "profile"].map(name => [`${name}Router`, express.Router()]));
  routers.chatRouter = require("../src/routes/chat"); routers.voiceRouter = require("../src/routes/voice");
  const server = createApp(routers, options).listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return async (path, body, user = "user_A") => fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) }, body: JSON.stringify(body) });
}
test("chat rejects mixed commentary before display and sends only approved text and defaults to TTS", async t => {
  const request = await start(t); paid.length = 0; modelCalls = 0;
  drafts = ["My throat hurts. The student asked about a fever.", "My throat hurts."];
  const response = await request("/chat", { caseId: "uti_level1", conversationId: "encounter_A", messages: [{ role: "user", content: "What brings you in today?" }] });
  assert.equal(response.status, 200); const body = await response.json(); assert.equal(body.reply, "My throat hurts."); assert.equal(modelCalls, 2);
  const speech = await request("/voice/patient-speak", { authorization: body.speech.authorization, conversationId: "encounter_A", caseId: "uti_level1" });
  assert.equal(speech.status, 200); assert.equal((await speech.json()).turnId, body.speech.turnId);
  assert.deepEqual(paid, [{ text: "My throat hurts.", model: "kokoro", voice: "af_heart", speed: 1.1 }]);
});
test("greeting remains Hello and speech cannot substitute text, voices, learners or encounters", async t => {
  const request = await start(t); paid.length = 0;
  const greeting = await request("/voice/patient-greeting", { conversationId: "encounter_A", caseId: "uti_level1" });
  assert.equal(greeting.status, 200); const body = await greeting.json(); assert.equal(body.reply, "Hello.");
  const payload = { authorization: body.speech.authorization, conversationId: "encounter_A", caseId: "uti_level1" };
  for (const [extra, user, status] of [[{ text: "Evaluation: wrong" }, "user_A", 400], [{ voice: "am_adam" }, "user_A", 400], [{ model: "other" }, "user_A", 400], [{ speed: 2 }, "user_A", 400], [{ conversationId: "encounter_B" }, "user_A", 403], [{ caseId: "other" }, "user_A", 403], [{}, "user_B", 403], [{}, null, 401]]) {
    assert.equal((await request("/voice/patient-speak", { ...payload, ...extra }, user)).status, status);
  }
  assert.equal(paid.length, 0);
  assert.equal((await request("/voice/patient-speak", payload)).status, 200); assert.equal(paid[0].text, "Hello.");
  rows[0].status = "SUBMITTED";
  assert.equal((await request("/voice/patient-speak", payload)).status, 403); rows[0].status = "IN_PROGRESS";
});
test("both patient encounters retain the same existing defaults; mentor voice and transcription stay independent", async t => {
  const request = await start(t); paid.length = 0;
  for (const [conversationId, user] of [["encounter_A", "user_A"], ["encounter_B", "user_B"]]) {
    const response = await request("/voice/patient-greeting", { conversationId, caseId: "uti_level1" }, user);
    const body = await response.json();
    assert.equal((await request("/voice/patient-speak", { authorization: body.speech.authorization, conversationId, caseId: "uti_level1" }, user)).status, 200);
  }
  assert.ok(paid.every(call => call.voice === "af_heart" && call.model === "kokoro" && call.speed === 1.1));
  assert.equal((await request("/voice/speak", { text: "Let's reflect on that encounter.", voice: "am_adam" })).status, 200); assert.equal(paid[2].voice, "am_adam");
  assert.equal((await request("/voice/transcribe", { audio_base64: "c3ludGhldGlj", language: "en" })).status, 200);
});
test("failed regeneration displays and synthesizes only the safe fallback", async t => {
  const request = await start(t); paid.length = 0; drafts = ["My throat hurts. Note: the student asked about fever.", "Evaluation: the learner missed fever."];
  const response = await request("/chat", { caseId: "uti_level1", conversationId: "encounter_A", messages: [{ role: "user", content: "What brings you in today?" }] });
  assert.equal(response.status, 200); const body = await response.json(); assert.equal(body.reply, "I'm not sure how to answer that.");
  const speech = await request("/voice/patient-speak", { authorization: body.speech.authorization, conversationId: "encounter_A", caseId: "uti_level1" });
  assert.equal(speech.status, 200); assert.equal(paid[0].text, body.reply);
});
