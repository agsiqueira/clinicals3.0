const DEFAULT_BASE_URL = "https://api.ai.it.ufl.edu";
const DEFAULT_CHAT_TIMEOUT_MS = 30000;
const DEFAULT_GRADING_TIMEOUT_MS = 180000;
const DEFAULT_TTS_TIMEOUT_MS = 60000;
const { lessonError, failureCode } = require("../utils/lessonEvaluationErrors");

function readTimeoutMs(raw, fallback) {
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  return fallback;
}

function getChatTimeoutMs() {
  const raw = Number(process.env.NAVIGATOR_CHAT_TIMEOUT_MS || process.env.NAVIGATOR_TIMEOUT_MS);
  return readTimeoutMs(raw, DEFAULT_CHAT_TIMEOUT_MS);
}

function getGradingTimeoutMs() {
  const raw = Number(process.env.NAVIGATOR_GRADING_TIMEOUT_MS || process.env.NAVIGATOR_TIMEOUT_MS);
  return readTimeoutMs(raw, DEFAULT_GRADING_TIMEOUT_MS);
}

function getTtsTimeoutMs() {
  const raw = Number(process.env.NAVIGATOR_TTS_TIMEOUT_MS || process.env.NAVIGATOR_TIMEOUT_MS);
  return readTimeoutMs(raw, DEFAULT_TTS_TIMEOUT_MS);
}

function getNavigatorConfig() {
  const apiKey = process.env.NAVIGATOR_API_KEY;
  const chatModel = process.env.NAVIGATOR_MODEL;
  const gradingModel = process.env.NAVIGATOR_GRADING_MODEL || chatModel;
  const baseUrl = process.env.NAVIGATOR_BASE || DEFAULT_BASE_URL;

  if (!apiKey) {
    throw new Error("NAVIGATOR_API_KEY is not set");
  }
  if (!chatModel) {
    throw new Error("NAVIGATOR_MODEL is not set");
  }

  return {
    apiKey,
    chatModel,
    gradingModel,
    baseUrl
  };
}

async function callNavigatorChat({
  model,
  messages,
  temperature = 0.4,
  maxTokens = 250,
  stop = null,
  timeoutMs = DEFAULT_CHAT_TIMEOUT_MS,
  lessonFeedback = false
}) {
  const { apiKey, baseUrl } = getNavigatorConfig();

  const payload = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages
  };

  if (Array.isArray(stop) && stop.length > 0) {
    payload.stop = stop;
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (lessonFeedback) {
      // Do not consume or forward upstream error bodies; they may echo input.
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw lessonError("UPSTREAM_ERROR", response.status);
      }
      let data;
      try { data = await response.json(); }
      catch (error) { if (error?.name === "AbortError") throw error; throw lessonError("UPSTREAM_INVALID_JSON"); }
      const choice = data?.choices?.[0];
      if (choice?.finish_reason === "length") throw lessonError("OUTPUT_TRUNCATED");
      const message = choice?.message?.content;
      if (typeof message !== "string" || !message.trim()) throw lessonError("UPSTREAM_EMPTY_RESPONSE");
      return message.trim();
    }
  } catch (err) {
    if (err?.name === "AbortError") {
      if (lessonFeedback) throw lessonError("UPSTREAM_TIMEOUT");
      throw new Error(`NaviGator API timed out after ${timeoutMs}ms`);
    }
    if (lessonFeedback) {
      if (failureCode(err) !== "EVALUATION_FAILED") throw err;
      throw lessonError("UPSTREAM_REQUEST_FAILED");
    }
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NaviGator API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message?.content;
  if (!message) {
    throw new Error("NaviGator API returned no message");
  }
  return message.trim();
}

async function createPatientReply({ systemPrompt, messages }) {
  const { chatModel } = getNavigatorConfig();
  return callNavigatorChat({
    model: chatModel,
    temperature: 0.4,
    maxTokens: 250,
    timeoutMs: getChatTimeoutMs(),
    stop: ["\nuser", "\nUser", "\nassistant", "\nAssistant"],
    messages: [{ role: "system", content: systemPrompt }, ...messages]
  });
}

async function createLessonReply({ systemPrompt, messages, timeoutMs }) {
  let chatModel;
  try { ({ chatModel } = getNavigatorConfig()); }
  catch { throw lessonError("UPSTREAM_CONFIGURATION"); }
  return callNavigatorChat({
    model: chatModel, temperature: 0, maxTokens: 512,
    timeoutMs: Math.min(getChatTimeoutMs(), 30000, timeoutMs),
    lessonFeedback: true, // JSON teaching has no patient-specific stop sequences.
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  });
}

async function createRubricEval({ systemPrompt, userPrompt }) {
  const { gradingModel } = getNavigatorConfig();
  return callNavigatorChat({
    model: gradingModel,
    temperature: 0,
    maxTokens: 3000,
    timeoutMs: getGradingTimeoutMs(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });
}

function getTtsConfig(overrides = {}, { allowMissingVoice = false } = {}) {
  // Note: the current development NaviGator key only has access to
  // granite-3.3-8b-instruct. Audio playback requires a key/model with TTS
  // access, configured via NAVIGATOR_TTS_MODEL and NAVIGATOR_TTS_VOICE.
  const model = String(
    overrides.model ||
      process.env.NAVIGATOR_TTS_MODEL ||
      "kokoro"
  )
    .trim()
    .toLowerCase();
  const voice = String(overrides.voice || process.env.NAVIGATOR_TTS_VOICE || "").trim();

  if (!voice && !allowMissingVoice) {
    throw new Error("NAVIGATOR_TTS_VOICE is not set");
  }

  const speedRaw = Number(
    overrides.speed == null ? process.env.NAVIGATOR_TTS_SPEED : overrides.speed
  );
  const speed = Number.isFinite(speedRaw) && speedRaw > 0 ? speedRaw : 1;

  return { model, voice, speed };
}

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function debugLog(event) { require("../utils/safeDiagnostics").diagnostic(event);
}

function debugError() { require("../utils/safeDiagnostics").diagnostic("Upstream operation failed");
}

function sanitizeHeaders(headers) {
  const result = {};
  try {
    headers.forEach((value, key) => {
      result[key] = value;
    });
  } catch {
    return result;
  }
  return result;
}

async function createSpeechAudio({ text, voice, speed, model }) {
  const input = String(text || "").trim();
  if (!input) {
    throw new Error("text is required for speech synthesis");
  }

  const { apiKey, baseUrl } = getNavigatorConfig();
  const ttsConfig = getTtsConfig({ voice, speed, model });

  const payload = {
    model: ttsConfig.model,
    input,
    voice: ttsConfig.voice,
    response_format: "mp3",
    speed: ttsConfig.speed
  };

  debugLog("[NaviGator TTS] request", {
    url: `${baseUrl}/v1/audio/speech`,
    model: payload.model,
    voice: payload.voice,
    response_format: payload.response_format,
    speed: payload.speed,
    inputLength: input.length,
    timeoutMs: getTtsTimeoutMs()
  });

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), getTtsTimeoutMs());
  let response;

  try {
    response = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (err) {
    debugError("[NaviGator TTS] fetch exception");
    debugError(err);
    debugError(err?.stack);
    if (err?.name === "AbortError") {
      throw new Error(`NaviGator TTS timed out after ${getTtsTimeoutMs()}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }

  debugLog("[NaviGator TTS] response", {
    status: response.status,
    ok: response.ok,
    headers: sanitizeHeaders(response.headers)
  });

  if (!response.ok) {
    const textResponse = await response.text();
    const error = new Error(`NaviGator TTS error ${response.status}: ${textResponse}`);
    error.status = response.status;
    error.headers = sanitizeHeaders(response.headers);
    error.responseBody = textResponse;
    debugError("[NaviGator TTS] non-OK response", {
      status: error.status,
      headers: error.headers,
      responseBody: error.responseBody
    });
    throw error;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  debugLog("[NaviGator TTS] audio received", {
    byteLength: buffer.length,
    mimeType: response.headers.get("content-type") || "audio/mpeg"
  });

  return {
    audioBase64: buffer.toString("base64"),
    mimeType: response.headers.get("content-type") || "audio/mpeg"
  };
}

async function transcribeAudio({
  audioBuffer,
  mimeType = "audio/m4a",
  filename = "audio.m4a",
  language = "en"
}) {
  const { apiKey, baseUrl } = getNavigatorConfig();
  const FormData = require("form-data");
  const requestedLanguage = String(language || "en").trim().toLowerCase();
  const transcriptionLanguage = requestedLanguage === "en" ? "en" : "en";

  const form = new FormData();
  form.append("file", audioBuffer, { filename, contentType: mimeType });
  form.append("model", process.env.NAVIGATOR_STT_MODEL);
  form.append("language", transcriptionLanguage);
  debugLog("[NaviGator STT] request", {
    filename,
    mimeType,
    language: transcriptionLanguage,
    model: process.env.NAVIGATOR_STT_MODEL || null,
    byteLength: audioBuffer.length
  });

  const timeoutMs = 60000;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    const formBuffer = form.getBuffer();

    response = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...form.getHeaders()
      },
      body: formBuffer,
      signal: controller.signal
    });
  } catch (err) {
    if (err?.name === "AbortError") throw new Error("NaviGator Whisper timed out");
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NaviGator Whisper error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const transcript = String(data?.text || "").trim();
  debugLog("[NaviGator STT] response", {
    language: data?.language || transcriptionLanguage,
    transcriptPreview: transcript.slice(0, 120)
  });
  return {
    text: transcript,
    language: data?.language || transcriptionLanguage
  };
}

module.exports = { createPatientReply, createLessonReply, createRubricEval, createSpeechAudio, transcribeAudio, getTtsConfig };
