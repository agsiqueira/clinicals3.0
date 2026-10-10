const dotenv = require("dotenv");
const { createApp } = require("./app");

const casesRouter = require("./routes/cases");
const chatRouter = require("./routes/chat");
const gradeRouter = require("./routes/grade");
const conversationsRouter = require("./routes/conversations");
const voiceRouter = require("./routes/voice");
const progressRouter = require("./routes/progress");
const learningPathsRouter = require("./routes/learningPaths");
const clinicalPortfolioRouter = require("./routes/clinicalPortfolio");
const todayRouter = require("./routes/today");
const profileRouter = require("./routes/profile");
const { syncAllCases } = require("./utils/caseSync");

dotenv.config();

const app = createApp({
  casesRouter,
  chatRouter,
  gradeRouter,
  conversationsRouter,
  voiceRouter,
  progressRouter,
  learningPathsRouter,
  clinicalPortfolioRouter,
  todayRouter,
  profileRouter,
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Clinicals backend listening on port ${port}`);
  syncAllCases()
    .then((count) => console.log(`Synced ${count} cases into database`))
    .catch((err) => console.error("Case sync failed:", err));
});
