const express = require("express");
const { listCases, loadCase } = require("../utils/caseLoader");
const { learnerCase } = require("../utils/safeCase");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const cases = await listCases();
    res.json(cases);
  } catch (err) {
    next(err);
  }
});

router.get("/:caseId", async (req, res, next) => {
  try {
    const caseId = req.params.caseId;

    const caseData = await loadCase(req.params.caseId);
    if (!caseData) {
      res.status(404).json({ error: "Case not found" });
      return;
    }
    res.json(learnerCase(caseData));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
