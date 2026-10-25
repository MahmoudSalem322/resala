import type { Metadata } from "next";
import { Almarai } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/features/auth/components/auth-provider";

const almarai = Almarai({ weight: ["400", "700", "800"], subsets: ["arabic", "latin"], display: "swap", variable: "--font-almarai" });

export const metadata: Metadata = {
  title: "رسالة | Fullstack Practice",
  description: "مساحة بسيطة لكتابة رسالة والتواصل.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={almarai.variable}>
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
