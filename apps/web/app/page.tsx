export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">VehicleOS</p>
        <h1>Operational memory for long-lived car ownership.</h1>
        <p>
          First slice: upload a receipt, extract evidence, create a domain event,
          project next maintenance, and approve the task.
        </p>
      </section>
      <section className="grid">
        <article>
          <h2>Event Stream</h2>
          <p>Append-only records for explainability and replay.</p>
        </article>
        <article>
          <h2>Deterministic Rules</h2>
          <p>Mileage and time intervals generate trustworthy actions.</p>
        </article>
        <article>
          <h2>AI Assistance</h2>
          <p>Extraction and explanations with evidence-linked confidence.</p>
        </article>
      </section>
    </main>
  );
}
