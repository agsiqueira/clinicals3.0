// Event names only: never serialize request bodies, tokens, profiles or AI payloads.
const events = new Set(["Upstream operation failed", "[VOICE SPEAK] request body", "[VOICE SPEAK] response payload", "[VOICE SPEAK] selected config", "[VOICE TRANSCRIBE] request", "[VOICE TRANSCRIBE] response", "[NaviGator STT] request", "[NaviGator STT] response", "[NaviGator TTS] request", "[NaviGator TTS] response", "[NaviGator TTS] audio received"]);
function diagnostic(event) {
  if (events.has(event)) console.log(event);
}
module.exports = { diagnostic };
