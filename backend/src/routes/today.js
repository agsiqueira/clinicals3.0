const express = require("express");

const { buildToday } = require("../services/today");
const { getOrCreateUser } = require("../utils/userResolver");

const router = express.Router();

async function resolveUser(req) {
  return require("../utils/userResolver").resolveAuthenticatedUser(req);
}

router.get("/", async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    const today = await buildToday({ userId: user.id });

    res.json(today);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
