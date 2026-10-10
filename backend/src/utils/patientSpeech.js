const crypto = require("node:crypto");
const { containsPatientReplyLeakage } = require("./patientReplySafety");
const { getTtsConfig } = require("../llm/navigatorClient");
// Opaque, short-lived approvals never expose their patient text or identity as token claims.
// A process-local key needs no new secret for a single backend. Replicas may share a
// dedicated 32-byte hex PATIENT_SPEECH_KEY; never reuse a Clerk or NaviGator credential.
const localKey = crypto.randomBytes(32);
const TTL_MS = 180000;
function key() {
  const configured = process.env.PATIENT_SPEECH_KEY;
  if (!configured) return localKey;
  if (!/^[a-f0-9]{64}$/i.test(configured)) throw new Error("Invalid patient speech key configuration");
  return Buffer.from(configured, "hex");
}
function denied() { const error = new Error("Patient speech authorization is invalid or expired"); error.status = 403; return error; }
function approvePatientSpeech({ text, clerkUserId, conversationId, caseId, settings, now = Date.now() }) {
  if (!text || containsPatientReplyLeakage(text) || !clerkUserId || !conversationId || !caseId) throw denied();
  const approved = { text, clerkUserId, conversationId, caseId, settings: settings || getTtsConfig({}, { allowMissingVoice: true }), turnId: crypto.randomUUID(), expiresAt: now + TTL_MS };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(approved), "utf8"), cipher.final()]);
  return { authorization: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url"), turnId: approved.turnId };
}
function verifyPatientSpeech({ authorization, clerkUserId, conversationId, caseId, now = Date.now() }) {
  try {
    if (typeof authorization !== "string" || authorization.length > 16000) throw denied();
    const bytes = Buffer.from(authorization, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const approved = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
    if (approved.expiresAt <= now || approved.clerkUserId !== clerkUserId || approved.conversationId !== conversationId || approved.caseId !== caseId || containsPatientReplyLeakage(approved.text)) throw denied();
    return approved;
  } catch { throw denied(); }
}
async function ownedActiveEncounter(prisma, clerkUserId, conversationId, caseId) {
  if (!clerkUserId || !conversationId || !caseId) throw denied();
  const conversation = await prisma.conversation.findUnique({ where: { id: String(conversationId) }, include: { user: true, patientCase: true } });
  if (!conversation || conversation.user.clerkUserId !== clerkUserId || conversation.patientCase.caseId !== caseId || conversation.status !== "IN_PROGRESS") throw denied();
  return conversation;
}
module.exports = { approvePatientSpeech, verifyPatientSpeech, ownedActiveEncounter };
