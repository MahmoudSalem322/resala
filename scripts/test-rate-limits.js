const assert = require("node:assert/strict");
const express = require("express");
const { setTimeout: delay } = require("node:timers/promises");
const { createRateLimiters } = require("../src/middleware/rate-limits");
const validateLogin = require("../src/middleware/validate-login");

async function main() {
  const app = express();
  app.use(express.json());
  const limits = createRateLimiters();
  const shortLimits = createRateLimiters({ messageWindowMs: 1000 });
  app.post("/login", limits.loginIp, validateLogin, limits.loginAccount, (req, res) => {
    res.status(req.body.password === "correct" ? 200 : 401).json({ success: req.body.password === "correct" });
  });
  app.post("/register", limits.register, (req, res) => res.sendStatus(201));
  const authenticate = (req, res, next) => {
    if (!req.get("X-Test-User")) return res.sendStatus(401);
    req.user = { id: req.get("X-Test-User") };
    next();
  };
  app.post("/messages", authenticate, limits.message, (req, res) => res.sendStatus(201));
  app.delete("/messages/:id", authenticate, limits.deleteMessage, (req, res) => res.sendStatus(204));
  app.get("/messages", (req, res) => res.json([]));
  app.post("/short-window", authenticate, shortLimits.message, (req, res) => res.sendStatus(201));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = (path, body = {}, user) => fetch(base + path, {
      method: "POST", headers: { "Content-Type": "application/json", ...(user ? { "X-Test-User": user } : {}) },
      body: JSON.stringify(body),
    });
    const checkBlocked = async (response, maximumWait) => {
      assert.equal(response.status, 429);
      const body = await response.json();
      assert.equal(body.success, false);
      assert.equal(body.code, "RATE_LIMITED");
      assert.equal(Number(response.headers.get("retry-after")), body.retryAfter);
      assert.ok(body.retryAfter > 0 && body.retryAfter <= maximumWait);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.ok(response.headers.get("ratelimit"));
    };
    // Successful logins must not consume the failed-attempt quota.
    for (let index = 0; index < 8; index++) {
      assert.equal((await post("/login", { email: "owner@example.test", password: "correct" })).status, 200);
    }
    for (let index = 0; index < 5; index++) {
      assert.equal((await post("/login", { email: index % 2 ? " OWNER@example.test " : "owner@example.test", password: "wrong" })).status, 401);
    }
    await checkBlocked(await post("/login", { email: "owner@example.test", password: "wrong" }), 900);
    // Changing emails on one IP still hits the general login-IP limit.
    let blockedByIp = false;
    for (let index = 0; index < 21; index++) {
      const response = await post("/login", { email: `other-${index}@example.test`, password: "wrong" });
      if (response.status === 429) { await checkBlocked(response, 900); blockedByIp = true; break; }
      assert.equal(response.status, 401);
    }
    assert.ok(blockedByIp);
    for (let index = 0; index < 5; index++) assert.equal((await post("/register")).status, 201);
    await checkBlocked(await post("/register"), 3600);
    // Anonymous attempts and reads do not consume any account's sending quota.
    for (let index = 0; index < 12; index++) {
      assert.equal((await post("/messages")).status, 401);
      assert.equal((await fetch(base + "/messages")).status, 200);
    }
    for (let index = 0; index < 10; index++) assert.equal((await post("/messages", {}, "1")).status, 201);
    await checkBlocked(await post("/messages", {}, "1"), 60);
    assert.equal((await post("/messages", {}, "2")).status, 201);
    const remove = (user) => fetch(base + "/messages/1", { method: "DELETE", headers: { "X-Test-User": user } });
    for (let index = 0; index < 30; index++) assert.equal((await remove("1")).status, 204);
    await checkBlocked(await remove("1"), 60);
    assert.equal((await remove("2")).status, 204);
    for (let index = 0; index < 10; index++) assert.equal((await post("/short-window", {}, "1")).status, 201);
    await checkBlocked(await post("/short-window", {}, "1"), 1);
    await delay(1100);
    assert.equal((await post("/short-window", {}, "1")).status, 201);
    console.log("Rate-limit checks passed: failed login quotas, email normalization, success exclusion, IP protection, registration, per-account sending, unaffected reads, Retry-After and window expiry.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
