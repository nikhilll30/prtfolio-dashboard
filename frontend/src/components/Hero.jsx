import React from 'react';
import useTypewriter from '../hooks/useTypewriter';

export default function Hero({ onOpenChat }) {
  const headline = 'NIKHIL TEJA // AI ENGINEER';
  const { text: typedHeadline, done } = useTypewriter(headline, 45);

  return (
    <header className="panel animate-fade-in" style={{ marginBottom: '3rem' }}>
      <div className="panel-header">
        <span>┌─ ~/nikhil-teja</span>
        <span style={{ color: 'var(--accent-dim)' }}>portfolio v2.0</span>
      </div>

      <div style={{ padding: '3rem 2.5rem 3.5rem', maxWidth: '820px' }}>
        <h1 style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(1.6rem, 4.5vw, 2.6rem)',
          fontWeight: 600,
          letterSpacing: '0.01em',
          marginBottom: '1.5rem',
          minHeight: '1.2em',
          whiteSpace: 'nowrap'
        }}>
          {typedHeadline}
          <span className="cursor-blink">█</span>
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.75rem', opacity: done ? 1 : 0, transition: 'opacity 0.4s ease' }}>
          <p className="prompt-line">building production LLM systems</p>
          <p className="prompt-line">4 projects loaded — deployed &amp; containerized</p>
          <p className="prompt-line">recruiter_agent online</p>
        </div>

        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '2.25rem', lineHeight: '1.7' }}>
          I design and ship production AI systems built around large language models — turning model capabilities into dependable products.
          My work spans multi-agent orchestration with LangGraph, hybrid retrieval pipelines on ChromaDB and BM25 reciprocal rank fusion,
          domain-adapted applications such as BiomedBERT-powered NLP tools, and the API, orchestration, and reliability layers that hold it all together.
          Explore my portfolio below, or chat directly with my interactive AI Recruiter Agent.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onOpenChat}>
            [run_recruiter_agent]
          </button>
          <a href="#projects" className="btn">
            [view_projects]
          </a>
        </div>
      </div>
    </header>
  );
}
