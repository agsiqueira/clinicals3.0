import { selectDraftLearner } from "./encounterDraft.js";
let binding = null;
let generation = 0;
const pending = new Set();
export function bindSession(userId, sessionId, getToken) {
  selectDraftLearner(userId);
  if (binding?.userId !== userId || binding?.sessionId !== sessionId) {
    generation += 1;
    for (const controller of pending) controller.abort();
    pending.clear();
  }
  binding = userId && sessionId ? { userId, sessionId, getToken } : null;
}
function sessionError(message = "Your session expired. Sign in again to continue your encounter.") {
  const error = new Error(message); error.status = 401; return error;
}
export function captureSession(expectedUserId) {
  const snapshot = binding;
  const version = generation;
  const assertCurrent = () => {
    if (!snapshot || generation !== version || (expectedUserId !== undefined && snapshot.userId !== expectedUserId)) {
      throw sessionError("Session changed. This operation has been discarded.");
    }
  };
  assertCurrent();
  return assertCurrent;
}
export async function authenticatedFetch(url, options = {}) {
  const snapshot = binding;
  if (!snapshot) throw sessionError();
  const { expectedUserId, ...fetchOptions } = options;
  const assertCurrent = captureSession(expectedUserId);
  assertCurrent();
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  pending.add(controller);
  let readingBody = false;
  const cleanup = () => {
    pending.delete(controller);
    options.signal?.removeEventListener("abort", abort);
  };
  try {
    let response;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const token = await snapshot.getToken(attempt ? { skipCache: true } : {});
      assertCurrent();
      if (!token) throw sessionError();
      const headers = new Headers(options.headers);
      for (const key of Array.from(headers.keys())) {
        if (key === "x-clerk-user-id" || key.startsWith("x-user-")) headers.delete(key);
      }
      headers.set("Authorization", `Bearer ${token}`);
      response = await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
      assertCurrent();
      if (response.status !== 401 || attempt === 1) break;
      await response.text();
    }
    if (!response) throw sessionError();
    if (response.status === 401) throw sessionError();
    for (const method of ["text", "json", "arrayBuffer", "blob"]) {
      const read = response[method].bind(response);
      response[method] = async () => {
        try { const value = await read(); assertCurrent(); return value; }
        finally { cleanup(); }
      };
    }
    // Keep cancellation/account isolation active until the body is consumed.
    readingBody = true;
    return response;
  } finally {
    if (!readingBody) cleanup();
  }
}
