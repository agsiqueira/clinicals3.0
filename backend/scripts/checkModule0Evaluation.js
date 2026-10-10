// Fixed synthetic answer only. No Prisma import, database access or progress writes.
require("dotenv").config({ quiet: true });
const catalog = require("../src/content/clinicalReadiness.json");
const { evaluateLesson } = require("../src/utils/clinicalReadinessTeaching");
const { failureCode } = require("../src/utils/lessonEvaluationErrors");

async function main() {
  if (!process.env.NAVIGATOR_API_KEY || !process.env.NAVIGATOR_MODEL) {
    console.error(JSON.stringify({ result: "not_run", code: "UPSTREAM_CONFIGURATION" }));
    process.exitCode = 1;return;
  }
  try {
    const result = await evaluateLesson({
      catalog, step: catalog.activities[0].steps[0], kind: "required",
      response: "What brings you in today?",
    });
    console.log(JSON.stringify({ result: "validated", label: result.label, evidenceValidated: true }));
  } catch (error) {
    console.error(JSON.stringify({ result: "failed", code: failureCode(error) }));
    process.exitCode = 1;
  }
}
main();
