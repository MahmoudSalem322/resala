import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/features/auth/components/auth-provider";

export const metadata: Metadata = {
  title: "رسالة | Fullstack Practice",
  description: "مساحة بسيطة لكتابة رسالة والتواصل.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
