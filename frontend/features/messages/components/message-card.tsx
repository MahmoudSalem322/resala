import MessageForm from "./message-form";

export default function MessageCard() {
  return (
    <section className="message-card" aria-labelledby="form-title">
      <div className="card-heading">
        <span className="section-number" dir="ltr">01 / COMPOSE</span>
        <span className="card-mark" aria-hidden="true">↗</span>
      </div>
      <h2 id="form-title">شو حابب تحكي؟</h2>
      <p className="card-description">بلّش باسمك، وبعدين اترك رسالتك.</p>
      <MessageForm />
    </section>
  );
}
