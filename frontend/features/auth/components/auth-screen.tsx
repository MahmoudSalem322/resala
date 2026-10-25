import Link from "next/link";
import AuthForm from "./auth-form";
import type { AuthMode } from "../types";
import styles from "../auth.module.css";

export default function AuthScreen({ mode }: { mode: AuthMode }) {
  const isRegister = mode === "register";

  return (
    <div className={styles.screen}>
      <aside className={styles.welcome}>
        <span className={styles.eyebrow}>رسالة · مساحة للتواصل</span>
        <h1>{isRegister ? "بداية جديدة،" : "أهلًا برجعتك،"}<br /><span>وكلام إله مكان.</span></h1>
        <p>كل فكرة بتستاهل تنحكى.<br />وكل حوار حلو ببلّش بكلمة بسيطة.</p>
        <div className={styles.art} aria-hidden="true">
          <div className={styles.orbit} />
          <div className={styles.avatar}>ر<span>✳</span></div>
          <div className={styles.hello}>مرحبًا فيك <span>↗</span></div>
        </div>
        <div className={styles.welcomeFooter}><span>كلمات بسيطة. تواصل أحلى.</span><span aria-hidden="true">✳</span></div>
      </aside>

      <section className={styles.panel} aria-labelledby={`auth-title-${mode}`}>
        <nav className={styles.tabs} aria-label="الحساب">
          <Link href="/login" aria-current={!isRegister ? "page" : undefined}>تسجيل الدخول</Link>
          <Link href="/register" aria-current={isRegister ? "page" : undefined}>إنشاء حساب</Link>
        </nav>
        <span className={styles.kicker} dir="ltr">{isRegister ? "01 / GET STARTED" : "02 / WELCOME BACK"}</span>
        <h2 id={`auth-title-${mode}`}>{isRegister ? "خلّينا نتعرّف عليك." : "نورت من جديد."}</h2>
        <p className={styles.description}>{isRegister ? "خطوة صغيرة، وبصير إلك حسابك الخاص." : "اكتب بريدك وكلمة المرور للدخول لحسابك."}</p>
        <AuthForm key={mode} mode={mode} />
        <p className={styles.switchLink}>
          {isRegister ? "عندك حساب بالفعل؟ " : "أول مرة هون؟ "}
          <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "سجّل دخولك" : "اعمل حساب جديد"}<span aria-hidden="true"> ↖</span></Link>
        </p>
        <p className={styles.previewNote}>{isRegister ? "بعد إنشاء الحساب، بتقدر تنتقل لتسجيل الدخول." : "الدخول صالح لمدة 15 دقيقة. تحديث الصفحة يحتاج دخول جديد."}</p>
      </section>
    </div>
  );
}
