import { useState } from 'react';
import { motion } from 'motion/react';
import NetworkHero from '../components/NetworkHero';
import Principles from '../components/Principles';
import ProjectIndex from '../components/ProjectIndex';
import ProofLedger from '../components/ProofLedger';
import { candidate } from '../data/projects';
import usePageMeta from '../hooks/usePageMeta';

export default function HomePage({ onOpenAgent }) {
  const [activeCapability, setActiveCapability] = useState(null);

  usePageMeta({
    title: 'Nikhil Teja — Applied AI Engineer',
    description: 'Applied AI systems across multi-agent orchestration, hybrid retrieval, safe text-to-SQL, and honest model evaluation.',
    path: '/',
  });

  return (
    <main>
      <NetworkHero
        activeCapability={activeCapability}
        onCapabilityChange={setActiveCapability}
        onOpenAgent={onOpenAgent}
      />
      <ProofLedger />
      <ProjectIndex activeCapability={activeCapability} />
      <Principles />

      <section className="about-section" id="about" aria-labelledby="about-title">
        <div className="about-section__statement">
          <p className="eyebrow">About the engineer</p>
          <motion.h2
            id="about-title"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.75 }}
          >
            I work at the boundary between model capability and system reliability.
          </motion.h2>
        </div>

        <div className="about-section__content">
          <p>I build applied AI systems end to end: retrieval and orchestration, APIs and state, evaluation and deployment. The common thread is turning uncertain model behavior into software that can be inspected, tested, and improved.</p>
          <p>My independent work spans four substantial systems, supported by an MS in Computer Science from Rivier University and detailed technical documentation for every architecture shown here.</p>

          <dl className="about-facts">
            <div><dt>Based in</dt><dd>{candidate.location}</dd></div>
            <div><dt>Education</dt><dd>MS, Computer Science · Rivier University</dd></div>
            <div><dt>Focus</dt><dd>Applied AI systems · NLP · backend engineering</dd></div>
            <div><dt>Availability</dt><dd>{candidate.availability}</dd></div>
          </dl>

          <div className="about-links">
            <a href={candidate.github} target="_blank" rel="noreferrer">GitHub <span>↗</span></a>
            <a href={candidate.huggingFace} target="_blank" rel="noreferrer">Hugging Face <span>↗</span></a>
            <a href={`mailto:${candidate.email}`}>Email <span>↗</span></a>
          </div>
        </div>
      </section>
    </main>
  );
}
