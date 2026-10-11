import { authenticatedFetch } from "./sessionToken";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const REQUEST_TIMEOUT_MS = 10000;
const TTS_REQUEST_TIMEOUT_MS = 90000;

if (!BASE_URL) {
  throw new Error("Missing EXPO_PUBLIC_API_BASE_URL in .env");
}

const API_PREFIX = "/api";

function apiUrl(path) {
  return `${BASE_URL}${API_PREFIX}${path}`;
}

async function request(path, { method = "GET", body, headers, signal, timeoutMs: timeoutOverride } = {}) {
  // Legacy optional argument now carries local session context; it is never an identity header.
  const { expectedUserId, ...transportHeaders } = headers || {};
  const controller = new AbortController();
  const timeoutMs = timeoutOverride ?? (
    String(method).toUpperCase() === "POST" && ["/voice/speak", "/voice/patient-speak"].includes(path)
      ? TTS_REQUEST_TIMEOUT_MS
      : REQUEST_TIMEOUT_MS
  );
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  let timedOut = false;
  const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);

  try {
    const res = await authenticatedFetch(apiUrl(path), {
      method,
      expectedUserId,
      headers: {
        "Content-Type": "application/json",
        ...transportHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `Request failed: ${res.status} ${res.statusText}`;
      const error = new Error(msg);
      error.status = res.status;
      error.data = data;
      throw error;
    }
    return data;
  } catch (err) {
    if (err?.name === "AbortError" && timedOut && !signal?.aborted) {
      const error = new Error("Request timed out. Refresh saved progress before retrying a submitted answer.");
      error.code = "REQUEST_TIMEOUT";
      throw error;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abort);
  }
}

export const api = {
  // ---- Test: health / ping
  health: () => request("/health"),

  // to view previous attempts for a case
  getAttemptsByCase: (caseId, headers) => request(`/conversations/by-case/${caseId}`, { headers }),

  getModule0Progress: (headers, signal) => request("/modules/clinical-readiness", { headers, signal }),
  submitModule0Interaction: (payload, headers, signal) => request("/modules/clinical-readiness/interactions", { method: "POST", body: payload, headers, signal, timeoutMs: 45000 }),

  // ---- Clinicals 2.0 roadmap
  getLearningPaths: (headers) => request("/learning-paths", { headers }),
  getPatientSessionOverview: (slug, headers) =>
    request(`/learning-paths/patient-sessions/${slug}`, { headers }),
  sendPreceptorChatMessage: (slug, payload, headers) =>
    request(`/learning-paths/patient-sessions/${slug}/preceptor-chat`, {
      method: "POST",
      body: payload,
      headers,
    }),
  transcribeVoice: (payload, headers) =>
    request("/voice/transcribe", {
      method: "POST",
      body: payload,
      headers,
    }),
  speakPatientVoice: (payload, headers) => request("/voice/patient-speak", { method: "POST", body: payload, headers }),
  speakVoice: (payload, headers) =>
    request("/voice/speak", {
      method: "POST",
      body: payload,
      headers,
    }),

  // ---- Example resource calls (edit paths to match your backend)
  getCases: () => request("/cases"),
  getCaseById: (id) => request(`/cases/${id}`),
  getProgress: (headers) => request("/progress", { headers }),
  getClinicalPortfolio: (headers) => request("/clinical-portfolio", { headers }),
  getCompetencyProfile: (headers) => request("/profile/competencies", { headers }),
  getToday: (headers) => request("/today", { headers }),
  getFacultyDashboard: (headers) => request("/faculty/dashboard", { headers }),
  getFacultyStudentDetail: (studentId, headers) =>
    request(`/faculty/students/${studentId}`, { headers }),
  getFacultyDashboardCsvUrl: () => apiUrl("/faculty/dashboard/export.csv"),
  getFacultyStudentCsvUrl: (studentId) => apiUrl(`/faculty/students/${studentId}/export.csv`),

  // Example: create a case
  createCase: (payload) =>
    request("/cases", { method: "POST", body: payload }),
};
