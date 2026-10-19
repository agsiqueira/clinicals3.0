const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
// Load the real pure frontend modules as ESM on every supported backend Node version,
// without relying on Node 22+'s automatic detection of untyped .js files.
const draftsUrl = moduleUrl(fs.readFileSync(path.join(__dirname, "../../mobile/src/api/encounterDraft.js"), "utf8"));
const tokenSource = fs.readFileSync(path.join(__dirname, "../../mobile/src/api/sessionToken.js"), "utf8").replace('"./encounterDraft.js"', JSON.stringify(draftsUrl));
let session;
test.before(async () => { session = await import(moduleUrl(tokenSource)); });
test.afterEach(() => { session.bindSession(null, null, null); });
test("current Clerk token replaces stored or caller-supplied identity and authorization", async t => {
  const original = global.fetch; t.after(() => { global.fetch = original; });
  session.bindSession("A", "session_A", async () => "current-token");
  global.fetch = async (_url, options) => {
    assert.equal(options.headers.get("authorization"), "Bearer current-token");
    assert.equal(options.headers.get("x-clerk-user-id"), null);
    assert.equal(options.headers.get("x-user-email"), null);
    return new Response('{"ok":true}');
  };
  const response = await session.authenticatedFetch("https://api.example.test", { headers: { Authorization: "Bearer legacy", "x-clerk-user-id": "B", "x-user-email": "fake" } });
  assert.deepEqual(await response.json(), { ok: true });
});
test("expiration refreshes once after 401 and does not retry non-authentication failures", async t => {
  const original = global.fetch; t.after(() => { global.fetch = original; });
  const requests = []; let calls = 0;
  session.bindSession("A", "session_A", async options => { requests.push(options); return "token"; });
  global.fetch = async () => new Response("{}", { status: ++calls === 1 ? 401 : 200 });
  await session.authenticatedFetch("https://api.example.test", { method: "POST" });
  assert.equal(calls, 2); assert.equal(requests[1].skipCache, true);
  calls = 0;
  global.fetch = async () => { calls++; return new Response("{}", { status: 500 }); };
  await session.authenticatedFetch("https://api.example.test", { method: "POST" });
  assert.equal(calls, 1);
});
test("missing or expired sessions reject visibly without issuing an anonymous request", async t => {
  const original = global.fetch; t.after(() => { global.fetch = original; }); let calls = 0;
  global.fetch = async () => { calls++; return new Response("{}", { status: 401 }); };
  session.bindSession("A", "session_A", async () => null);
  await assert.rejects(session.authenticatedFetch("https://api.example.test"), /session expired/);
  assert.equal(calls, 0);
  session.bindSession("A", "session_A", async () => "expired");
  await assert.rejects(session.authenticatedFetch("https://api.example.test"), /session expired/);
  assert.equal(calls, 2);
});
test("account switching aborts delayed requests and discards delayed body reads", async t => {
  const original = global.fetch; t.after(() => { global.fetch = original; });
  let release, signal;
  session.bindSession("A", "session_A", async () => "A-token");
  global.fetch = async (_url, options) => { signal = options.signal; return new Promise(resolve => { release = resolve; }); };
  const pending = session.authenticatedFetch("https://api.example.test");
  await new Promise(resolve => setImmediate(resolve));
  session.bindSession("B", "session_B", async () => "B-token");
  assert.equal(signal.aborted, true);
  release(new Response('{"learner":"A"}'));
  await assert.rejects(pending, /discarded/);
  global.fetch = async () => new Response('{"learner":"B"}');
  const response = await session.authenticatedFetch("https://api.example.test");
  session.bindSession("A", "session_A", async () => "A-token");
  await assert.rejects(response.json(), /discarded/);
});
test("same-learner token refresh retains drafts; reauthentication recovers them; account switching clears them", async () => {
  const drafts = await import(draftsUrl);
  session.bindSession("A", "session_A", async () => "token");
  drafts.saveEncounterDraft("A_case", { hpiText: "synthetic draft", conversationId: "A_conv" });
  session.bindSession("A", "session_A", async () => "fresh-token");
  assert.equal(drafts.readEncounterDraft("A_case").conversationId, "A_conv");
  session.bindSession(null, null, null);
  session.bindSession("A", "session_A2", async () => "fresh-token");
  assert.equal(drafts.readEncounterDraft("A_case").hpiText, "synthetic draft");
  session.bindSession("B", "session_B", async () => "B-token");
  assert.equal(drafts.readEncounterDraft("A_case"), null);
});

test("delayed local work from a previous account cannot start a request using the new account token", async t => {
  const original = global.fetch; t.after(() => { global.fetch = original; }); let calls = 0;
  global.fetch = async () => { calls++; return new Response("{}"); };
  session.bindSession("A", "session_A", async () => "A-token");
  const assertCurrent = session.captureSession("A");
  session.bindSession("B", "session_B", async () => "B-token");
  assert.throws(assertCurrent, /discarded/);
  await assert.rejects(session.authenticatedFetch("https://api.example.test", { expectedUserId: "A" }), /discarded/);
  assert.equal(calls, 0);
});

test("session recovery fires only after failed refresh or a missing token, never for network/403/503 failures", async t => {
  const original = global.fetch; t.after(() => { global.fetch = original; });
  let recoveries = 0;
  const unsubscribe = session.onSessionExpired(() => { recoveries++; });
  t.after(unsubscribe);
  session.bindSession("A", "session_A", async () => "token");
  for (const status of [403, 503]) {
    global.fetch = async () => new Response("{}", { status });
    const response = await session.authenticatedFetch("https://api.example.test");
    assert.equal(response.status, status); await response.text();
  }
  global.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(session.authenticatedFetch("https://api.example.test"), /Failed to fetch/);
  assert.equal(recoveries, 0);
  let calls = 0;
  global.fetch = async () => new Response("{}", { status: ++calls === 1 ? 401 : 200 });
  await (await session.authenticatedFetch("https://api.example.test")).text();
  assert.equal(recoveries, 0);
  global.fetch = async () => new Response("{}", { status: 401 });
  await assert.rejects(session.authenticatedFetch("https://api.example.test"), /session expired/);
  assert.equal(recoveries, 1);
  session.bindSession("A", "session_A", async () => null);
  await assert.rejects(session.authenticatedFetch("https://api.example.test"), /session expired/);
  assert.equal(recoveries, 2);
  unsubscribe();
  await assert.rejects(session.authenticatedFetch("https://api.example.test"), /session expired/);
  assert.equal(recoveries, 2);
});
