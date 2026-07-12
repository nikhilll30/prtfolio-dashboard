export default function CaseStudyBody({ project }) {
  return (
    <>
      <section className="decisions-section" aria-labelledby="decisions-title">
        <div className="case-section-heading">
          <div>
            <p className="eyebrow">Engineering decisions</p>
            <h2 id="decisions-title">The choices that shaped the system.</h2>
          </div>
          <p>Each decision solves a concrete constraint and accepts a visible tradeoff.</p>
        </div>

        <div className="decisions-list">
          {project.decisions.map((decision) => (
            <article key={decision.number}>
              <span>{decision.number}</span>
              <div>
                <h3>{decision.title}</h3>
                <p>{decision.body}</p>
              </div>
              <p className="decision-tradeoff"><strong>Tradeoff</strong>{decision.tradeoff}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="limits-section" aria-labelledby="limits-title">
        <div>
          <p className="eyebrow">Limits / next iteration</p>
          <h2 id="limits-title">What this system does not prove.</h2>
        </div>
        <ul>
          {project.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
        </ul>
      </section>
    </>
  );
}
