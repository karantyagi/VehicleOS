import { positioningContent } from "../../lib/site-config";

function GapCards() {
  return (
    <div className="gap-cards">
      {positioningContent.gapCards.map((card) => (
        <article
          key={card.id}
          className={`gap-card${"highlight" in card && card.highlight ? " gap-card-highlight" : ""}`}
        >
          <span className="gap-card-label">{card.label}</span>
          <p className="gap-card-line">{card.line}</p>
        </article>
      ))}
    </div>
  );
}

export function PositioningGapSection() {
  return (
    <section className="section shell" id="positioning">
      <div className="section-header-centered">
        <span className="section-label">{positioningContent.sectionLabel}</span>
        <h2>{positioningContent.sectionTitle}</h2>
        <p className="section-desc positioning-intro-short">{positioningContent.intro}</p>
      </div>
      <GapCards />
      <p className="positioning-footnote positioning-footnote-below">{positioningContent.footnote}</p>
    </section>
  );
}
