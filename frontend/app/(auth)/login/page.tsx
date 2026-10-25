import type { Metadata } from "next";
import AuthScreen from "@/features/auth/components/auth-screen";

export const metadata: Metadata = { title: "تسجيل الدخول | رسالة" };

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
