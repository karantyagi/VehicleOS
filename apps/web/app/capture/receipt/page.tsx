import { redirect } from "next/navigation";
import { AppHeader } from "../../components/app-header";
import { AppShell } from "../../components/app-shell";
import { ReceiptCaptureWorkspace } from "../../components/receipt-capture-workspace";
import { getSessionUser } from "../../lib/auth/session";
import { isAuthEnabled } from "../../lib/supabase/env";

export default async function CaptureReceiptPage() {
  if (!isAuthEnabled()) {
    redirect("/");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/capture/receipt");
  }

  return (
    <AppShell
      user={user}
      sidebarHeader={<AppHeader user={user} placement="sidebar" />}
      mobileBar={<AppHeader user={user} placement="mobile" />}
    >
      <ReceiptCaptureWorkspace />
    </AppShell>
  );
}
