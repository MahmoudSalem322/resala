export default function MessageIntro() {
  return (
    <section className="intro" aria-labelledby="page-title">
      <span className="eyebrow">● مساحة صغيرة للكلام</span>
      <h1 id="page-title">
        كل تواصل،<br />ببلّش <span>برسالة.</span>
      </h1>
      <p className="intro-description">
        فكرة، سؤال، أو مجرد مرحبًا.<br />اكتب اللي ببالك، وخلي الباقي علينا.
      </p>
      <div className="note-illustration" aria-hidden="true">
        <span className="note-spark">✳</span>
        <div className="paper-note">
          <span>مرحبًا!</span>
          <i /><i /><i />
        </div>
        <div className="envelope"><span>↗</span></div>
      </div>
      <p className="intro-caption">من المتصفح، لبداية حوار جديد.</p>
    </section>
  );
}
