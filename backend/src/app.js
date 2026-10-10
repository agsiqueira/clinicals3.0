const express = require("express");
const cors = require("cors");

// Construct the same HTTP app without starting a server or synchronizing cases.
// Keeping startup separate lets route tests run without database writes.
function createApp(routers) {
  const app = express();
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Faculty functionality is unavailable in the individual-learner release.
  // Terminate all methods before CORS preflight, body parsing, or data handlers.
  app.use("/api/faculty", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(404).json({ error: "Not found" });
  });

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/cases", routers.casesRouter);
  app.use("/api/chat", routers.chatRouter);
  app.use("/api/grade", routers.gradeRouter);
  app.use("/api/conversations", routers.conversationsRouter);
  app.use("/api/voice", routers.voiceRouter);
  app.use("/api/progress", routers.progressRouter);
  app.use("/api/learning-paths", routers.learningPathsRouter);
  app.use("/api/clinical-portfolio", routers.clinicalPortfolioRouter);
  app.use("/api/today", routers.todayRouter);
  app.use("/api/profile", routers.profileRouter);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
