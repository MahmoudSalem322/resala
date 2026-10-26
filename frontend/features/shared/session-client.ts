import type { LoginResult } from "@/features/auth/types";
import { parseSession } from "@/features/auth/services/session-data";
import { rateLimitMessage } from "./rate-limit";

export const SESSION_EVENT = "resala:session";
let refreshPromise: Promise<LoginResult | null> | null = null;
let queue: Promise<unknown> = Promise.resolve();
let epoch = 0;

function withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  const task = queue.then(async (): Promise<T> => {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return await navigator.locks.request("resala-session", async () => await operation());
    }
    return await operation();
  });
  queue = task.catch(() => undefined);
  return task;
}

export function runSessionChange<T>(operation: () => Promise<T>): Promise<T> {
  epoch++;
  return withSessionLock(operation);
}

export function publishSession(result: LoginResult | null) {
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: result }));
}

async function sessionResponse(response: Response): Promise<LoginResult | null> {
  if (response.status === 401) return null;
  if (response.status === 429) throw new Error(rateLimitMessage(response));
  if (!response.ok) throw new Error("تعذّر تجديد جلسة الدخول. حاول مرة ثانية.");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("success" in body) || body.success !== true || !("data" in body)) throw new Error("وصل رد دخول غير متوقع.");
  return parseSession(body.data);
}

export function refreshSession(): Promise<LoginResult | null> {
  if (refreshPromise) return refreshPromise;
  const version = epoch;
  refreshPromise = withSessionLock(async () => {
    if (version !== epoch) return null;
    // Another tab may have refreshed while this tab was waiting for the lock.
    let response = await fetch("http://localhost:3000/api/auth/me", { credentials: "include", cache: "no-store" });
    if (response.status === 401) {
      response = await fetch("http://localhost:3000/api/auth/refresh", { method: "POST", credentials: "include", cache: "no-store" });
      if (response.status === 409) {
        // Fallback for simultaneous tabs on browsers without the Web Locks API.
        await new Promise((resolve) => window.setTimeout(resolve, 150));
        response = await fetch("http://localhost:3000/api/auth/me", { credentials: "include", cache: "no-store" });
        if (response.status === 401) throw new Error("جاري تجديد الجلسة. حاول مرة ثانية.");
      }
    }
    const result = await sessionResponse(response);
    if (version === epoch) publishSession(result);
    return result;
  }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const version = epoch;
  const response = await fetch(url, { ...options, credentials: "include" });
  if (version !== epoch) throw new DOMException("Session changed", "AbortError");
  if (response.status !== 401) return response;
  const renewed = await refreshSession();
  if (options.signal?.aborted || version !== epoch) throw new DOMException("Request cancelled", "AbortError");
  if (!renewed) return response;
  // Exactly one retry; authorization is checked again before any write.
  return fetch(url, { ...options, credentials: "include" });
}
