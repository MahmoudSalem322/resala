"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";

export default function AuthNavigation() {
  const { session, signOut } = useAuth();

  return (
    <nav className="site-nav" aria-label="التنقل الرئيسي">
      <Link href="/">الرسائل</Link>
      {session ? (
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
