const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const express = require("express");
const { createApp } = require("../src/app");
const casesRouter = require("../src/routes/cases");

const studentRouterModules = [
  "cases", "chat", "grade", "conversations", "voice", "progress",
  "learningPaths", "clinicalPortfolio", "today", "profile",
];

// Exercise the production entry point and app wiring while replacing database/AI
// handlers. Do not run startup case synchronization or connect to learner data.
function loadRunningApp() {
  const loadedRouters = [];
  let app;
  let syncCalls = 0;
  let listenedPort;
  const source = fs.readFileSync(path.join(__dirname, "../src/index.js"), "utf8");

  vm.runInNewContext(source, {
    process: { env: {} },
    console,
    require(moduleName) {
      if (moduleName === "dotenv") return { config() {} };
      if (moduleName === "./app") {
        return {
          createApp(routers) {
            app = createApp(routers);
            // Keep the real app.listen available for HTTP tests below.
            app.listen = Object.assign(
              (port) => { listenedPort = port; },
              { real: app.listen.bind(app) }
            );
            return app;
          },
        };
      }
      if (moduleName === "./utils/caseSync") {
        return { syncAllCases() { syncCalls += 1; return Promise.resolve(0); } };
      }
      const name = moduleName.replace("./routes/", "");
      assert.ok(studentRouterModules.includes(name), `Unexpected startup dependency: ${moduleName}`);
      loadedRouters.push(name);
      if (name === "cases") return casesRouter;
      const router = express.Router();
      router.use((req, res) => res.json({ router: name, path: req.path }));
      return router;
    },
  }, { filename: "src/index.js" });

  return { app, loadedRouters, syncCalls, listenedPort };
}

async function startApp(t) {
  const { app } = loadRunningApp();
  let downstreamFacultyCalls = 0;
  app.use("/api/faculty", (_req, res) => {
    downstreamFacultyCalls += 1;
    res.json({ privateStudentData: true });
  });
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen.real(0, "127.0.0.1", () => resolve(instance));
    instance.once("error", reject);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((err) => err ? reject(err) : resolve());
  }));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    facultyCalls: () => downstreamFacultyCalls,
  };
}

test("production startup loads only student routers without importing faculty services", () => {
  const { loadedRouters, syncCalls, listenedPort } = loadRunningApp();
  assert.deepEqual(loadedRouters, studentRouterModules);
  assert.equal(listenedPort, 3001);
  assert.equal(syncCalls, 0, "The test must not execute startup database writes");
});

test("faculty namespace and every former endpoint return 404 for GET and HEAD", async (t) => {
  const { base, facultyCalls } = await startApp(t);
  const paths = [
    "/api/faculty", "/api/faculty/", "/api/faculty/dashboard",
    "/api/faculty/dashboard/export.csv", "/api/faculty/students/example-student",
    "/api/faculty/students/example-student/export.csv", "/api/faculty/unknown/nested",
    "/API/FACULTY/dashboard", "/api/faculty/dashboard/?format=csv",
  ];
  const identities = [
    {},
    { Authorization: "Bearer irrelevant-session-token", "x-clerk-user-id": "example-user", "x-user-role": "faculty" },
  ];
  for (const headers of identities) {
    for (const method of ["GET", "HEAD"]) {
      for (const endpoint of paths) {
        const response = await fetch(`${base}${endpoint}`, { method, headers });
        assert.equal(response.status, 404, `${method} ${endpoint}`);
        assert.equal(response.headers.get("cache-control"), "no-store");
        if (method === "HEAD") assert.equal(await response.text(), "");
        else assert.deepEqual(await response.json(), { error: "Not found" });
      }
    }
  }
  assert.equal(facultyCalls(), 0);
});

test("faculty denial precedes CORS preflight and parsing malformed or oversized bodies", async (t) => {
  const { base, facultyCalls } = await startApp(t);
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    const response = await fetch(`${base}/api/faculty/dashboard`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: "https://example.test",
        "Access-Control-Request-Method": "GET",
      },
      body: "{malformed",
    });
    assert.equal(response.status, 404, method);
    assert.deepEqual(await response.json(), { error: "Not found" });
  }
  const oversized = await fetch(`${base}/api/faculty/students/example-student`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: "x".repeat(1024 * 1024 + 1) }),
  });
  assert.equal(oversized.status, 404);
  await oversized.text();
  assert.equal(facultyCalls(), 0);
});

test("health, case catalog/detail, student mounts, and student CORS preflight remain available", async (t) => {
  const { base } = await startApp(t);
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });

  const catalog = await fetch(`${base}/api/cases`);
  assert.equal(catalog.status, 200);
  assert.deepEqual((await catalog.json()).map((item) => item.caseId).sort(), ["seasonal_allergies_level1", "uti_level1"]);
  const detail = await fetch(`${base}/api/cases/uti_level1`);
  assert.equal(detail.status, 200);
  const patient = await detail.json();
  assert.equal(patient.case_id, "uti_level1");
  assert.ok(!("hidden_truth" in patient));

  const mounts = [
    ["chat", "/api/chat", "POST"], ["grade", "/api/grade", "POST"],
    ["conversations", "/api/conversations", "POST"], ["voice", "/api/voice/speak", "POST"],
    ["progress", "/api/progress", "GET"], ["learningPaths", "/api/learning-paths", "GET"],
    ["clinicalPortfolio", "/api/clinical-portfolio", "GET"], ["today", "/api/today", "GET"],
    ["profile", "/api/profile/competencies", "GET"],
  ];
  for (const [router, endpoint, method] of mounts) {
    const response = await fetch(`${base}${endpoint}`, { method });
    assert.equal(response.status, 200, endpoint);
    assert.equal((await response.json()).router, router);
  }
  const preflight = await fetch(`${base}/api/conversations`, {
    method: "OPTIONS",
    headers: { Origin: "https://example.test", "Access-Control-Request-Method": "POST" },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
});
