import SiteHeader from "@/components/layout/site-header";
import SiteFooter from "@/components/layout/site-footer";
import MessageExperience from "@/features/messages/components/message-experience";

export default function Home() {
  return (
    <div className="site-shell home-shell">
      <SiteHeader />
      <MessageExperience />
      <SiteFooter />
    </div>
  );
}
