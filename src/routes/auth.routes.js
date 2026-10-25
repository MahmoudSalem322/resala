const express = require("express");
const authController = require("../controllers/auth.controller");
const validateRegister = require("../middleware/validate-register");
const validateLogin = require("../middleware/validate-login");

const router = express.Router();

router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);

module.exports = router;
