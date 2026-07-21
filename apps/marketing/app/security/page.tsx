import type { Metadata } from "next";
import { TrustPageLayout, TrustSection } from "../components/trust-page-layout";
import { securitySections, trustMeta } from "../../lib/trust-content";

export const metadata: Metadata = {
  title: trustMeta.security.title,
  description: trustMeta.security.description,
};

export default function SecurityPage() {
  return (
    <TrustPageLayout title="Security" updated="July 20, 2026">
      {securitySections.map((section) => (
        <TrustSection key={section.id} {...section} />
      ))}
    </TrustPageLayout>
  );
}
