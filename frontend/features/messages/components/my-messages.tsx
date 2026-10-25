"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Message } from "../types";
import styles from "../my-messages.module.css";
import { useAuth } from "@/features/auth/components/auth-provider";
import { getMyMessages, MessageSessionExpiredError } from "../services/messages-api";
import DeleteMessageDialog from "./delete-message-dialog";

const dateFormat = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Hebron" });
const timeFormat = new Intl.DateTimeFormat("ar", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Hebron" });

function MessagesNotice({ children }: { children: ReactNode }) {
  return <main className={styles.page}><div className={styles.heading}><h1>رسائلي</h1></div><div className={styles.empty}>{children}</div></main>;
}

export default function MyMessages() {
  const { session, isRestoring, restoreError, retryRestore } = useAuth();
  if (isRestoring) return <MessagesNotice><p role="status">جاري التحقق من الدخول…</p></MessagesNotice>;
  if (restoreError) return <MessagesNotice><p role="alert">{restoreError}</p><button type="button" className={styles.emptyAction} onClick={retryRestore}>إعادة التحقق من الدخول</button></MessagesNotice>;
  if (!session) return <MessagesNotice>
    <span className={styles.emptyIcon} aria-hidden="true">✉</span>
    <h2>رسائلك إلك وحدك</h2><p>سجّل دخولك عشان تشوف رسائلك.</p>
    <Link className={styles.emptyAction} href="/login">تسجيل الدخول</Link>
  </MessagesNotice>;
  return <AccountMessages key={session.user.id} />;
}

function AccountMessages() {
  const { clearSession } = useAuth();
  const [result, setResult] = useState<{ status: "loading" } | { status: "error"; message: string } | { status: "success"; messages: Message[] }>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getMyMessages(controller.signal).then((messages) => {
      if (!controller.signal.aborted) setResult({ status: "success", messages });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (error instanceof MessageSessionExpiredError) { clearSession(); return; }
      setResult({ status: "error", message: error instanceof Error && error.message.startsWith("وصل رد") ? error.message : "تعذّر تحميل رسائلك. تأكد من الاتصال وحاول مرة ثانية." });
    });
    return () => controller.abort();
  }, [attempt, clearSession]);

  if (result.status === "loading") return <MessagesNotice>
    <p role="status">جاري تحميل رسائلك…</p>
    <div className={styles.list} aria-hidden="true">{[1, 2, 3].map((id) => <div key={id} className={`${styles.card} ${styles.skeletonCard}`}><div className={styles.skeleton} /><div className={styles.skeleton} /><div className={styles.skeleton} /></div>)}</div>
  </MessagesNotice>;
  if (result.status === "error") return <MessagesNotice><h2>ما قدرنا نحمّل رسائلك</h2><p role="alert">{result.message}</p><button className={styles.emptyAction} type="button" onClick={() => { setResult({ status: "loading" }); setAttempt((value) => value + 1); }}>حاول مرة ثانية</button></MessagesNotice>;
  return <MessagesView messages={result.messages} onDelete={(id) => setResult((current) =>
    current.status === "success" ? { ...current, messages: current.messages.filter((message) => message.id !== id) } : current)} />;
}

function MessagesView({ messages, onDelete }: { messages: Message[]; onDelete: (id: number) => void }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<Message | null>(null);
  const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const filtered = messages.filter((item) => item.message.includes(search.trim())).sort((a, b) =>
    sort === "newest" ? Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id : Date.parse(a.created_at) - Date.parse(b.created_at) || a.id - b.id);

  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <div>
          <span className="eyebrow">● مساحة لكلماتك</span>
          <h1>كل رسالة، <span>إلها حكاية.</span></h1>
          <p className={styles.description}>هون بتلاقي الكلمات اللي تركتها، وبدايات الحوارات اللي بلّشتها.</p>
        </div>
        <Link className={styles.compose} href="/">اكتب رسالة جديدة <span aria-hidden="true">↖</span></Link>
      </div>
      <section className={styles.collection} aria-labelledby="my-messages-title">
        <div className={styles.collectionHeading}>
          <div className={styles.titleRow}><h2 ref={heading} tabIndex={-1} id="my-messages-title">رسائلي</h2><span className={styles.count}>{messages.length}</span></div>
          <span className={styles.sectionNumber} dir="ltr">02 / MY WORDS</span>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <label className={styles.srOnly} htmlFor="message-search">ابحث في الرسائل</label>
            <span aria-hidden="true">⌕</span>
            <input id="message-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="دور على كلمة برسائلك…" />
          </div>
          <div className={styles.sort}>
            <label htmlFor="message-sort">الترتيب</label>
            <select id="message-sort" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">الأحدث أولًا</option><option value="oldest">الأقدم أولًا</option>
            </select>
          </div>
        </div>
        <p className={styles.results} role="status">{search.trim() ? `نتائج البحث: ${filtered.length}` : `عدد الرسائل: ${messages.length}`}</p>
        {notice && <p role="status" className={styles.deleteNotice}>{notice}</p>}
        {filtered.length ? (
          <ul className={styles.list}>
            {filtered.map((item) => (
              <li key={item.id}><article className={styles.card}>
                <div className={styles.cardTop}><span className={styles.noteIcon} aria-hidden="true">↗</span><span>رسالة <bdi>#{String(item.id).padStart(2, "0")}</bdi></span></div>
                <p className={styles.message} dir="auto">{item.message}</p>
                <div className={styles.cardFooter}><time dateTime={item.created_at}>{dateFormat.format(new Date(item.created_at))}</time><span>{timeFormat.format(new Date(item.created_at))}</span></div>
                <button className={styles.deleteButton} type="button" aria-label={`حذف الرسالة رقم ${item.id}`} onClick={() => { setNotice(""); setSelected(item); }}>حذف الرسالة <span aria-hidden="true">×</span></button>
              </article></li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden="true">✉</span>
            <h3>{messages.length ? "ما لقينا رسالة بهاي الكلمة" : "أول حكاية بتبلّش بكلمة"}</h3>
            <p>{messages.length ? "جرّب كلمة ثانية، أو ارجع لكل رسائلك." : "لسه ما عندك رسائل. اكتب أول رسالة وخلي إلها مكان هون."}</p>
            {messages.length ? <button className={styles.emptyAction} type="button" onClick={() => setSearch("")}>عرض كل الرسائل</button> : <Link className={styles.emptyAction} href="/">اكتب أول رسالة ↖</Link>}
          </div>
        )}
      </section>
      <p className={styles.endnote}>كلمات بسيطة، بتترك أثر. <span aria-hidden="true">✳</span></p>
      {selected && <DeleteMessageDialog message={selected} onDismiss={() => setSelected(null)} onDeleted={(id, outcome) => {
        onDelete(id);
        setSelected(null);
        setNotice(outcome === "deleted" ? "تم حذف الرسالة." : "الرسالة مش موجودة بالفعل، حدّثنا القائمة.");
        requestAnimationFrame(() => heading.current?.focus());
      }} />}
    </main>
  );
}
