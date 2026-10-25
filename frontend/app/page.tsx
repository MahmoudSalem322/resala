import SiteHeader from "@/components/layout/site-header";
import SiteFooter from "@/components/layout/site-footer";
import MessageIntro from "@/features/messages/components/message-intro";
import MessageCard from "@/features/messages/components/message-card";

export default function Home() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="workspace">
        <MessageIntro />
        <MessageCard />
      </main>
      <SiteFooter />
    </div>
  );
}
