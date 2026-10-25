const userRepository = require("../repositories/user.repository");
const { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } = require("../utils/password");
const { createAccessToken } = require("../utils/token");
const jwtConfig = require("../config/jwt");

function duplicateEmailError() {
  const error = new Error("Email already registered.");
  error.code = "EMAIL_ALREADY_EXISTS";
  error.status = 409;
  error.publicMessage = "البريد الإلكتروني مستخدم بالفعل.";
  return error;
}

async function register({ name, email, password }) {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw duplicateEmailError();
  }

  const passwordHash = await hashPassword(password);

  try {
    return await userRepository.createUser({ name, email, passwordHash });
  } catch (error) {
    // Two requests can pass the lookup together; the unique index is the final check.
    if (error.code === "23505" && error.constraint === "users_email_unique") {
      throw duplicateEmailError();
    }
    throw error;
  }
}

async function login({ email, password }) {
  const user = await userRepository.findForAuthentication(email);
  const matches = await verifyPassword(password, user ? user.password_hash : DUMMY_PASSWORD_HASH);

  if (!user || !matches) {
    const error = new Error("Invalid login credentials.");
    error.code = "INVALID_CREDENTIALS";
    error.status = 401;
    error.publicMessage = "الإيميل أو كلمة المرور غير صحيحة.";
    throw error;
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
    accessToken: createAccessToken(user.id),
    tokenType: "Bearer",
    expiresIn: jwtConfig.expiresIn,
  };
}

module.exports = { register, login };
