type MessageFeedbackProps = {
  type: "success" | "error";
  message: string;
};

export default function MessageFeedback({ type, message }: MessageFeedbackProps) {
  return (
    <p
      className={`form-result form-result--${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      <span aria-hidden="true">{type === "success" ? "✓" : "!"}</span>
      {message}
    </p>
  );
}
