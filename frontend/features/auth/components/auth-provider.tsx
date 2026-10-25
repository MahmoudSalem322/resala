"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser, LoginResult } from "../types";

type AuthSession = {
  user: AuthUser;
  accessToken: string;
  expiresAt: number;
};

type AuthContextValue = {
  session: AuthSession | null;
  signIn: (result: LoginResult) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({ children }: { children: ReactNode }) {
  // Memory only: a page refresh intentionally clears the current login.
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => setSession(null), Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session]);

  function signIn(result: LoginResult) {
    setSession({ user: result.user, accessToken: result.accessToken, expiresAt: Date.now() + result.expiresIn * 1000 });
  }

  function signOut() {
    setSession(null);
  }

  return <AuthContext.Provider value={{ session, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
