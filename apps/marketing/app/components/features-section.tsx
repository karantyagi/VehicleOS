"use client";

import { featuresContent } from "../../lib/site-config";
import { RevealOnScroll } from "./scroll-reveal";

export function FeaturesSection() {
  return (
    <section className="section shell" id="features">
      <RevealOnScroll>
        <div className="section-header-centered">
          <span className="section-label">{featuresContent.sectionLabel}</span>
          <h2>{featuresContent.sectionTitle}</h2>
          <p className="section-desc">{featuresContent.sectionDesc}</p>
        </div>
      </RevealOnScroll>

      <RevealOnScroll delay={40}>
        <div className="features-banner reveal-card">
          <span className="path-badge path-badge-owners">{featuresContent.badge}</span>
          <span className="features-price">{featuresContent.priceNote}</span>
        </div>
      </RevealOnScroll>

      <div className="features-grid">
        {featuresContent.items.map((item, index) => (
          <RevealOnScroll key={item.id} delay={index * 50}>
            <article className={`feature-tile reveal-card${item.id === "execute" ? " feature-tile-accent" : ""}`}>
              <span className="feature-tile-num">{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          </RevealOnScroll>
        ))}
      </div>

      <RevealOnScroll delay={60}>
        <p className="features-execute-callout">{featuresContent.executeCallout}</p>
        <div className="features-cta-row">
          <a className="btn btn-primary" href={featuresContent.ctaSecondary.href}>
            {featuresContent.ctaSecondary.label}
          </a>
          <a className="btn btn-secondary" href={featuresContent.cta.href}>
            {featuresContent.cta.label}
          </a>
        </div>
      </RevealOnScroll>
    </section>
  );
}
