const test = require("node:test");
const assert = require("node:assert/strict");
const { learnerCase } = require("../src/utils/safeCase");
const { loadCase, loadGrading } = require("../src/utils/caseLoader");
test("learner case allowlist excludes internal diagnoses, histories, rubrics and model instructions", async () => {
  const source = await loadCase("uti_level1");
  const safe = learnerCase({ ...source, hidden_truth: "PRIVATE_CANARY", rubric: { canary: "PRIVATE_CANARY" }, patient_instructions: "PRIVATE_CANARY", newly_added_secret: "PRIVATE_CANARY", patient_profile: { ...source.patient_profile, private: "PRIVATE_CANARY" } });
  assert.equal(safe.case_id, source.case_id);
  assert.equal(safe.presenting_info.chief_complaint, source.presenting_info.chief_complaint);
  assert.equal(JSON.stringify(safe).includes("PRIVATE_CANARY"), false);
  for (const field of ["hidden_truth", "rubric", "answer_key", "model_answer", "social_history", "medical_history", "patient_instructions", "behavior_rules", "disclosure_facts"]) assert.equal(field in safe, false);
});
test("case and rubric loaders reject filesystem traversal and invalid identifiers", async () => {
  for (const id of ["../backend/package", "../../etc/passwd", "/etc/passwd", "uti_level1_grading.json", "uti_level1_grading", null]) {
    assert.equal(await loadCase(id), null);
    assert.equal(await loadGrading(id), null);
  }
});
