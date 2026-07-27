import { versionLadder } from "../../lib/site-config";
import { RevealOnScroll } from "./scroll-reveal";

export function VersionLadderSection() {
  return (
    <section className="section shell" id="versions">
      <RevealOnScroll>
        <div className="section-header-centered">
          <span className="section-label">{versionLadder.sectionLabel}</span>
          <h2>{versionLadder.sectionTitle}</h2>
        </div>
      </RevealOnScroll>

      <div className="version-grid">
        {versionLadder.cards.map((card, index) => (
          <RevealOnScroll key={card.id} delay={index * 80}>
            <article className={`version-card version-card-${card.id}`}>
              <div className="version-card-head">
                <span className="version-badge">{card.badge}</span>
                <span className="version-phase">{card.phase}</span>
              </div>
              <h3>{card.title}</h3>
              <p>{card.detail}</p>
              {card.bullets.length > 0 ? (
                <ul className="version-bullets">
                  {card.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
