"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { deleteMyMessage, MessageSessionExpiredError } from "../services/messages-api";
import type { Message } from "../types";
import styles from "../my-messages.module.css";

export default function DeleteMessageDialog({ message, onDismiss, onDeleted }: {
  message: Message;
  onDismiss: () => void;
  onDeleted: (id: number, outcome: "deleted" | "missing") => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { clearSession } = useAuth();

  useEffect(() => {
    const element = dialog.current;
    const abort = new AbortController();
    controller.current = abort;
    element?.showModal();
    cancelButton.current?.focus();
    return () => { abort.abort(); element?.close(); };
  }, []);

  async function confirmDelete() {
    if (busy || !controller.current) return;
    const signal = controller.current.signal;
    setBusy(true);
    setError("");
    try {
      const outcome = await deleteMyMessage(message.id, signal);
      if (!signal.aborted) onDeleted(message.id, outcome);
    } catch (failure) {
      if (signal.aborted) return;
      if (failure instanceof MessageSessionExpiredError) { clearSession(); return; }
      setError(failure instanceof Error && !(failure instanceof TypeError) ? failure.message : "تعذّر الاتصال بالسيرفر. حاول مرة ثانية.");
      setBusy(false);
    }
  }

  return <dialog ref={dialog} className={styles.deleteDialog} aria-labelledby="delete-message-title" aria-describedby="delete-message-description" onCancel={(event) => { event.preventDefault(); if (!busy) onDismiss(); }}>
    <span className={styles.deleteKicker}>حذف رسالة</span>
    <h2 id="delete-message-title">متأكد بدك تحذفها؟</h2>
    <p id="delete-message-description">رح تنحذف الرسالة نهائيًا من حسابك، وما بنقدر نرجّعها.</p>
    <blockquote className={styles.deletePreview} dir="auto">{message.message}</blockquote>
    {error && <p role="alert" className={styles.deleteError}>{error}</p>}
    <div className={styles.dialogActions}>
      <button ref={cancelButton} type="button" className={styles.cancelDelete} onClick={onDismiss} disabled={busy}>تراجع</button>
      <button type="button" className={styles.confirmDelete} onClick={confirmDelete} disabled={busy}>{busy ? "جاري الحذف…" : "احذف الرسالة"}</button>
    </div>
    {busy && <p role="status">جاري حذف الرسالة…</p>}
  </dialog>;
}
