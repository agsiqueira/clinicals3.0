const test = require("node:test");
const assert = require("node:assert/strict");

const { loadCase } = require("../src/utils/caseLoader");
const {
  buildDisclosureState,
  buildVisibleCase,
  extractFacts,
  selectAllowedFacts,
} = require("../src/utils/patientDisclosure");

test("broad questions reveal only one non-sensitive clinical fact", async () => {
  const caseData = await loadCase("uti_level1");
  const visibleCase = buildVisibleCase({
    caseData,
    messages: [{ role: "user", content: "Tell me more." }],
  });

  assert.equal(visibleCase.spoken_details.may_answer_now.length, 1);
  assert.ok(
    !visibleCase.spoken_details.may_answer_now.some((text) =>
      /blood|fever|flank|nausea|vomit|discharge|allerg|medication|medical history/i.test(
        text
      )
    )
  );
});

test("transcript replay advances broad disclosure to the next undisclosed fact", async () => {
  const caseData = await loadCase("uti_level1");
  const visibleCase = buildVisibleCase({
    caseData,
    messages: [
      { role: "user", content: "Tell me more." },
      { role: "assistant", content: "I have burning when I urinate." },
      { role: "user", content: "What else is going on?" },
    ],
  });

  assert.deepEqual(
    visibleCase.spoken_details.previously_shared,
    [caseData.presenting_info.opening_statement]
  );
  assert.equal(visibleCase.spoken_details.may_answer_now.length, 1);
});

test("broad questions do not expose negatives or red flags alongside the one allowed fact", async () => {
  const caseData = await loadCase("uti_level1");
  const state = buildDisclosureState({
    caseData,
    disclosedFactIds: [
      "presenting_info.chief_complaint",
      "history.old_carts.onset",
      "history.pertinent_negatives.8",
    ],
    messages: [{ role: "user", content: "Tell me more." }],
  });
  const visibleFactsText = JSON.stringify(state.visibleCase.spoken_details);

  assert.equal(state.visibleCase.spoken_details.may_answer_now.length, 1);
  assert.deepEqual(state.allowedFactIds, ["history.old_carts.location"]);
  assert.match(
    state.visibleCase.spoken_details.may_answer_now[0],
    /genital area/i
  );
  assert.doesNotMatch(
    visibleFactsText,
    /abdominal pain|fever|blood|flank|nausea|vomit|discharge|allerg|medication|medical history/i
  );
});

test("specific questions reveal only matching facts", async () => {
  const caseData = await loadCase("uti_level1");
  const facts = extractFacts(caseData);
  const selected = selectAllowedFacts({
    facts,
    question: "When did it start?",
    disclosedFactIds: new Set(),
  });

  assert.deepEqual(selected.map((fact) => fact.topic), ["onset"]);
});

test("compound specific questions reveal each specifically requested fact", async () => {
  const caseData = await loadCase("uti_level1");
  const facts = extractFacts(caseData);
  const selected = selectAllowedFacts({
    facts,
    question: "When did it start and how bad is it?",
    disclosedFactIds: new Set(),
  });

  assert.deepEqual(selected.map((fact) => fact.topic), ["onset", "severity"]);
});

test("sensitive facts are available only when directly asked", async () => {
  const caseData = await loadCase("uti_level1");
  const broadVisibleCase = buildVisibleCase({
    caseData,
    messages: [{ role: "user", content: "What else?" }],
  });
  const directVisibleCase = buildVisibleCase({
    caseData,
    messages: [{ role: "user", content: "Have you noticed any blood in your urine?" }],
  });

  assert.ok(
    !broadVisibleCase.spoken_details.may_answer_now.some((text) => /blood/i.test(text))
  );
  assert.ok(
    directVisibleCase.spoken_details.may_answer_now.some((text) => /blood/i.test(text))
  );
});

test("persisted disclosed fact IDs advance broad disclosure without transcript replay", async () => {
  const caseData = await loadCase("uti_level1");
  const state = buildDisclosureState({
    caseData,
    disclosedFactIds: ["presenting_info.chief_complaint"],
    messages: [{ role: "user", content: "Tell me more." }],
  });

  assert.deepEqual(state.allowedFactIds, ["history.old_carts.onset"]);
  assert.deepEqual(state.nextDisclosedFactIds, [
    "presenting_info.chief_complaint",
    "history.old_carts.onset",
  ]);
  assert.equal(state.visibleCase.spoken_details.previously_shared.length, 1);
  assert.equal(state.visibleCase.spoken_details.may_answer_now.length, 1);
  assert.doesNotMatch(JSON.stringify(state.visibleCase), /presenting_info|history\.old_carts/);
});

test("persisted disclosed fact IDs are the source of truth when provided", async () => {
  const caseData = await loadCase("uti_level1");
  const state = buildDisclosureState({
    caseData,
    disclosedFactIds: [],
    messages: [
      { role: "user", content: "Tell me more." },
      { role: "assistant", content: "I have burning when I urinate." },
      { role: "user", content: "What else?" },
    ],
  });

  assert.deepEqual(state.allowedFactIds, ["presenting_info.chief_complaint"]);
  assert.deepEqual(state.nextDisclosedFactIds, ["presenting_info.chief_complaint"]);
});
