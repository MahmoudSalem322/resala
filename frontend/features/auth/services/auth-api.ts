import type { LoginPayload, LoginResult, RegisterPayload } from "../types";
import { rateLimitMessage } from "@/features/shared/rate-limit";
import { apiFetch, publishSession, runSessionChange } from "@/features/shared/session-client";
import { parseSession } from "./session-data";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function postAuth(path: "register" | "login", payload: RegisterPayload | LoginPayload) {
  let response: Response;
  try {
    response = await fetch(`http://localhost:3000/api/auth/${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("تعذّر الاتصال بالسيرفر. حاول مرة ثانية.");
  }

  if (response.status === 429) throw new Error(rateLimitMessage(response));

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
  return runSessionChange(async () => {
    const result = await postAuth("login", payload);
    return parseSession(result.data);
  });
}

export async function getCurrentUser(signal: AbortSignal): Promise<LoginResult | null> {
  const response = await apiFetch("http://localhost:3000/api/auth/me", {
    credentials: "include", cache: "no-store", signal,
  });
  if (response.status === 401) return null;
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok || !isObject(result) || result.success !== true) {
    throw new Error("تعذّر استرجاع جلسة الدخول. حاول مرة ثانية.");
  }
  return parseSession(result.data);
}

export async function logoutUser(): Promise<void> {
  return runSessionChange(async () => {
    const response = await fetch("http://localhost:3000/api/auth/logout", { method: "POST", credentials: "include" });
    if (!response.ok) throw new Error("تعذّر تسجيل الخروج. حاول مرة ثانية.");
    publishSession(null);
  });
}
