const test = require("node:test");
const assert = require("node:assert/strict");
const { diagnostic } = require("../src/utils/safeDiagnostics");
test("diagnostics do not serialize transcripts, tokens, profile metadata or vendor error bodies", t => {
  const lines = [];
  t.mock.method(console, "log", (...args) => lines.push(args));
  diagnostic("[VOICE SPEAK] request body", { token: "PRIVATE", transcript: "PRIVATE" });
  diagnostic("PRIVATE");
  assert.deepEqual(lines, [["[VOICE SPEAK] request body"]]);
});
