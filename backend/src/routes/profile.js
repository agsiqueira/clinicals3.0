const express = require("express");

const { buildStudentCompetencyProfile } = require("../services/studentCompetencyProfile");
const { getOrCreateUser } = require("../utils/userResolver");

const router = express.Router();

async function resolveUser(req) {
  return require("../utils/userResolver").resolveAuthenticatedUser(req);
}

router.get("/competencies", async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    const profile = await buildStudentCompetencyProfile({ userId: user.id });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
