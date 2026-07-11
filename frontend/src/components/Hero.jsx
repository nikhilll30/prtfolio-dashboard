import { motion } from 'motion/react';
import useTypewriter from '../hooks/useTypewriter';
import { easeOutExpo, reveal, stagger } from '../motion';

export default function Hero({ onOpenChat }) {
  const headline = 'NIKHIL TEJA // AI ENGINEER';
  const { text: typedHeadline, done } = useTypewriter(headline, 45);

  return (
    <motion.header
      className="panel hero-panel"
      initial={{ opacity: 0, y: 38, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.12, ease: easeOutExpo }}
      style={{ marginBottom: '3rem' }}
    >
      <div className="panel-header">
        <span>┌─ ~/nikhil-teja</span>
        <span style={{ color: 'var(--accent-dim)' }}>portfolio v2.0</span>
      </div>

      <div className="hero-content" style={{ padding: '3rem 2.5rem 3.5rem', maxWidth: '820px' }}>
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: 0.35 }} style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(1.6rem, 4.5vw, 2.6rem)',
          fontWeight: 600,
          letterSpacing: '0.01em',
          marginBottom: '1.5rem',
          minHeight: '1.2em'
        }}>
          {typedHeadline}
          <span className="cursor-blink">█</span>
        </motion.h1>

        <motion.div variants={stagger} initial="hidden" animate={done ? 'visible' : 'hidden'} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.75rem' }}>
          <motion.p variants={reveal} className="prompt-line">building production LLM systems</motion.p>
          <motion.p variants={reveal} className="prompt-line">4 projects loaded — deployed &amp; containerized</motion.p>
          <motion.p variants={reveal} className="prompt-line">recruiter_agent online</motion.p>
        </motion.div>

        <motion.p initial={{ opacity: 0, y: 18 }} animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }} transition={{ duration: 0.8, delay: 0.42, ease: easeOutExpo }} style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '2.25rem', lineHeight: '1.7' }}>
          I design and ship production AI systems built around large language models — turning model capabilities into dependable products.
          My work spans multi-agent orchestration with LangGraph, hybrid retrieval pipelines on ChromaDB and BM25 reciprocal rank fusion,
          domain-adapted applications such as BiomedBERT-powered NLP tools, and the API, orchestration, and reliability layers that hold it all together.
          Explore my portfolio below, or chat directly with my interactive AI Recruiter Agent.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }} transition={{ duration: 0.7, delay: 0.58, ease: easeOutExpo }} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="btn btn-primary" onClick={onOpenChat}>
            [run_recruiter_agent]
          </motion.button>
          <motion.a whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} href="#projects" className="btn">
            [view_projects]
          </motion.a>
        </motion.div>
      </div>
    </motion.header>
  );
}
