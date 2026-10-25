import Link from "next/link";
import AuthNavigation from "@/features/auth/components/auth-navigation";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="رسالة، الرئيسية">
        <span className="brand-icon" aria-hidden="true">ر</span>
        رسالة.
      </Link>
      <AuthNavigation />
    </header>
  );
}
