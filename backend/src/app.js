const express = require("express");
const cors = require("cors");
const { createStudentAuth } = require("./middleware/studentAuth");

// Construct the same HTTP app without starting a server or synchronizing cases.
// Keeping startup separate lets route tests run without database writes.
function createApp(routers, authOptions = {}) {
  const app = express();
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method}`);
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

  const authenticate = createStudentAuth(authOptions);
  app.use("/api/cases", (req, res, next) => {
    if ((req.method === "GET" || req.method === "HEAD") && req.path === "/") return next();
    return authenticate(req, res, next);
  }, routers.casesRouter);
  app.use(["/api/chat", "/api/grade", "/api/conversations", "/api/voice", "/api/progress", "/api/learning-paths", "/api/clinical-portfolio", "/api/today", "/api/profile"], authenticate);
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
    const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
    console.error("Request failed", { status });
    res.status(status).json({ error: status === 404 ? "Not found" : status === 403 ? "Forbidden" : status === 401 ? "Authentication required" : status === 400 ? "Invalid request" : "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
