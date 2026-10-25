import type { LoginPayload, RegisterPayload } from "./types";

export function validateRegistration(payload: RegisterPayload, confirmation: string): string | null {
  if (!payload.name) return "اكتب اسمك الكامل.";
  if (payload.name.length > 100) return "الاسم لازم يكون 100 حرف أو أقل.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return "اكتب بريد إلكتروني صحيح.";
  if (payload.password.length < 8) return "كلمة المرور لازم تكون 8 أحرف على الأقل.";
  if (payload.password !== confirmation) return "تأكيد كلمة المرور مش مطابق.";
  return null;
}

export function validateLogin(payload: LoginPayload): string | null {
  if (payload.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return "اكتب بريد إلكتروني صحيح.";
  }
  if (!payload.password.trim()) return "اكتب كلمة المرور.";
  return null;
}
