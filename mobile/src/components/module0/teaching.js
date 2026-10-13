export const requiredPracticeNarration = {
 "open-the-interview":"Read the three openings and choose the one you would use to begin this encounter. Make your choice before checking the feedback.",
 "organize-old-carts":"Use the supplied Mr. Jones facts to write your OLD CARTS summary. Keep your response concise and avoid adding details that are not provided.",
 "soap-and-data-types":"For each statement, select the correct SOAP category. Select all four categories before submitting to check your classifications.",
 "history-and-context":"Describe the history areas you would review, then choose two areas of daily-life context and explain why they matter for care planning.",
 "review-of-systems":"Answer both parts of the question: explain the purpose of this history step and discuss where the supplied finding belongs. Use your own words.",
 "focused-examination":"Describe the examination information you would seek for this patient and explain how it would help your reasoning. Use the supplied history to guide your response.",
 "evidence-and-differential":"Present a working possibility, an alternative, and your reasons for considering each. Finish with an uncertainty you would discuss with your preceptor.",
 "sbar":"Use the supplied case to give a brief SBAR presentation. Include your proposed next step and a question for your preceptor.",
 "snapps":"Use the supplied case to lead a concise SNAPPS presentation. Make your uncertainty clear and finish with a focused learning question."
};
export const optionalPracticeNarration = {
 "open-the-interview":"Rewrite the question shown on screen as an opening you would use with the patient. Submit your own wording when you are ready.",
 "organize-old-carts":"Identify the OLD CARTS categories that fit the two supplied descriptions. Explain your choice using only the information shown.",
 "soap-and-data-types":"Classify the reported detail and explain your reasoning. Decide before checking the feedback.",
 "history-and-context":"Choose one of the circumstances named in the question and explain how it could affect a proposed plan.",
 "review-of-systems":"Explain where you would document each of the two details shown. Make the distinction in your own words.",
 "focused-examination":"Compare the two sources of information named in the question and explain how each contributes to reasoning.",
 "evidence-and-differential":"Explain the relationship between supporting evidence and the remaining uncertainty in this case. Give your reasoning rather than repeating the question.",
 "sbar":"Revise the facts-only report using just the two SBAR sections requested. Focus on your interpretation and proposed action.",
 "snapps":"Write only the Probe and Select parts requested here. Give one question for your preceptor and one focused question for further learning."
};
// Adapted from Mod 0.pptx slide 4 and Presentation Script.docx section 2.
export const introductionNarration = "Welcome to Starting the Encounter. We'll practice opening the interview with an open question, then use OLD CARTS to organize the patient's symptoms into a clear clinical summary. Let's begin.";
// Only these explicitly authored examples receive patient/clinical typography.
// Never infer semantics from quotation marks elsewhere in the application.
function example(label, patient="", clinical="", detail="") { return {label,patient,clinical,detail}; }
const originalOldCartsPanels = [
 {narration:"A patient's story gives us a starting point. OLD CARTS helps us gather the details we need to describe that story clearly. Explore the framework before you try your own summary.", title:"Organize the patient's story", icon:"conversation", text:"OLD CARTS is a checklist for describing a symptom. It helps you gather the details and turn the patient's story into a clear clinical summary.", rows:[]},
 {narration:"The start of a symptom and the length of each episode answer different questions. First, notice how the patient's description helps us describe the onset more precisely.", title:"When did it begin?", icon:"clock", text:"Onset tells us when a symptom began. Keep the starting point specific.", rows:[example("O · Onset","“Yesterday morning”","Acute onset.")]},
 {narration:"Now consider each episode on its own. The length of an episode is different from when the symptom first started or its pattern over the day.",title:"How long does it last?",icon:"clock",text:"Duration tells us how long an episode lasts. Keep this separate from onset and the pattern over time.",rows:[example("D · Duration","","Episodes lasting 10–15 minutes.")]},
 {narration:"Where pain occurs and whether it travels are separate details. Compare the location with the absence of radiation, and keep both in your symptom summary.",title:"Where does it occur?",icon:"conversation",text:"Location identifies where the symptom occurs. Radiation describes whether it travels elsewhere.",rows:[example("L · Location / R · Radiation","“Middle of my chest”","Anterior chest; localized, with no radiation to the arm, neck, or jaw.")]},
 {narration:"Listen for the patient's description before choosing clinical terms. Sharp describes the character, while pleuritic connects the pain to breathing. Notice how both preserve the meaning of the patient's words.",title:"Describe the symptom",icon:"conversation",text:"Character describes how a symptom feels. Pleuritic pain is related to breathing.",rows:[example("C · Character","“It feels like a stabbing knife when I take a breath.”","Sharp, pleuritic pain.")]},
 {narration:"Keep the feeling of pain separate from what changes it. Explore what makes the pain worse and what, if anything, helps. The absence of relief is also useful information.",title:"What changes the symptom?",icon:"conversation",text:"Aggravating and alleviating factors describe what makes the symptom worse or better.",rows:[example("A · Aggravating/Alleviating factors","","Aggravated by inspiration; no alleviating factors.","Deep breathing makes it worse. Nothing helps.")]},
 {narration:"Keep the pattern over time separate from the length of each episode. Notice how coming and going, or being worse at a particular time, adds a different kind of timing information.",title:"Notice the pattern",icon:"clock",text:"Temporal factors describe the pattern over time. Duration is the length of an episode.",rows:[example("T · Temporal factors","Comes and goes, worse on waking.","Intermittent, worse in the morning.")]},
 {narration:"Ask the patient to describe the intensity in their own terms. A rating gives us a shared reference point while keeping their experience at the center of the description.",title:"How intense is it?",icon:"conversation",text:"Severity describes intensity. Keep the patient's own rating in your summary.",rows:[example("S · Severity","“6 out of 10”","Moderate, rated 6/10.")]},
 {narration:"A useful clinical qualifier keeps the patient's meaning intact. Compare the patient's description with sharp and pleuritic, then use the same approach when you organize Mr. Jones's facts.", title:"Patient words to clinical qualifiers", icon:"conversation", text:"Listen first, then choose a precise qualifier that preserves the patient's meaning. In practice, include all eight OLD CARTS categories. Short labeled phrases are enough.", rows:[example("Patient language → clinical description","“Stabbing knife when I take a breath”","Sharp and pleuritic.")]}
];
// Keep the original examples while teaching one category per page in acronym order.
export const oldCartsPanels = [
 {...originalOldCartsPanels[0],illustration:"patient-data-to-summary"},
 originalOldCartsPanels[1],
 {title:"Where does it occur?",icon:"map-marker-radius-outline",text:"Location identifies where the symptom occurs.",narration:"First identify where the pain occurs. Keep this location separate from whether the pain travels elsewhere.",rows:[example("L · Location","“Middle of my chest”","Anterior chest; localized.")]},
 {...originalOldCartsPanels[2],icon:"timer-sand"},
 {...originalOldCartsPanels[4],icon:"lightning-bolt-outline"},
 {...originalOldCartsPanels[5],icon:"arrow-up-down"},
 {title:"Does the pain travel?",icon:"arrow-expand-horizontal",text:"Radiation describes whether the symptom travels elsewhere. Preserve pertinent negatives.",narration:"Now ask whether the pain travels. Mr. Jones reports no radiation to the arm, neck, or jaw. Keep that negative in your symptom summary, separate from the anterior chest location.",rows:[example("R · Radiation","“Does not go to my arm, neck, or jaw”","No radiation to the arm, neck, or jaw.")]},
 {...originalOldCartsPanels[6],icon:"clock-time-eight-outline"},
 {...originalOldCartsPanels[7],icon:"gauge"},
 originalOldCartsPanels[8]
];
// Approved final package: imagery only; preserve every authored teaching field.
const oldCartsIllustrations=["old-carts-onset","old-carts-location","old-carts-duration","old-carts-character","old-carts-factors","old-carts-radiation","old-carts-temporal","old-carts-severity","old-carts-qualifiers"];
oldCartsIllustrations.forEach((illustration,index)=>{oldCartsPanels[index+1].illustration=illustration;});
// Teaching presentation only. Source: clinicalReadiness.json; Mod 0.pptx
// slides 2, 5–11, 13–29; Presentation Script.docx sections 1, 2–6.
// Preserve the curriculum's corrections to the source management examples.
function panel(title, text, narration, icon = "list", illustration = null) {
  return { title, text, narration, icon, illustration, rows: [] };
}
export const expandedConcepts = {
  "soap-and-data-types": [
    panel("Organize information with SOAP", "SOAP means Subjective, Objective, Assessment, and Plan. It separates the information you gather from your interpretation and next steps.", "A clear structure helps your listener follow your thinking. As you explore SOAP, ask whether each detail is a report, a finding, an interpretation, or an action.", "list", "soap-overview"),
    panel("Subjective: the patient's report", "Subjective includes symptoms and history reported by the patient. Mr. Jones describes sharp pain that worsens with inspiration.", "Start by listening to the patient's experience. Even a precise pain rating is subjective when the patient reports it; a number alone does not make information objective.", "conversation", "subjective-patient-report"),
    panel("Objective: observed findings", "Objective includes what you observe or measure. Mr. Jones's localized lung crackles are an examination finding.", "Now separate what you found from what you were told. The source reports stable vital signs without numbers, so keep that wording rather than inventing measurements.", "list", "objective-exam-findings"),
    panel("Assessment: interpret the evidence", "Assessment connects the findings to your clinical judgment. Explain which possibilities the evidence supports and what remains uncertain.", "Your assessment is more than a repeated list of facts. Show the connection between the clues and your interpretation, while leaving room for alternatives.", "list"),
    panel("Plan: propose next steps", "Plan describes proposed actions and follow-up. Connect each next step to the assessment and discuss it with your preceptor.", "A proposed action should have a reason. Consider what information you still need and explain how the next step could address that gap.", "list"),
    panel("Put SOAP together", "Begin with reports and findings, then explain your interpretation and proposed actions. Keep each detail in the section that reflects its role.", "Try following the story from evidence to judgment to action. Can your listener tell which details came from the patient and which came from your examination?", "list")
  ],
  "history-and-context": [
    panel("Why history matters", "The presenting complaint is one part of the patient's story. History adds context for clinical reasoning and a practical care plan.", "Before you settle on an explanation, consider what else you need to know about this person. Their prior health and daily circumstances can change how you understand the complaint.", "list", "medical-history-context"),
    panel("Review medical history", "Ask about prior conditions, medications, allergies, and immunizations. Clarify relevant details rather than assuming a list is complete.", "A medication list or an allergy label is a starting point for questions. Explore what the patient takes and what reactions they describe so the history keeps its meaning.", "list", "history-medications-allergies"),
    panel("Surgical and family history", "Ask about prior operations and relevant family conditions. Connect these details to the current concern without assuming they explain it.", "Past procedures and family patterns can raise useful questions. Notice their relevance, but avoid treating a family condition as a diagnosis for this patient.", "list", "history-surgical-family-context"),
    panel("Understand daily life", "Explore substance use, occupation, living situation, environment, diet, and activity. Ask about financial security, social support, and cultural or spiritual considerations.", "Use open, respectful questions about daily life. Resources, support, and environmental exposures may matter, but let the patient describe their circumstances rather than filling in assumptions.", "conversation", "history-social-environmental-context"),
    panel("Put the history together", "Select history details relevant to the complaint and proposed care. Explain how medical, family, surgical, and social context shape your understanding.", "You do not need to recite every detail with equal emphasis. Make the relevant connections visible, and identify any missing information you would clarify before planning care.", "list")
  ],
  "review-of-systems": [
    panel("Why review systems?", "The review of systems asks about patient-reported symptoms that may have been overlooked.\n\nIt adds context to the history; it is not a physical examination or a diagnostic test.", "Patients may not connect another symptom with their main concern. A review of systems gives them another opportunity to describe what they have experienced.", "list", "review-of-systems"),
    panel("Use a systematic review", "Ask about symptoms across body systems in an organized way. Include constitutional, respiratory, cardiovascular, and other relevant symptom areas.", "An organized flow helps you avoid overlooked areas. Use symptom questions the patient can understand; the purpose is a fuller history, not memorizing a system count.", "list", "ros-systematic-symptom-questions"),
    panel("Reports differ from findings", "Reported shortness of breath belongs in the history. Crackles heard during an examination are objective findings.", "Listen for where the information came from. Asking about breathing and listening to the lungs answer different questions, even though both concern the respiratory system.", "conversation"),
    panel("Connect ROS to the history", "Bring relevant reported symptoms and negatives into the clinical history. Keep them separate from examination findings as you interpret the case.", "Return to the patient's original concern and consider what the additional reports contribute. Record what was actually asked and reported rather than inventing reassuring negatives.", "list", "ros-symptoms-in-history")
  ],
  "focused-examination": [
    panel("Examine with a purpose", "A focused physical examination gathers targeted, observable, and measurable findings. It follows questions raised by the history.", "The examination gives you another source of evidence. Think about which findings could help you evaluate the possibilities raised by the patient's story.", "list", "focused-examination-purpose"),
    panel("Let history guide the exam", "Select examination areas relevant to the patient's symptoms and possible explanations. Use an organized flow to gather the findings you need.", "For Mr. Jones, the chest-pain history makes respiratory and cardiac findings relevant. Explain why you would examine an area rather than choosing it from a random checklist.", "list", "focused-examination-guided-by-history"),
    panel("Separate reports and measurements", "A patient's pain description is subjective. Vital signs and observed examination findings are objective.", "Ask yourself who supplied each detail and how it was obtained. Keep the patient's experience visible while distinguishing it from your own observations.", "conversation"),
    panel("Connect findings to reasoning", "Use examination findings to support or challenge diagnostic possibilities. A finding adds evidence; it does not automatically establish or exclude a diagnosis.", "Mr. Jones's crackles contribute to a pulmonary possibility. Consider what they explain and what they leave unresolved, including the competing cardiac concern.", "list", "focused-findings-support-challenge-v2")
  ],
  "evidence-and-differential": [
    panel("What is a differential?", "A differential diagnosis is a prioritized list of plausible explanations. It makes your working diagnosis and alternatives explicit.", "Clinical reasoning begins with possibilities, not certainty. A useful list helps you explain what you think is happening and what else deserves consideration.", "list", "clinical-differential-map"),
    panel("Identify plausible explanations", "Use the history and examination to identify possibilities. In Mr. Jones's case, consider pulmonary and cardiac explanations.", "Choose possibilities that connect to the supplied evidence. Avoid adding diagnoses only to make the list longer; be ready to explain why each belongs.", "list", "clinical-reasoning-possibilities"),
    panel("Compare the evidence", "Pain with inspiration and crackles support a pulmonary possibility. Age and hypertension keep a cardiac possibility under consideration.", "Compare both sides of your reasoning. A clue that favors one explanation does not erase competing evidence or safely exclude another cause.", "list", "assessment-clinical-reasoning"),
    panel("Prioritize your possibilities", "List the working diagnosis first, then relevant alternatives. Explain how supporting evidence and important unresolved concerns shape your priorities.", "Your order communicates your judgment. Distinguish the explanation you currently favor from alternatives that still need attention, and be ready to revise as evidence changes.", "list"),
    panel("Communicate uncertainty", "State what supports your interpretation and what remains unclear. Identify the question you want to discuss with your preceptor.", "Naming uncertainty helps your preceptor understand where you need guidance. Try a specific question about the evidence instead of presenting an unsupported conclusion.", "conversation")
  ],
  sbar: [
    panel("Why structured handoffs matter", "SBAR organizes a concise handoff into Situation, Background, Assessment, and Recommendation. Share your judgment and a proposed next step.", "A busy listener needs a clear path through the case. S-bar helps you lead with the concern and finish with a request they can respond to.", "conversation", "mentor-consultation"),
    panel("Situation: the current concern", "Identify the patient and the immediate concern. Mr. Jones is 65 and presents with anterior chest pain that began yesterday morning.", "Start with what is happening now and why you are presenting the patient. Save the supporting detail for the next part so the opening stays focused.", "conversation"),
    panel("Background: relevant context", "Give the history and findings needed to understand the concern. Include Mr. Jones's hypertension, COPD, pain pattern, and lung crackles.", "Select background that helps your listener interpret the situation. Keep reported symptoms and examination findings distinguishable, even in a brief presentation.", "list"),
    panel("Assessment: your judgment", "Explain your interpretation of the evidence. Pulmonary clues are present, while a cardiac explanation remains a concern.", "This is where your listener hears your thinking. Connect the evidence to your possibilities and acknowledge what the available facts cannot settle.", "list"),
    panel("Recommendation: a proposed action", "Propose a next step and explain its purpose. Ask your preceptor for guidance on the unresolved concern.", "Make your request specific enough for a response. Discuss the rationale with your preceptor; the teaching case is not a stand-alone diagnostic or treatment protocol.", "list"),
    panel("Put SBAR together", "Present the situation, relevant background, assessment, and recommendation in order. Close with a clear request for your preceptor's input.", "Listen to your own handoff as if you were receiving it. Can the preceptor identify the main concern, follow your judgment, and understand what you are asking?", "list")
  ],
  snapps: [
    panel("Lead the learning conversation", "SNAPPS is a learner-led presentation framework. It connects a concise case summary with reasoning, uncertainty, planning, and learning.", "Take an active role in the conversation rather than waiting for every question. SNAPPS gives your preceptor a window into both your reasoning and your learning needs.", "conversation", "learner-clinical-learning-cycle"),
    panel("Summarize: concise findings", "Briefly present the relevant history and examination findings. Retain the details that help explain the clinical concern.", "A useful summary is selective without distorting the case. Ask which details your preceptor needs to understand the possibilities you will discuss next.", "list", "patient-data-to-summary"),
    panel("Narrow: two or three possibilities", "Choose two or three plausible diagnoses to discuss. Connect each possibility to the case evidence.", "Narrowing makes the discussion manageable. It does not mean the remaining possibilities are proven or that important alternatives can be dismissed.", "list", "narrowing-the-differential"),
    panel("Analyze: compare diagnoses", "Compare supporting and conflicting evidence for your possibilities. Explain which findings distinguish them and what remains unresolved.", "Move beyond naming diagnoses to explaining your comparison. For Mr. Jones, describe how pulmonary clues and cardiac risk factors influence your thinking.", "list"),
    panel("Probe: ask about uncertainty", "Ask your preceptor a specific question about a gap in your reasoning. Explain what you understand and where you need guidance.", "A focused question invites a useful teaching conversation. Name the decision or evidence you are uncertain about without treating stable vitals as proof that a concerning cause is excluded.", "conversation", "mentorship-questions"),
    panel("Plan: propose management", "Propose next steps linked to your assessment. Discuss the rationale and unresolved concerns with your preceptor.", "Bring a reasoned proposal to the conversation and be ready to adjust it. Your preceptor can help connect the plan to the patient's needs and the uncertainty in the case.", "list", "plan-next-steps"),
    panel("Select: a learning question", "Choose one focused, case-related question for self-directed learning. Make it specific enough to investigate and bring back to discussion.", "Turn a gap from this encounter into a learning task. For example, you could study how chest-pain characteristics inform a differential, then share what you learned.", "book", "self-directed-learning"),
    panel("Put SNAPPS together", "Summarize, Narrow, Analyze, Probe, Plan, and Select. Keep the presentation concise while making your reasoning and learning needs clear.", "Check that your presentation includes all six moves. The goal is a collaborative conversation where your preceptor can follow your thinking and help you develop it.", "list")
  ]
};

export const historyPanels = expandedConcepts["history-and-context"];
// Distinct existing artwork with a meaning appropriate to each teaching concept.
const visualAssignments = {
 "soap-and-data-types": {3:"assessment-clinical-reasoning",4:"plan-next-steps",5:"patient-data-to-summary"},
 sbar: {0:"mentor-consultation",1:"subjective-patient-report",2:"history-medications-allergies",3:"assessment-clinical-reasoning",4:"plan-next-steps",5:"patient-data-to-summary"},
 snapps: {3:"assessment-clinical-reasoning"}
};
for(const [id,assignments] of Object.entries(visualAssignments)) for(const [index,illustration] of Object.entries(assignments)) expandedConcepts[id][index].illustration=illustration;
export function activityCompletionText(activity) {
 return activity?.id === "starting-the-encounter" ? "You've practiced opening the interview and organizing symptoms. Keep building on those skills in the next activity."
 : `You've practiced ${activity?.title?.toLowerCase() || "this activity"}. Keep building on those skills as you continue your clinical learning.`;
}
export function conceptPanelsFor(step) {
 if(!step) return [];
 if(step.id === "organize-old-carts") return oldCartsPanels;
 if(step.id === "open-the-interview") return [{title:"Start with curiosity.",icon:"conversation",text:"Let the patient tell you what's bothering them in their own words.",rows:[],narration:"An opening question sets the tone for the encounter. Giving the patient room to describe their concern helps you understand their story before exploring the details."}];
 return expandedConcepts[step.id] || [];
}
export function conceptTitle(step, activity) { return exerciseTitle(step,activity); }
export function narrationFor(screen, step, result, panel=0, activity, kind="required") {
 if(screen === "activity-complete") return activityCompletionText(activity);
 if(screen === "introduction") return activity?.id === "starting-the-encounter" ? introductionNarration : activityIntroductions[activity?.id] || "";
 if(screen === "exercise-transition") return "You've practiced inviting the patient's story. Next, we'll explore how OLD CARTS organizes symptom details before you try Mr. Jones's summary.";
 if(screen === "old-carts-teach" || screen === "teach") return conceptPanelsFor(step)[panel]?.narration || "";
 if(screen === "feedback" || screen === "clarify") {
  if(!result?.requestId || result.stepId !== step?.id || activity && result.activityId !== activity.id) return "";
  if(screen === "clarify") return result.kind === "clarify" ? String(result.evaluation.reply || "") : "";
  return result.kind !== "clarify" ? String(result.evaluation.feedback || "") : "";
 }
 if(screen === "practice") return (kind === "practice" ? optionalPracticeNarration : requiredPracticeNarration)[step?.id] || "";
 return "";
}
export function exerciseEntry(step, kind="required") {return kind === "required" && !step?.completed && step?.id !== "open-the-interview" && conceptPanelsFor(step).length ? step.id === "organize-old-carts" ? "old-carts-teach" : "teach" : null;}
export function previousScreen(screen, oldCarts=false) {
 return screen === "introduction" ? "welcome" : screen === "teach" ? "introduction" : screen === "practice" ? oldCarts ? "old-carts-teach" : "teach" : screen === "feedback" ? "practice" : screen === "exercise-transition" ? "feedback" : null;
}
// Speech-only, Module 0-specific phrase override. Visible text and other acronyms stay intact.
export function module0SpeechText(text) {
  return String(text || "").replace(/\bOLD CARTS\b/gi, "old carts").replace(/\bSBAR\b/g, "s-bar");
}
// The hook and backend trim speech input before the backend's 1,200-character limit.
// Do not truncate, summarize, or sequence a returned response.
export function responseAudioTooLong(screen, narration) {
 return (screen === "feedback" || screen === "clarify") && module0SpeechText(narration).trim().length > 1200;
}
import { exerciseTitle, activityIntroductions } from "./presentation";
