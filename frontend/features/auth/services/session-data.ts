import type { LoginResult } from "../types";

export function parseSession(data: unknown): LoginResult {
  if (!data || typeof data !== "object" || !("user" in data) || !("expiresIn" in data)) throw new Error("وصل رد دخول غير متوقع.");
  const user = data.user;
  if (!user || typeof user !== "object" || !("id" in user) || typeof user.id !== "number" || !Number.isSafeInteger(user.id) || user.id <= 0 ||
      !("name" in user) || typeof user.name !== "string" || !("email" in user) || typeof user.email !== "string" ||
      !("created_at" in user) || typeof user.created_at !== "string" || !Number.isFinite(Date.parse(user.created_at)) ||
      typeof data.expiresIn !== "number" || !Number.isFinite(data.expiresIn) || data.expiresIn <= 0) throw new Error("وصل رد دخول غير متوقع.");
  return { user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at }, expiresIn: data.expiresIn };
}
