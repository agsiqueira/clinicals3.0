const { clerkMiddleware, getAuth } = require("@clerk/express");

// Explicit session-token acceptance excludes machine/API-key identities.
// No development bypass: missing configuration denies personal and paid APIs.
function createStudentAuth(options = {}) {
  let verify;
  return (req, res, next) => {
    if (!options.publishableKey && !process.env.CLERK_PUBLISHABLE_KEY) {
      return res.status(503).json({ error: "Authentication is not configured" });
    }
    if (!verify) {
      const parties = process.env.CLERK_AUTHORIZED_PARTIES;
      verify = clerkMiddleware({
        ...(parties ? { authorizedParties: parties.split(",").map((p) => p.trim()).filter(Boolean) } : {}),
        ...options,
      });
    }
    verify(req, res, (error) => {
      if (error) return res.status(401).json({ error: "Authentication required" });
      const auth = getAuth(req, { acceptsToken: "session_token" });
      if (!auth.isAuthenticated || !auth.userId || !auth.sessionId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      req.studentIdentity = Object.freeze({ clerkUserId: auth.userId, sessionId: auth.sessionId });
      res.setHeader("Cache-Control", "no-store");
      next();
    });
  };
}

module.exports = { createStudentAuth };
