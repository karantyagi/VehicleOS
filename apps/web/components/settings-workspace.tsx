"use client";

import { DeleteAccountPanel } from "@/components/delete-account-panel";
import { VehicleDeletePanel } from "@/components/vehicle-delete-panel";
import { PageHeader } from "@/components/page-header";
import { PanelCard } from "@/components/panel-card";
import type { SessionUser } from "@/lib/auth/types";
import { useAppUiStore } from "@/lib/store/app-ui-store";

type SettingsWorkspaceProps = {
  user: SessionUser;
};

export function SettingsWorkspace({ user }: SettingsWorkspaceProps) {
  const isDeveloper = useAppUiStore((state) => state.consoleMode) === "developer";

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Account"
        description={isDeveloper ? "Login identity and sign-out — outside the assistant's working files." : undefined}
      />

      <div className="space-y-6">
        <PanelCard hideHeader={!isDeveloper} title="Signed in as" description="Your early-access identity for VehicleOS.">
          <p className="text-sm font-medium">{user.email ?? user.id}</p>
        </PanelCard>
        <PanelCard hideHeader={!isDeveloper} title="Vehicle" description="Remove this car and all service history.">
          <VehicleDeletePanel />
        </PanelCard>
        <DeleteAccountPanel />
      </div>
    </>
  );
}
