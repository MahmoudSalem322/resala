const express = require("express");
const authController = require("../controllers/auth.controller");
const validateRegister = require("../middleware/validate-register");
const validateLogin = require("../middleware/validate-login");
const requireAuth = require("../middleware/require-auth");

const router = express.Router();

router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);
router.post("/logout", authController.logout);
router.get("/me", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
}, requireAuth, authController.me);

module.exports = router;
