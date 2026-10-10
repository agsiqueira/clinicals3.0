function sanitizeCase(caseData) {
  if (!caseData || typeof caseData !== "object") {
    return caseData;
  }
  const { 
    hidden_truth, 
    rubric,
    answer_key,
    model_answer,
    ...safeCase 
  } = caseData;
  return safeCase;
}

// Response allowlist is deliberately separate from internal patient prompt data.
function learnerCase(data) {
  if (!data) return data;
  const profile = data.patient_profile || {};
  const opening = data.osce_opening || {};
  return {
    case_id: data.case_id, display_title: data.display_title, level: data.level,
    setting: data.setting, time_allowed_minutes: data.time_allowed_minutes,
    frame: data.frame, primary_tasks: data.primary_tasks,
    patient_profile: Object.fromEntries(["first_name", "last_name", "preferred_name", "date_of_birth", "age", "sex"].map(key => [key, profile[key]])),
    presenting_info: { chief_complaint: data.presenting_info?.chief_complaint },
    osce_opening: Object.fromEntries(["student_intro", "patient_name_permission", "student_prompt_variants", "patient_chief_complaint_reply"].map(key => [key, opening[key]])),
  };
}
module.exports = { sanitizeCase, learnerCase };
