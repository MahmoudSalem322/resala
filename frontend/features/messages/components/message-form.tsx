"use client";

import { useState, type FormEvent } from "react";
import MessageFeedback from "./message-feedback";

export default function MessageForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: formData.get("name"),
      message: formData.get("message"),
    };

    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("http://localhost:3000/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

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
      <div className="field">
        <label htmlFor="name">اسمك <span>كيف نناديك؟</span></label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="اكتب اسمك هون"
          autoComplete="name"
          disabled={isLoading}
        />
      </div>
      <div className="field">
        <label htmlFor="message">رسالتك</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="خذ راحتك، احكي اللي ببالك…"
          disabled={isLoading}
        />
      </div>
      <button className="send-button" type="submit" disabled={isLoading}>
        <span>{isLoading ? "جاري الإرسال…" : "إرسال الرسالة"}</span>
        {isLoading
          ? <span className="loading-spinner" aria-hidden="true" />
          : <span aria-hidden="true">↖</span>}
      </button>
      {feedback && <MessageFeedback type={feedback.type} message={feedback.message} />}
    </form>
  );
}
