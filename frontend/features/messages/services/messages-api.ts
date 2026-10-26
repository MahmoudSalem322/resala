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

export async function updateMyMessage(id: number, message: string, signal: AbortSignal): Promise<Message> {
  const response = await fetch(`http://localhost:3000/api/messages/${id}`, {
    method: "PATCH", credentials: "include", signal,
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }),
  });
  if (response.status === 401) throw new MessageSessionExpiredError();
  if (response.status === 429) throw new Error(rateLimitMessage(response));
  if (response.status === 404) throw new Error("الرسالة غير موجودة. انسخ النص قبل إغلاق النافذة عشان ما يضيع تعديلك.");
  if (response.status === 400) throw new Error("اكتب رسالة بين حرف واحد و5000 حرف.");
  if (!response.ok) throw new Error("تعذّر حفظ التعديل. حاول مرة ثانية.");
  const result: unknown = await response.json().catch(() => null);
  if (!result || typeof result !== "object" || !("success" in result) || result.success !== true ||
      !("data" in result) || !isMessage(result.data) || result.data.id !== id) {
    throw new Error("وصل رد غير متوقع. تأكد من رسائلك قبل إعادة المحاولة.");
  }
  return result.data;
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
