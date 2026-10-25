"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import PasswordField from "./password-field";
import { useAuth } from "./auth-provider";
import type { AuthMode } from "../types";
import { validateLogin, validateRegistration } from "../validation";
import { loginUser, registerUser } from "../services/auth-api";
import styles from "../auth.module.css";

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const formId = useId();
  const { session, signIn, signOut } = useAuth();
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    setNotice("");
    setIsError(false);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    };
    const confirmation = String(formData.get("confirm-password") ?? "");
    const validationError = isRegister
      ? validateRegistration(payload, confirmation)
      : validateLogin(payload);

    if (validationError) {
      setIsError(true);
      setNotice(validationError);
      return;
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        await registerUser(payload);
        setNotice("تم إنشاء حسابك بنجاح!");
      } else {
        const result = await loginUser({ email: payload.email, password: payload.password });
        signIn(result);
      }
      form.reset();
    } catch (error) {
      setIsError(true);
      setNotice(error instanceof Error ? error.message : "صار خطأ غير متوقع. حاول مرة ثانية.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isRegister && session) {
    return (
      <div className={styles.accountSummary}>
        <p role="status">✓ تم تسجيل الدخول بنجاح!</p>
        <strong>مرحبًا، {session.user.name}</strong>
        <p dir="ltr">{session.user.email}</p>
        <Link className="send-button" href="/">انتقل للرسائل <span aria-hidden="true">↖</span></Link>
        <button type="button" className={styles.signOut} onClick={signOut}>تسجيل الخروج</button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={isLoading}>
      <fieldset className={styles.fieldset} disabled={isLoading}>
      {isRegister && (
        <div className={styles.field}>
          <label htmlFor={`${formId}-name`}>الاسم الكامل</label>
          <input id={`${formId}-name`} name="name" type="text" autoComplete="name" placeholder="شو اسمك؟" required />
        </div>
      )}
      <div className={styles.field}>
        <label htmlFor={`${formId}-email`}>البريد الإلكتروني</label>
        <input id={`${formId}-email`} name="email" type="email" autoComplete="email" placeholder="you@example.com" dir="ltr" required />
      </div>
      <PasswordField name="password" label="كلمة المرور" autoComplete={isRegister ? "new-password" : "current-password"} />
      {isRegister && <PasswordField name="confirm-password" label="تأكيد كلمة المرور" autoComplete="new-password" />}
      {isRegister && <p className={styles.passwordHint}>كلمة المرور 8 أحرف على الأقل، والتأكيد لازم يطابقها.</p>}
      <button className={`send-button ${styles.submit}`} type="submit" disabled={isLoading}>
        <span>{isLoading ? isRegister ? "جاري إنشاء الحساب…" : "جاري تسجيل الدخول…" : isRegister ? "إنشاء حساب" : "تسجيل الدخول"}</span>
        {isLoading ? <span className="loading-spinner" aria-hidden="true" /> : <span aria-hidden="true">↖</span>}
      </button>
      </fieldset>
      <p className={`${styles.notice} ${isError ? styles.error : ""}`} role={isError ? "alert" : "status"} aria-live={isError ? "assertive" : "polite"}>{notice}</p>
    </form>
  );
}
