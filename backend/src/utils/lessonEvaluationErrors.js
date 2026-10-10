// Codes and numeric metadata only: never emit provider messages, prompts or answers.
const codes = new Set([
  "UPSTREAM_CONFIGURATION", "UPSTREAM_REQUEST_FAILED", "UPSTREAM_TIMEOUT", "UPSTREAM_ERROR",
  "UPSTREAM_INVALID_JSON", "UPSTREAM_EMPTY_RESPONSE", "OUTPUT_TRUNCATED", "JSON_PARSE_FAILURE",
  "INVALID_OBJECT", "INVALID_LABEL", "INVALID_FEEDBACK", "FEEDBACK_TOO_LONG", "UNSAFE_FEEDBACK",
  "MISSING_EVIDENCE", "INVALID_EVIDENCE", "UNGROUNDED_EVIDENCE", "EVALUATION_FAILED",
]);
function lessonError(code, upstreamStatus) {
  const error = new Error("Lesson feedback could not be validated");
  error.lessonEvaluationCode = codes.has(code) ? code : "EVALUATION_FAILED";
  if (Number.isInteger(upstreamStatus) && upstreamStatus >= 100 && upstreamStatus <= 599) error.upstreamStatus = upstreamStatus;
  return error;
}
function failureCode(error) {
  return codes.has(error?.lessonEvaluationCode) ? error.lessonEvaluationCode : "EVALUATION_FAILED";
}
function diagnoseEvaluation(error, attempt = 1) {
  if (process.env.NODE_ENV !== "development" || process.env.MODULE0_EVALUATION_DIAGNOSTICS !== "1") return;
  const detail = { code: failureCode(error), attempt: attempt === 2 ? 2 : 1 };
  if (Number.isInteger(error?.upstreamStatus) && error.upstreamStatus >= 100 && error.upstreamStatus <= 599) detail.upstreamStatus = error.upstreamStatus;
  console.warn("[Module0 evaluation]", detail);
}
module.exports = { lessonError, failureCode, diagnoseEvaluation };
