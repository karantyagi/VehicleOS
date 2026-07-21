import type { Metadata } from "next";
import { TrustPageLayout, TrustSection } from "../components/trust-page-layout";
import { privacySections, trustMeta } from "../../lib/trust-content";

export const metadata: Metadata = {
  title: trustMeta.privacy.title,
  description: trustMeta.privacy.description,
};

export default function PrivacyPage() {
  return (
    <TrustPageLayout title="Privacy" updated="July 20, 2026">
      {privacySections.map((section) => (
        <TrustSection key={section.id} {...section} />
      ))}
    </TrustPageLayout>
  );
}
