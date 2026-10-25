"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";

export default function AuthNavigation() {
  const { session, signOut, logoutError, isRestoring, restoreError, retryRestore } = useAuth();

  return (
    <nav className="site-nav" aria-label="التنقل الرئيسي">
      {logoutError && <span role="alert">{logoutError}</span>}
      {restoreError && <span role="alert">{restoreError} <button type="button" onClick={retryRestore}>إعادة المحاولة</button></span>}
      <Link href="/">الرسائل</Link>
      {isRestoring ? <span role="status">جاري التحقق من الدخول…</span> : session ? (
        <>
          <span className="nav-user" title={session.user.name}>مرحبًا، {session.user.name}</span>
          <button className="nav-register nav-logout" type="button" onClick={signOut}>خروج</button>
        </>
      ) : (
        <>
          <Link href="/login">دخول</Link>
          <Link className="nav-register" href="/register">إنشاء حساب</Link>
        </>
      )}
    </nav>
  );
}
