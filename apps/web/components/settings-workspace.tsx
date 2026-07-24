"use client";

import { DeleteAccountPanel } from "@/components/delete-account-panel";
import { PageHeader } from "@/components/page-header";
import { PanelCard } from "@/components/panel-card";
import type { SessionUser } from "@/lib/auth/types";

type SettingsWorkspaceProps = {
  user: SessionUser;
};

export function SettingsWorkspace({ user }: SettingsWorkspaceProps) {
  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Account"
        description="Login identity and sign-out — outside the assistant's working files."
      />

      <div className="space-y-6">
        <PanelCard title="Signed in as" description="Your early-access identity for VehicleOS.">
          <p className="text-sm font-medium">{user.email ?? user.id}</p>
        </PanelCard>
        <DeleteAccountPanel />
      </div>
    </>
  );
}
