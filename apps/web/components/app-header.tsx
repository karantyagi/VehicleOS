import Link from "next/link";
import type { SessionUser } from "../lib/auth/types";
import { siteConfig } from "../lib/site-config";
import { LogoMark } from "../lib/logo-mark";

type AppHeaderProps = {
  user: SessionUser | null;
};

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="app-header">
      <a className="logo" href={siteConfig.marketingUrl}>
        <LogoMark />
        {siteConfig.name}
      </a>
      <Link className="header-link" href={`${siteConfig.marketingUrl}/#demo`}>
        Watch demo
      </Link>
      {user ? (
        <div className="header-account">
          <Link className="header-link" href="/settings">
            Settings
          </Link>
          <span className="header-user">{user.email ?? "Signed in"}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="header-link button-link">
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </header>
  );
}
