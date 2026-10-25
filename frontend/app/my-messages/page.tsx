import type { Metadata } from "next";
import SiteHeader from "@/components/layout/site-header";
import SiteFooter from "@/components/layout/site-footer";
import MyMessages from "@/features/messages/components/my-messages";

export const metadata: Metadata = { title: "رسائلي | رسالة" };

export default function MyMessagesPage() {
  return <div className="site-shell"><SiteHeader /><MyMessages /><SiteFooter /></div>;
}
