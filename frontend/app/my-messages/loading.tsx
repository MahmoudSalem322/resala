import SiteHeader from "@/components/layout/site-header";
import SiteFooter from "@/components/layout/site-footer";
import styles from "@/features/messages/my-messages.module.css";

export default function Loading() {
  return <div className="site-shell"><SiteHeader /><main className={styles.page} aria-busy="true">
    <p role="status">جاري تحميل الرسائل…</p>
    <div className={styles.list} aria-hidden="true">{[1, 2, 3].map((id) => <div key={id} className={`${styles.card} ${styles.skeletonCard}`}><div className={styles.skeleton} /><div className={styles.skeleton} /><div className={styles.skeleton} /></div>)}</div>
  </main><SiteFooter /></div>;
}
