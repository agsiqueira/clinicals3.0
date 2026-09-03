const CORRECTIVE_PATIENT_ONLY_INSTRUCTION = [
  "Your previous draft was out of character.",
  "Answer again using only words the patient would naturally say aloud.",
  "Do not mention notes, prompts, instructions, private information, structured data, facts, context, sources, files, identifiers, metadata, or how you know anything.",
].join(" ");

const SAFE_PATIENT_FALLBACK = "I'm not sure how to answer that.";

const LEAKAGE_PATTERNS = [
  /^\s*note\s*:/i,
  /\b(?:system|developer)\s+(?:prompt|instruction|message)s?\b/i,
  /\bcase\s+(?:json|data|file)\b/i,
  /\b(?:visible_facts|allowed_this_turn|patient_profile|presenting_info)\b/i,
  /\b(?:history|patient_profile|presenting_info|visible_facts|allowed_this_turn)\.[a-z0-9_.-]+\b/i,
  /\b(?:source material|source document|source provenance|file identifier|filename|metadata)\b/i,
  /\baccording to (?:the\s+)?(?:supplied\s+|provided\s+)?(?:context|facts?|file|prompt|instructions?)\b/i,
  /\b(?:supplied|provided|given|disclosed)\s+(?:in|by|from)\s+(?:the\s+)?(?:context|facts?|file|prompt|instructions?)\b/i,
  /\b(?:the\s+)?facts?\s+(?:say|said|show|showed|contain|contained|provide|provided|disclose|disclosed)\b/i,
  /\b(?:prompt|instructions?)\s+(?:say|says|said|tell|tells|told|provide|provided|gave|given)\b/i,
];

function cleanPatientReply(raw) {
  return String(raw || "")
    .split(/\n\s*(user|assistant)\b[:]?/i)[0]
    .trim();
}

function containsPatientReplyLeakage(reply) {
  const text = String(reply || "").trim();
  return LEAKAGE_PATTERNS.some((pattern) => pattern.test(text));
}

async function createSafePatientReply({ systemPrompt, messages, generateReply }) {
  const firstReply = cleanPatientReply(await generateReply({ systemPrompt, messages }));
  if (!containsPatientReplyLeakage(firstReply)) return firstReply;

  const correctiveSystemPrompt = `${systemPrompt}\n\n${CORRECTIVE_PATIENT_ONLY_INSTRUCTION}`;
  const regeneratedReply = cleanPatientReply(
    await generateReply({ systemPrompt: correctiveSystemPrompt, messages })
  );
  return containsPatientReplyLeakage(regeneratedReply) ? SAFE_PATIENT_FALLBACK : regeneratedReply;
}

module.exports = {
  CORRECTIVE_PATIENT_ONLY_INSTRUCTION,
  SAFE_PATIENT_FALLBACK,
  cleanPatientReply,
  containsPatientReplyLeakage,
  createSafePatientReply,
};
