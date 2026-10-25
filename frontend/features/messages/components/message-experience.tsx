"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MessageCard from "./message-card";
import styles from "../experience.module.css";

export default function MessageExperience() {
  const root = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const elements = root.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.setAttribute("data-visible", "true");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    elements?.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main ref={root} className={styles.experience} data-paused={paused}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <span className={styles.kicker}><i /> مساحة للكلام اللي إله معنى</span>
          <h1 id="hero-title">كلمة منك.<br /><span>بداية لشي أكبر.</span></h1>
          <p>فكرة بتستاهل تنحكى. سؤال بدو جواب.<br />أو مرحبًا بتفتح باب. خلّي البداية برسالة.</p>
          <div className={styles.heroActions}>
            <a className={styles.primary} href="#write-message">اكتب رسالتك <span aria-hidden="true">↖</span></a>
            <Link className={styles.textLink} href="/my-messages">روح لرسائلي <span aria-hidden="true">←</span></Link>
          </div>
          <div className={styles.heroFoot}><span>كلماتك. مساحتك. بطريقتك.</span><a href="#the-idea" aria-label="اكتشف الفكرة">اكتشف الفكرة <span aria-hidden="true">↓</span></a></div>
        </div>

        <div ref={scene} className={styles.scene} aria-hidden="true" onPointerMove={(event) => {
          if (paused || event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          const rect = event.currentTarget.getBoundingClientRect();
          scene.current?.style.setProperty("--turn-x", `${(event.clientY - rect.top - rect.height / 2) / -45}deg`);
          scene.current?.style.setProperty("--turn-y", `${(event.clientX - rect.left - rect.width / 2) / 45}deg`);
        }} onPointerLeave={() => { scene.current?.style.setProperty("--turn-x", "0deg"); scene.current?.style.setProperty("--turn-y", "0deg"); }}>
          <div className={styles.orbit} /><div className={styles.orbitSmall} />
          <div className={styles.sceneCore}>
            <div className={`${styles.floatingNote} ${styles.noteBack}`}><span>فكرة صغيرة</span><b>يمكن تغيّر كثير.</b><i /><i /><i /></div>
            <div className={`${styles.floatingNote} ${styles.noteFront}`}><div className={styles.noteTop}><span>رسالة.</span><span>↗</span></div><strong>مرحبًا،<br />من هون بنبلّش.</strong><div className={styles.noteLine} /><span className={styles.noteSignature}>من القلب، للكلمة.</span></div>
            <div className={styles.envelope}><span>ر.</span><div className={styles.fold} /></div>
          </div>
          <span className={styles.sceneLabel}>WORDS BECOME CONNECTIONS</span>
          <span className={styles.sparkOne}>✳</span><span className={styles.sparkTwo}>+</span>
          <span className={styles.bubble}>كل شي ببلّش بمرحبًا <span>↗</span></span>
        </div>
        <button className={styles.motionToggle} type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? "تشغيل الحركة ▷" : "إيقاف الحركة Ⅱ"}</button>
      </section>

      <div className={styles.wordStrip} aria-hidden="true"><div>{[0, 1].map((id) => <span key={id}>فكرة تستاهل <b>✳</b> كلمة بتقرّب <b>✳</b> حوار ببلّش <b>✳</b> رسالة بتترك أثر <b>✳</b> </span>)}</div></div>

      <section id="the-idea" className={styles.idea}>
        <div className={styles.sectionIntro} data-reveal><span className={styles.sectionLabel}>01 — الفكرة</span><h2>مش كل كلمة عابرة.<br /><span>في كلمات بتضل.</span></h2><p>عملنا مساحة بسيطة للكلام. عشان تركّز على اللي بدك تحكيه، وتلاقي رسائلك وقت ما ترجع.</p></div>
        <div className={styles.stories}>
          <article className={styles.story} data-reveal>
            <div className={`${styles.storyVisual} ${styles.limeVisual}`} aria-hidden="true"><div className={styles.quotePaper}><span>01 / الفكرة</span><strong>«شو رأيك<br />نبلّش؟»</strong><i>↗</i></div><span className={styles.visualStar}>✳</span></div>
            <div className={styles.storyMeta}><span>مساحة للتعبير</span><span>01</span></div><h3>الفكرة اللي ببالك، إلها مكان.</h3><p>اكتبها بطريقتك. ما بدها مقدّمات كبيرة، أحيانًا سطر واحد بكفّي.</p>
          </article>
          <article className={`${styles.story} ${styles.offsetStory}`} data-reveal>
            <div className={`${styles.storyVisual} ${styles.purpleVisual}`} aria-hidden="true"><div className={styles.miniArchive}><div>رسائلي <span>↗</span></div><p>كلمة من مبارح<i /></p><p>فكرة لليوم<i /></p><p>بداية لبكرا<i /></p></div><span className={styles.archiveCircle} /></div>
            <div className={styles.storyMeta}><span>مساحة للرجوع</span><span>02</span></div><h3>حكايتك ما بتضيع بين السطور.</h3><p>كل رسائلك بمكان واحد، مرتبّة حسب الوقت. دور على كلمة، وارجع للفكرة.</p>
            <Link className={styles.inlineLink} href="/my-messages">اكتشف رسائلي <span aria-hidden="true">↖</span></Link>
          </article>
        </div>
      </section>

      <section className={styles.steps} aria-labelledby="steps-title">
        <div data-reveal><span className={styles.sectionLabel}>02 — ببساطة</span><h2 id="steps-title">من أول مرحبًا،<br />لرسالة <span>إلها مكان.</span></h2></div>
        <div className={styles.stepList}>{[
          ["01", "خلي إلك مساحة", "أنشئ حسابك، أو سجّل دخولك إذا إلنا حكي من قبل.", "/register", "أنشئ حسابًا"],
          ["02", "احكي اللي ببالك", "اكتب فكرتك، سؤالك، أو كلمة حلوة. والباقي كبسة إرسال.", "#write-message", "اكتب رسالة"],
          ["03", "ارجع لكلماتك", "افتح رسائلي، واقرأ رسائلك وابحث بينها بأي وقت.", "/my-messages", "شوف رسائلي"],
        ].map(([number, title, description, href, label]) => <article key={number} className={styles.step} data-reveal><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div><Link href={href} aria-label={label}>↖</Link></article>)}</div>
      </section>

      <section className={styles.writeSection} id="write-message" aria-labelledby="write-title">
        <div className={styles.writeCopy} data-reveal><span className={styles.sectionLabel}>03 — دورك تحكي</span><h2 id="write-title">في شي<br />بدك <span>تحكيه؟</span></h2><p>خلّي أول كلمة منك.<br />رسالتك بتنحفظ بحسابك، وبترجعلها وقت ما بدك.</p><span className={styles.writeArrow} aria-hidden="true">↙</span></div>
        <div className={styles.composer} data-reveal><MessageCard /></div>
      </section>
      <section className={styles.lastWord} data-reveal><p>الحكي الحلو إله بداية.</p><Link href="/my-messages">والبداية <span>رسالة.</span> <b aria-hidden="true">↖</b></Link></section>
    </main>
  );
}
