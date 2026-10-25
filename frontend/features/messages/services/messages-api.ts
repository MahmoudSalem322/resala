import type { Message } from "../types";
import { rateLimitMessage } from "@/features/shared/rate-limit";

export class MessageSessionExpiredError extends Error {}

export async function deleteMyMessage(id: number, signal: AbortSignal): Promise<"deleted" | "missing"> {
  const response = await fetch(`http://localhost:3000/api/messages/${id}`, {
    method: "DELETE", credentials: "include", signal,
  });
  if (response.status === 401) throw new MessageSessionExpiredError();
  if (response.status === 429) throw new Error(rateLimitMessage(response));
  if (response.status === 404) return "missing";
  if (response.status !== 204) throw new Error("تعذّر حذف الرسالة. حاول مرة ثانية.");
  return "deleted";
}

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "number" && Number.isSafeInteger(item.id) && item.id > 0 &&
    typeof item.message === "string" && typeof item.created_at === "string" &&
    Number.isFinite(Date.parse(item.created_at));
}

export async function getMyMessages(signal: AbortSignal): Promise<Message[]> {
  const response = await fetch("http://localhost:3000/api/messages", {
    credentials: "include", cache: "no-store", signal,
  });
  if (response.status === 401) throw new MessageSessionExpiredError();
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("تعذّر تحميل رسائلك. حاول مرة ثانية.");
  if (!result || typeof result !== "object" || !("success" in result) || result.success !== true ||
      !("data" in result) || !Array.isArray(result.data) || !result.data.every(isMessage)) {
    throw new Error("وصل رد غير متوقع. حاول تحميل رسائلك مرة ثانية.");
  }
  return result.data;
}
