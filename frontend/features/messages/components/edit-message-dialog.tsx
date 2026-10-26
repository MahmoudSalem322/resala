"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { updateMyMessage, MessageSessionExpiredError } from "../services/messages-api";
import type { Message } from "../types";
import styles from "../my-messages.module.css";

export default function EditMessageDialog({ message, onDismiss, onSaved }: {
  message: Message;
  onDismiss: () => void;
  onSaved: (message: Message) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [draft, setDraft] = useState(message.message);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { clearSession } = useAuth();
  const trimmed = draft.trim();
  const canSave = trimmed.length > 0 && trimmed.length <= 5000 && trimmed !== message.message;

  useEffect(() => {
    const element = dialog.current;
    const abort = new AbortController();
    controller.current = abort;
    element?.showModal();
    textarea.current?.focus();
    return () => { abort.abort(); element?.close(); };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canSave || !controller.current) return;
    const signal = controller.current.signal;
    setBusy(true);
    setError("");
    try {
      const updated = await updateMyMessage(message.id, trimmed, signal);
      if (!signal.aborted) onSaved(updated);
    } catch (failure) {
      if (signal.aborted) return;
      if (failure instanceof MessageSessionExpiredError) { clearSession(); return; }
      setError(failure instanceof Error && !(failure instanceof TypeError) ? failure.message : "تعذّر الاتصال بالسيرفر. تعديلك لسه هون، حاول مرة ثانية.");
      setBusy(false);
    }
  }

  return <dialog ref={dialog} className={`${styles.deleteDialog} ${styles.editDialog}`} aria-labelledby="edit-message-title" aria-describedby="edit-message-description" onCancel={(event) => { event.preventDefault(); if (!busy) onDismiss(); }}>
    <span className={styles.editKicker}>تعديل رسالة</span>
    <h2 id="edit-message-title">خلّي الفكرة أوضح.</h2>
    <p id="edit-message-description">عدّل النص، واحفظه لما يصير مثل ما بدك.</p>
    <form onSubmit={save} aria-busy={busy}>
      <label htmlFor="edit-message-text">نص الرسالة</label>
      <textarea ref={textarea} id="edit-message-text" value={draft} onChange={(event) => setDraft(event.target.value)} required maxLength={5000} rows={7} disabled={busy} aria-describedby="edit-message-count" dir="auto" />
      <div id="edit-message-count" className={styles.editCount}><span>{!trimmed ? "الرسالة ما بتكون فاضية." : "حدّث كلماتك بطريقتك."}</span><bdi>{draft.length} / 5000</bdi></div>
      {error && <p role="alert" className={styles.deleteError}>{error}</p>}
      <div className={styles.dialogActions}>
        <button type="button" className={styles.cancelDelete} onClick={onDismiss} disabled={busy}>تراجع</button>
        <button type="submit" className={styles.saveEdit} disabled={busy || !canSave}>{busy ? "جاري الحفظ…" : "حفظ التعديل"}</button>
      </div>
      {busy && <p role="status" className={styles.editStatus}>جاري حفظ التعديل…</p>}
    </form>
  </dialog>;
}
