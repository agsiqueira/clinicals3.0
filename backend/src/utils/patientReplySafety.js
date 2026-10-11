const CORRECTIVE_PATIENT_ONLY_INSTRUCTION = [
  "Your previous draft was out of character.",
  "Answer again using only words the patient would naturally say aloud.",
  "Do not evaluate the student, discuss grading or rubrics, describe your role, or include internal reasoning or analysis tags.",
  "Do not mention notes, prompts, instructions, private information, structured data, facts, context, sources, files, identifiers, metadata, or how you know anything.",
].join(" ");

const SAFE_PATIENT_FALLBACK = "I'm not sure how to answer that.";

const LEAKAGE_PATTERNS = [
  /\b(?:you (?:must|should) (?:reply|respond|remain|act)|do not (?:mention|reveal|disclose)|(?:student|learner)(?:[’']s)? performance)\b/i,
  /<\/?(?:think|analysis|reasoning|system|instructions?)(?:\s[^>]*)?>/i,
  /\b(?:the\s+)?(?:student|learner|candidate)\s+(?:asked|asks|inquired|inquires|missed|should|needs|demonstrated|elicited|identified|failed|performed|addressed|is|was|has)\b/i,
  /\b(?:grading|evaluation|assessment|reasoning|analysis|rubric|internal commentary|clinical commentary|student|learner|feedback)\s*:/i,
  /\b(?:rubric|grading criteria|evaluation criteria|internal instructions|private role brief|chain of thought)\b/i,
  /\b(?:as|you are|I am)\s+(?:an?\s+|the\s+)?(?:AI|language model|standardized patient|simulated patient|evaluator|grader)\b/i,
  /(?:^|\n)\s*(?:system|developer|patient|assistant|evaluator|analysis|final)\s*:/i,
  /\b(?:the|this)\s+patient\s+(?:presents|reports|denies|has|is|should|would|will|requires)\b/i,
  /\bI\s+(?:must|should|need to)\s+(?:answer|respond|mention|reveal|disclose)\b/i,
  /```(?:json|analysis|reasoning)|"(?:evaluation|reasoning|analysis|grade|score|rubric|internal_instructions)"\s*:/i,
  /\bnote\s*:/i,
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
  const firstRaw = await generateReply({ systemPrompt, messages });
  const firstReply = cleanPatientReply(firstRaw);
  if (firstReply && !containsPatientReplyLeakage(firstRaw)) return firstReply;

  const correctiveSystemPrompt = `${systemPrompt}\n\n${CORRECTIVE_PATIENT_ONLY_INSTRUCTION}`;
  const regeneratedRaw = await generateReply({ systemPrompt: correctiveSystemPrompt, messages });
  const regeneratedReply = cleanPatientReply(regeneratedRaw);
  return !regeneratedReply || containsPatientReplyLeakage(regeneratedRaw) ? SAFE_PATIENT_FALLBACK : regeneratedReply;
}

module.exports = {
  CORRECTIVE_PATIENT_ONLY_INSTRUCTION,
  SAFE_PATIENT_FALLBACK,
  cleanPatientReply,
  containsPatientReplyLeakage,
  createSafePatientReply,
};
