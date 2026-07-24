import type { Metadata } from "next";
import { TrustPageLayout, TrustSection } from "../components/trust-page-layout";
import { termsSections, trustMeta } from "../../lib/trust-content";

export const metadata: Metadata = {
  title: trustMeta.terms.title,
  description: trustMeta.terms.description,
};

export default function TermsPage() {
  return (
    <TrustPageLayout title="Terms of Service" updated="July 23, 2026">
      {termsSections.map((section) => (
        <TrustSection key={section.id} {...section} />
      ))}
    </TrustPageLayout>
  );
}
