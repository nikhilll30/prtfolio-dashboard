import { motion } from 'motion/react';
import { reveal, stagger, viewportOnce } from '../motion';

export default function Timeline() {
  const experiences = [
    {
      title: "Independent AI Engineer",
      company: "Self-Directed Applied AI Portfolio",
      description: "Researched and built state-of-the-art LLM architectures, RAG pipelines, fine-tuned domain BERT models, and custom agentic frameworks. Deployed web apps via Docker and Render.",
      bullets: [
        "Orchestrated parallel sub-agents (web search, custom vector stores) using LangGraph state machines.",
        "Created hybrid search algorithms combining BM25 and semantic vectors with Reciprocal Rank Fusion.",
        "Fine-tuned Microsoft's BiomedBERT for biomedical question answering using custom weighted cross-entropy loss."
      ]
    },
    {
      title: "MS in Computer Science",
      company: "Rivier University",
      description: "Focused on advanced concepts in machine learning, large language models, agentic workflows, and high-performance distributed systems.",
      bullets: [
        "Research and coursework in Deep Learning, Advanced NLP, and Multi-Agent Orchestrations.",
        "Engineered custom benchmark implementations of LLM evaluation frameworks."
      ]
    }
  ];

  return (
    <motion.section variants={stagger} initial="hidden" whileInView="visible" viewport={viewportOnce} className="timeline-section" style={{ marginTop: '4rem', marginBottom: '4rem' }}>
      <h2 className="section-title"><span className="section-num">03 //</span> EXPERIENCE</h2>

      <motion.div variants={stagger} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        maxWidth: '800px',
        margin: '0 auto',
        paddingLeft: '1.75rem',
        position: 'relative'
      }}>
        <motion.span
          aria-hidden="true"
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
          className="timeline-rule"
        />
        {experiences.map((exp, idx) => (
          <motion.div variants={reveal} key={idx} style={{ position: 'relative' }}>
            {/* Marker on the rule line */}
            <motion.span className="timeline-marker" whileInView={{ scale: [0.7, 1.25, 1] }} viewport={viewportOnce} transition={{ duration: 0.55, delay: idx * 0.16 }} style={{
              position: 'absolute',
              left: 'calc(-1.75rem - 5px)',
              top: '0.9rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent)',
              fontSize: '0.75rem',
              background: 'var(--bg-main)',
              lineHeight: 1
            }}>
              ▸
            </motion.span>

            <div className="panel">
              <div className="panel-header">
                <span>┌─ log_{String(idx + 1).padStart(2, '0')}</span>
              </div>

              <div style={{ padding: '1.5rem 1.75rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{exp.title}</h3>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-dim)' }}>{exp.company}</span>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1rem' }}>{exp.description}</p>

                <ul style={{ listStyle: 'none', color: 'var(--text-secondary)', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {exp.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} style={{ display: 'flex', gap: '0.6rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-dim)', flexShrink: 0 }}>▸</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
