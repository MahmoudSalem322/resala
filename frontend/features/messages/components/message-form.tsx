"use client";

import { useState, type FormEvent } from "react";
import MessageFeedback from "./message-feedback";
import Link from "next/link";
import { useAuth } from "@/features/auth/components/auth-provider";
import { rateLimitMessage } from "@/features/shared/rate-limit";
import { apiFetch } from "@/features/shared/session-client";

export default function MessageForm() {
  const { session, clearSession, isRestoring } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading || !session) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      message: formData.get("message"),
    };

    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await apiFetch("http://localhost:3000/api/messages", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        setFeedback({ type: "error", message: rateLimitMessage(response) });
        return;
      }
      if (response.status === 401) {
        clearSession();
        setFeedback({ type: "error", message: "انتهت جلسة الدخول. سجّل دخولك من جديد." });
        return;
      }
      const result = await response.json();
      if (!response.ok || result.success !== true) {
        setFeedback({
          type: "error",
          message: typeof result.message === "string"
            ? result.message
            : "تعذّر حفظ الرسالة، جرّب مرة ثانية.",
        });
        return;
      }

      setFeedback({ type: "success", message: "تم حفظ رسالتك بنجاح!" });
      form.reset();
    } catch {
      setFeedback({
        type: "error",
        message: "تعذّر الاتصال بالسيرفر. تأكد من الاتصال وحاول مرة ثانية.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isLoading}>
      {isRestoring ? <p role="status">جاري التحقق من الدخول…</p> : session
        ? <p>ترسل باسم {session.user.name}</p>
        : <p>لإرسال رسالة، <Link href="/login">سجّل دخولك</Link> أو <Link href="/register">أنشئ حسابًا</Link>.</p>}
      <div className="field">
        <label htmlFor="message">رسالتك</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="خذ راحتك، احكي اللي ببالك…"
          disabled={isLoading || !session}
          required
          maxLength={5000}
        />
      </div>
      <button className="send-button" type="submit" disabled={isLoading || !session}>
        <span>{isLoading ? "جاري الإرسال…" : "إرسال الرسالة"}</span>
        {isLoading
          ? <span className="loading-spinner" aria-hidden="true" />
          : <span aria-hidden="true">↖</span>}
      </button>
      {feedback && <MessageFeedback type={feedback.type} message={feedback.message} />}
    </form>
  );
}
