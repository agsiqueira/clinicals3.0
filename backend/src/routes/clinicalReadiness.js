const express = require("express");
const prisma = require("../db/prisma");
const { resolveAuthenticatedUser } = require("../utils/userResolver");
const { createClinicalReadinessService } = require("../services/clinicalReadiness");

function createClinicalReadinessRouter({ service = createClinicalReadinessService({ client: prisma }), resolveUser = resolveAuthenticatedUser } = {}) {
  const router = express.Router();
  function handleError(error, res, next) {
    if (["P2021", "P2022"].includes(error.code)) return res.status(503).json({ error: "MODULE_STORAGE_UNAVAILABLE" });
    if (error.status && error.code) return res.status(error.status).json({ error: error.code });
    next(error);
  }
  router.get("/", async (req, res, next) => {
    try {
      const user = await resolveUser(req);
      res.setHeader("Cache-Control", "no-store");
      res.json(await service.getProgress(user.id));
    } catch (error) { handleError(error, res, next); }
  });
  router.post("/interactions", async (req, res, next) => {
    try {
      const user = await resolveUser(req);
      const result = await service.submit(user.id, req.body);
      res.setHeader("Cache-Control", "no-store");
      res.status(result.status === "saved" ? 200 : 202).json(result);
    } catch (error) { handleError(error, res, next); }
  });
  return router;
}
module.exports = createClinicalReadinessRouter();
module.exports.createClinicalReadinessRouter = createClinicalReadinessRouter;
