import Link from "next/link";
import { siteConfig } from "../lib/site-config";

export function AppFooter() {
  return (
    <footer className="app-footer">
      <Link href={`${siteConfig.marketingUrl}/privacy`}>Privacy</Link>
      <span aria-hidden="true">·</span>
      <Link href={`${siteConfig.marketingUrl}/security`}>Security</Link>
      <span aria-hidden="true">·</span>
      <a href={`mailto:${siteConfig.contactEmail}`}>
        Contact
      </a>
    </footer>
  );
}
