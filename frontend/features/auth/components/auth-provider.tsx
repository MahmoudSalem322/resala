"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import type { AuthUser, LoginResult } from "../types";
import { getCurrentUser, logoutUser } from "../services/auth-api";
import { SESSION_EVENT, refreshSession } from "@/features/shared/session-client";

type AuthSession = {
  user: AuthUser;
  expiresAt: number;
};

type AuthContextValue = {
  session: AuthSession | null;
  signIn: (result: LoginResult) => void;
  signOut: () => void;
  logoutError: string;
  isRestoring: boolean;
  restoreError: string;
  retryRestore: () => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [logoutError, setLogoutError] = useState("");
  const [isRestoring, setIsRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState("");
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const revision = useRef(0);
  const clearSession = useCallback(() => {
    revision.current++;
    setSession(null);
    setIsRestoring(false);
    setRestoreError("");
    setLogoutError("");
  }, []);

  useEffect(() => {
    function sessionChanged(event: Event) {
      const result = (event as CustomEvent<LoginResult | null>).detail;
      if (!result) { clearSession(); return; }
      revision.current++;
      setSession({ user: result.user, expiresAt: Date.now() + result.expiresIn * 1000 });
      setIsRestoring(false);
      setRestoreError("");
    }
    window.addEventListener(SESSION_EVENT, sessionChanged);
    return () => window.removeEventListener(SESSION_EVENT, sessionChanged);
  }, [clearSession]);

  useEffect(() => {
    const controller = new AbortController();
    const currentRevision = ++revision.current;
    getCurrentUser(controller.signal).then((result) => {
      if (controller.signal.aborted || revision.current !== currentRevision) return;
      setSession(result ? { user: result.user, expiresAt: Date.now() + result.expiresIn * 1000 } : null);
    }).catch(() => {
      if (!controller.signal.aborted && revision.current === currentRevision) {
        setRestoreError("تعذّر التحقق من جلسة الدخول. حاول مرة ثانية.");
      }
    }).finally(() => {
      if (!controller.signal.aborted && revision.current === currentRevision) setIsRestoring(false);
    });
    return () => controller.abort();
  }, [restoreAttempt]);

  function retryRestore() {
    setRestoreError("");
    setIsRestoring(true);
    setRestoreAttempt((attempt) => attempt + 1);
  }

  useEffect(() => {
    if (!session) return;
    let active = true;
    let timer: number;
    function renew() {
      refreshSession().catch(() => {
        if (!active) return;
        setRestoreError("تعذّر تجديد الجلسة. تحقق من الاتصال وحاول مرة ثانية.");
        timer = window.setTimeout(renew, 30_000);
      });
    }
    timer = window.setTimeout(renew, Math.max(0, session.expiresAt - Date.now() + 100));
    return () => { active = false; window.clearTimeout(timer); };
  }, [session]);

  function signIn(result: LoginResult) {
    revision.current++;
    setIsRestoring(false);
    setRestoreError("");
    setLogoutError("");
    setSession({ user: result.user, expiresAt: Date.now() + result.expiresIn * 1000 });
  }

  async function signOut() {
    setLogoutError("");
    try {
      await logoutUser();
      revision.current++;
      setIsRestoring(false);
      setRestoreError("");
      setSession(null);
    } catch {
      setLogoutError("تعذّر تسجيل الخروج. حاول مرة ثانية.");
    }
  }

  return <AuthContext.Provider value={{ session, signIn, signOut, logoutError, isRestoring, restoreError, retryRestore, clearSession }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
