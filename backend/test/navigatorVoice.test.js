const test = require("node:test");
const assert = require("node:assert/strict");
const { createSpeechAudio, transcribeAudio, createPatientReply } = require("../src/llm/navigatorClient");
function syntheticEnvironment(t) {
  const values = { NAVIGATOR_API_KEY: "synthetic-not-a-live-key", NAVIGATOR_MODEL: "synthetic-chat", NAVIGATOR_STT_MODEL: "whisper", NAVIGATOR_TTS_MODEL: "kokoro", NAVIGATOR_TTS_VOICE: "af_heart", NAVIGATOR_TTS_SPEED: "1.15" };
  const previous = Object.fromEntries(Object.keys(values).map(name => [name, process.env[name]]));
  const originalFetch = global.fetch;
  Object.assign(process.env, values);
  t.after(() => { global.fetch = originalFetch; for (const [name, value] of Object.entries(previous)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } });
}
test("real NaviGator TTS adapter preserves backend defaults and the explicit mentor override", async t => {
  syntheticEnvironment(t); const requests = [];
  global.fetch = async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return new Response(Buffer.from("synthetic-audio"), { headers: { "content-type": "audio/mpeg" } }); };
  for (const voice of [undefined, undefined, "configured-mentor"]) {
    const result = await createSpeechAudio({ text: "Synthetic approved dialogue.", voice }); assert.equal(result.mimeType, "audio/mpeg");
  }
  assert.deepEqual(requests.map(request => request.body.voice), ["af_heart", "af_heart", "configured-mentor"]);
  assert.ok(requests.every(request => request.url.endsWith("/v1/audio/speech") && request.body.model === "kokoro" && request.body.speed === 1.15 && request.body.response_format === "mp3" && request.body.input === "Synthetic approved dialogue."));
});
test("Whisper adapter preserves English transcription and audio upload", async t => {
  syntheticEnvironment(t);
  global.fetch = async (url, options) => {
    assert.ok(url.endsWith("/v1/audio/transcriptions")); const multipart = options.body.toString("utf8"); assert.match(multipart, /name="language"\r\n\r\nen/); assert.match(multipart, /filename="recording.webm"/); assert.match(multipart, /synthetic-audio/);
    return Response.json({ text: "Synthetic transcript", language: "en" });
  };
  assert.deepEqual(await transcribeAudio({ audioBuffer: Buffer.from("synthetic-audio"), mimeType: "audio/webm", filename: "recording.webm", language: "en" }), { text: "Synthetic transcript", language: "en" });
});
test("patient chat adapter consumes only the message content, never separate model reasoning fields", async t => {
  syntheticEnvironment(t);
  global.fetch = async () => Response.json({ choices: [{ message: { content: "My throat hurts.", reasoning_content: "PRIVATE_SYNTHETIC_REASONING" } }] });
  assert.equal(await createPatientReply({ systemPrompt: "synthetic", messages: [] }), "My throat hurts.");
});
