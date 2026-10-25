"use client";

import { useId, useState } from "react";
import styles from "../auth.module.css";

type PasswordFieldProps = {
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
};

export default function PasswordField({ name, label, autoComplete }: PasswordFieldProps) {
  const id = useId();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordInput}>
        <input id={id} name={name} type={isVisible ? "text" : "password"} autoComplete={autoComplete} placeholder="••••••••" dir="ltr" required />
        <button type="button" aria-label={`${isVisible ? "إخفاء" : "إظهار"} ${label}`} aria-pressed={isVisible} aria-controls={id} onClick={() => setIsVisible(!isVisible)}>
          {isVisible ? "إخفاء" : "إظهار"}
        </button>
      </div>
    </div>
  );
}
