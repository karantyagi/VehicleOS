import { positioningContent } from "../../lib/site-config";
import { RevealOnScroll } from "./scroll-reveal";

type CompareColumnId = "history" | "ai" | "vehicleos";

function CompareMatrix() {
  return (
    <div className="compare-shell reveal-card">
      <div className="compare-table" role="table" aria-label="Compare history reports, general AI, and VehicleOS">
        <div className="compare-row compare-header" role="row">
          <div className="compare-cell compare-label-cell compare-corner" role="columnheader" aria-hidden="true" />
          {positioningContent.columns.map((column) => (
            <div
              key={column.id}
              className={`compare-cell compare-head${"highlight" in column && column.highlight ? " compare-head-highlight" : ""}`}
              role="columnheader"
            >
              <span className="compare-col-label">{column.label}</span>
              <span className="compare-col-sub">{column.subtitle}</span>
            </div>
          ))}
        </div>

        {positioningContent.rows.map((row) => (
          <div className="compare-row" role="row" key={row.id}>
            <div className="compare-cell compare-label-cell" role="rowheader">
              {row.label}
            </div>
            {positioningContent.columns.map((column) => {
              const value = row[column.id as CompareColumnId];
              const isHighlight = "highlight" in column && column.highlight;
              return (
                <div
                  key={`${row.id}-${column.id}`}
                  className={`compare-cell compare-value${isHighlight ? " compare-value-highlight" : ""}`}
                  role="cell"
                >
                  {isHighlight ? <span className="compare-check" aria-hidden="true" /> : null}
                  <span>{value}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PositioningGapSection() {
  return (
    <section className="section shell" id="positioning">
      <RevealOnScroll>
        <div className="section-header-centered">
          <span className="section-label">{positioningContent.sectionLabel}</span>
          <h2>{positioningContent.sectionTitle}</h2>
          <p className="section-desc positioning-intro-short">{positioningContent.intro}</p>
        </div>
      </RevealOnScroll>

      <RevealOnScroll delay={60}>
        <CompareMatrix />
      </RevealOnScroll>

      {positioningContent.footnote ? (
        <RevealOnScroll delay={100}>
          <p className="compare-footnote">{positioningContent.footnote}</p>
        </RevealOnScroll>
      ) : null}
    </section>
  );
}
