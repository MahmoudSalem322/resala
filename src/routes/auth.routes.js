const express = require("express");
const authController = require("../controllers/auth.controller");
const validateRegister = require("../middleware/validate-register");
const validateLogin = require("../middleware/validate-login");
const requireAuth = require("../middleware/require-auth");
const limits = require("../config/rate-limits");

const router = express.Router();

router.post("/register", limits.register, validateRegister, authController.register);
router.post("/login", limits.loginIp, validateLogin, limits.loginAccount, authController.login);
router.post("/logout", authController.logout);
router.post("/refresh", limits.refresh, authController.refresh);
router.get("/me", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
}, requireAuth, authController.me);

module.exports = router;
