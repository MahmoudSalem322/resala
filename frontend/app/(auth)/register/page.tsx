import type { Metadata } from "next";
import AuthScreen from "@/features/auth/components/auth-screen";

export const metadata: Metadata = { title: "إنشاء حساب | رسالة" };

export default function RegisterPage() {
  return <AuthScreen mode="register" />;
}
