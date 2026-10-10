const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createStudentAuth } = require("../src/middleware/studentAuth");
const { options, token } = require("./helpers/clerkSession");
test("real Clerk verification rejects missing, forged, expired, future and wrong-origin sessions", async (t) => {
  const app = express();
  app.use(createStudentAuth(options));
  app.get("/", (req, res) => res.json(req.studentIdentity));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/`;
  for (const credential of [null, "forged", token("user_A", { exp: 1 }), token("user_A", { nbf: 9999999999 }), token("user_A", { azp: "https://evil.example" }), token("user_A", { iss: "https://evil.example" })]) {
    const response = await fetch(url, { headers: { ...(credential ? { Authorization: `Bearer ${credential}` } : {}), "x-clerk-user-id": "user_B" } });
    assert.equal(response.status, 401);
  }
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token()}`, "x-clerk-user-id": "user_B" } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { clerkUserId: "user_A", sessionId: "sess_user_A" });
});

test("default-deny app boundary protects newly mounted API routes", async t => {
  const { createApp } = require("../src/app");
  const names = ["cases", "chat", "grade", "conversations", "voice", "progress", "learningPaths", "clinicalPortfolio", "today", "profile"];
  const routers = Object.fromEntries(names.map(name => [`${name}Router`, express.Router()]));
  const app = createApp(routers, options);
  let calls = 0;
  app.get("/api/new-paid-operation", (_req, res) => { calls++; res.json({ ok: true }); });
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/new-paid-operation`;
  assert.equal((await fetch(url)).status, 401);
  assert.equal(calls, 0);
  assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${token()}` } })).status, 200);
  assert.equal(calls, 1);
});
