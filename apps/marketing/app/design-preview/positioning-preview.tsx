import { positioningContent } from "../../lib/site-config";
import { PositioningGapSection } from "../components/positioning-gap-section";

function PositioningStrip() {
  return (
    <div className="positioning-strip">
      <p className="positioning-intro">{positioningContent.intro}</p>
      <p className="positioning-footnote">{positioningContent.footnote}</p>
    </div>
  );
}

export function PositioningPreview() {
  return (
    <section className="preview-section" id="positioning-preview">
      <span className="section-label">{positioningContent.sectionLabel}</span>
      <h2>Positioning — shipped on main</h2>
      <p className="section-desc">
        <strong>Option B (gap cards)</strong> is live on{" "}
        <a href="/#positioning">the main site</a> between <code>#paths</code> and{" "}
        <code>#loop</code>. Option A kept here as reference only.
      </p>

      <div className="preview-variant">
        <p className="preview-variant-tag preview-variant-tag-shipped">Shipped · Option B</p>
        <div className="preview-variant-frame preview-variant-frame-shipped">
          <PositioningGapSection />
        </div>
      </div>

      <div className="preview-variant">
        <p className="preview-variant-tag">Archived · Option A — glass strip</p>
        <div className="preview-variant-frame">
          <div className="section-header-centered preview-variant-header">
            <span className="section-label">{positioningContent.sectionLabel}</span>
            <h3>{positioningContent.sectionTitle}</h3>
          </div>
          <PositioningStrip />
        </div>
      </div>
    </section>
  );
}
