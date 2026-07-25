import { redirect } from "next/navigation";
import { ReceiptCaptureWorkspace } from "@/components/receipt-capture-workspace";
import { getSessionUser } from "@/lib/auth/session";
import { isAuthEnabled } from "@/lib/supabase/env";

export default async function CaptureReceiptPage() {
  if (!isAuthEnabled()) {
    redirect("/");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/capture/receipt");
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      <ReceiptCaptureWorkspace />
    </main>
  );
}
