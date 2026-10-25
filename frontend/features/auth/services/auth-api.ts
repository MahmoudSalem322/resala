import type { LoginPayload, LoginResult, RegisterPayload } from "../types";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function postAuth(path: "register" | "login", payload: RegisterPayload | LoginPayload) {
  let response: Response;
  try {
    response = await fetch(`http://localhost:3000/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("تعذّر الاتصال بالسيرفر. حاول مرة ثانية.");
  }

  if (response.status === 404) {
    throw new Error("خدمة الحسابات غير متاحة حاليًا. حاول لاحقًا.");
  }

  const result: unknown = await response.json().catch(() => null);
  if (!isObject(result)) {
    throw new Error("وصل رد غير متوقع من السيرفر. حاول لاحقًا.");
  }

  if (!response.ok || result.success !== true) {
    const message = "message" in result && typeof result.message === "string"
      ? result.message
      : "تعذّر إكمال الطلب. حاول مرة ثانية.";
    throw new Error(message);
  }

  return result;
}

export async function registerUser(payload: RegisterPayload): Promise<void> {
  await postAuth("register", payload);
}

export async function loginUser(payload: LoginPayload): Promise<LoginResult> {
  const result = await postAuth("login", payload);
  const data = result.data;
  const user = isObject(data) ? data.user : null;

  if (
    !isObject(data) || !isObject(user) ||
    typeof data.accessToken !== "string" || !data.accessToken ||
    data.tokenType !== "Bearer" || typeof data.expiresIn !== "number" ||
    !Number.isFinite(data.expiresIn) || data.expiresIn <= 0 ||
    typeof user.id !== "number" || !Number.isInteger(user.id) || user.id <= 0 ||
    typeof user.name !== "string" || typeof user.email !== "string" ||
    typeof user.created_at !== "string"
  ) {
    throw new Error("وصل رد دخول غير متوقع من السيرفر. حاول مرة ثانية.");
  }

  return {
    user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
    accessToken: data.accessToken,
    tokenType: "Bearer",
    expiresIn: data.expiresIn,
  };
}
