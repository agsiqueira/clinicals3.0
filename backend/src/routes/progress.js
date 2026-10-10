const express = require("express");
const { getOrCreateUser } = require("../utils/userResolver");
const { syncUserProgress } = require("../services/userProgress");

const router = express.Router();

async function resolveUser(req) {
  return require("../utils/userResolver").resolveAuthenticatedUser(req);
}

router.get("/", async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    const summary = await syncUserProgress(user.id);

    res.json({
      points: summary.totalPoints,
      level: summary.level,
      best_cases: summary.bestCases,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
