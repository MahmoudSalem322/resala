"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Message } from "../types";
import styles from "../my-messages.module.css";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useMessagePage } from "../use-message-page";
import DeleteMessageDialog from "./delete-message-dialog";
import EditMessageDialog from "./edit-message-dialog";

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
  return <MessagesView />;
}

function MessagesView() {
  const { query, data, loading, error, changeQuery, reload } = useMessagePage();
  const messages = data?.messages ?? [];
  const pagination = data?.pagination;
  const [selected, setSelected] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

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
          <div className={styles.titleRow}><h2 ref={heading} tabIndex={-1} id="my-messages-title">رسائلي</h2><span className={styles.count}>{pagination?.total ?? "—"}</span></div>
          <span className={styles.sectionNumber} dir="ltr">02 / MY WORDS</span>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <label className={styles.srOnly} htmlFor="message-search">ابحث في الرسائل</label>
            <span aria-hidden="true">⌕</span>
            <input id="message-search" type="search" value={query.q} maxLength={200} onChange={(event) => { setNotice(""); changeQuery({ q: event.target.value }); }} placeholder="دور على كلمة بكل رسائلك…" />
          </div>
          <div className={styles.sort}>
            <label htmlFor="message-sort">الترتيب</label>
            <select id="message-sort" value={query.sort} onChange={(event) => { setNotice(""); changeQuery({ sort: event.target.value === "oldest" ? "oldest" : "newest" }); }}>
              <option value="newest">الأحدث أولًا</option><option value="oldest">الأقدم أولًا</option>
            </select>
          </div>
        </div>
        <p className={styles.results} role="status">{loading ? "جاري تحميل رسائلك…" : pagination ? `${query.q.trim() ? "نتائج البحث" : "عدد الرسائل"}: ${pagination.total}` : "تعذّر تحميل الرسائل"}</p>
        {notice && <p role="status" className={styles.deleteNotice}>{notice}</p>}
        {loading ? <div className={styles.list} aria-busy="true" aria-label="تحميل الرسائل">{[1, 2, 3].map((id) => <div key={id} className={`${styles.card} ${styles.skeletonCard}`} aria-hidden="true"><div className={styles.skeleton} /><div className={styles.skeleton} /><div className={styles.skeleton} /></div>)}</div>
        : error ? <div className={styles.empty}><h3>ما قدرنا نحمّل رسائلك</h3><p role="alert">{error}</p><button className={styles.emptyAction} type="button" onClick={reload}>حاول مرة ثانية</button></div>
        : messages.length ? (
          <ul className={styles.list}>
            {messages.map((item) => (
              <li key={item.id}><article className={styles.card}>
                <div className={styles.cardTop}><span className={styles.noteIcon} aria-hidden="true">↗</span><span>رسالة <bdi>#{String(item.id).padStart(2, "0")}</bdi></span></div>
                <p className={styles.message} dir="auto">{item.message}</p>
                <div className={styles.cardFooter}><time dateTime={item.created_at}>{dateFormat.format(new Date(item.created_at))}</time><span>{timeFormat.format(new Date(item.created_at))}</span></div>
                <div className={styles.cardActions}>
                  <button className={styles.editButton} type="button" aria-label={`تعديل الرسالة رقم ${item.id}`} onClick={() => { setNotice(""); setEditing(item); }}>تعديل <span aria-hidden="true">↗</span></button>
                  <button className={styles.deleteButton} type="button" aria-label={`حذف الرسالة رقم ${item.id}`} onClick={() => { setNotice(""); setSelected(item); }}>حذف الرسالة <span aria-hidden="true">×</span></button>
                </div>
              </article></li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden="true">✉</span>
            <h3>{query.q.trim() ? "ما لقينا رسالة بهاي الكلمة" : "أول حكاية بتبلّش بكلمة"}</h3>
            <p>{query.q.trim() ? "جرّب كلمة ثانية، أو ارجع لكل رسائلك." : "لسه ما عندك رسائل. اكتب أول رسالة وخلي إلها مكان هون."}</p>
            {query.q.trim() ? <button className={styles.emptyAction} type="button" onClick={() => changeQuery({ q: "" })}>عرض كل الرسائل</button> : <Link className={styles.emptyAction} href="/">اكتب أول رسالة ↖</Link>}
          </div>
        )}
        {(loading || pagination && pagination.total > 0) && <nav className={styles.pagination} aria-label="صفحات الرسائل">
          <span>{pagination ? `عرض ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} من ${pagination.total}` : "جاري تحديث الصفحة…"}</span>
          <div><button type="button" disabled={loading || !pagination || pagination.page <= 1} onClick={() => { if (pagination) changeQuery({ page: pagination.page - 1 }); }}>السابق</button><span aria-current="page">{pagination ? `صفحة ${pagination.page} من ${pagination.totalPages}` : "…"}</span><button type="button" disabled={loading || !pagination || pagination.page >= pagination.totalPages} onClick={() => { if (pagination) changeQuery({ page: pagination.page + 1 }); }}>التالي</button></div>
        </nav>}
      </section>
      <p className={styles.endnote}>كلمات بسيطة، بتترك أثر. <span aria-hidden="true">✳</span></p>
      {selected && <DeleteMessageDialog message={selected} onDismiss={() => setSelected(null)} onDeleted={(_id, outcome) => {
        reload();
        setSelected(null);
        setNotice(outcome === "deleted" ? "تم حذف الرسالة." : "الرسالة مش موجودة بالفعل، حدّثنا القائمة.");
        requestAnimationFrame(() => heading.current?.focus());
      }} />}
      {editing && <EditMessageDialog message={editing} onDismiss={() => setEditing(null)} onSaved={() => {
        reload();
        setEditing(null);
        setNotice("تم حفظ تعديل الرسالة.");
        requestAnimationFrame(() => heading.current?.focus());
      }} />}
    </main>
  );
}
