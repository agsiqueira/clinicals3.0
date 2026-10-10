const express = require("express");

const { buildClinicalPortfolio } = require("../services/clinicalPortfolio");
const { getOrCreateUser } = require("../utils/userResolver");

const router = express.Router();

async function resolveUser(req) {
  return require("../utils/userResolver").resolveAuthenticatedUser(req);
}

router.get("/", async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    const portfolio = await buildClinicalPortfolio({ userId: user.id });

    res.json(portfolio);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
