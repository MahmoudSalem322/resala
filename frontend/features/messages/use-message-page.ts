"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { getMyMessages, MessageSessionExpiredError } from "./services/messages-api";
import type { MessagePage, MessageQuery } from "./types";

export function useMessagePage() {
  const { clearSession } = useAuth();
  const [query, setQuery] = useState<MessageQuery>({ page: 1, limit: 12, sort: "newest", q: "" });
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([query, attempt]);
  const [result, setResult] = useState<{ key: string; data: MessagePage; error?: never } | { key: string; error: string; data?: never } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Debounce typing and cancel earlier requests so stale results cannot replace a newer search.
    const timer = window.setTimeout(() => {
      getMyMessages(query, controller.signal).then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      }).catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof MessageSessionExpiredError) { clearSession(); return; }
        setResult({ key, error: error instanceof Error && error.message.startsWith("وصل رد") ? error.message : "تعذّر تحميل رسائلك. تأكد من الاتصال وحاول مرة ثانية." });
      });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, key, clearSession]);

  return {
    query,
    data: result?.key === key ? result.data : undefined,
    error: result?.key === key ? result.error : undefined,
    loading: result?.key !== key,
    changeQuery: (change: Partial<MessageQuery>) => setQuery((current) => ({ ...current, ...change, page: change.page ?? 1 })),
    reload: () => setAttempt((value) => value + 1),
  };
}
