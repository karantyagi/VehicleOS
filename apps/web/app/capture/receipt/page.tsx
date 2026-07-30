import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { ReceiptCaptureWorkspace } from "@/components/receipt-capture-workspace";
import { getSessionUser } from "@/lib/auth/session";
import { VehicleConsoleProvider } from "@/lib/vehicle-console-context";

export default async function CaptureReceiptPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/capture/receipt");
  }

  return (
    <VehicleConsoleProvider>
      <AppShell
        user={user}
        sidebarHeader={<AppHeader user={user} placement="sidebar" />}
        mobileBar={<AppHeader user={user} placement="mobile" />}
      >
        <ReceiptCaptureWorkspace />
      </AppShell>
    </VehicleConsoleProvider>
  );
}
