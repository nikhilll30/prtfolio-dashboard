import { motion } from 'motion/react';

const principles = [
  {
    number: '01',
    title: 'Architect before automating.',
    body: 'Start with state, boundaries, and ownership. The model is one component inside a system—not the system itself.',
  },
  {
    number: '02',
    title: 'Design the failure path.',
    body: 'Retries, validation, timeouts, and graceful degradation are product behavior, not cleanup work after the demo succeeds.',
  },
  {
    number: '03',
    title: 'Make evidence visible.',
    body: 'Citations, model cards, limits, and reproducible decisions build more trust than a larger unsupported metric.',
  },
];

export default function Principles() {
  return (
    <section className="principles" id="approach" aria-labelledby="principles-title">
      <div className="section-heading section-heading--light">
        <div>
          <p className="eyebrow">Engineering posture</p>
          <h2 id="principles-title">The behavior behind<br />the build.</h2>
        </div>
        <p className="section-heading__aside">A portfolio should reveal how an engineer thinks when the model is uncertain, the dependency is slow, or the benchmark is unflattering.</p>
      </div>

      <div className="principles__grid">
        {principles.map((principle, index) => (
          <motion.article
            key={principle.number}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.65, delay: index * 0.08 }}
          >
            <span>{principle.number}</span>
            <h3>{principle.title}</h3>
            <p>{principle.body}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
