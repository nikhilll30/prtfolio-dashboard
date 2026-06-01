import React from 'react';

export default function Hero({ onOpenChat }) {
  return (
    <header className="hero-section glass-panel animate-fade-in" style={{ padding: '4rem 3rem', marginBottom: '3rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background visual element */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '250px',
        height: '250px',
        background: 'radial-gradient(circle, rgba(0, 242, 254, 0.15) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      
      <div style={{ maxWidth: '800px', zIndex: 1, position: 'relative' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span className="tag tag-accent">Portfolio Hub</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>• Deployed & Containerized AI Solutions</span>
        </div>
        
        <h1 style={{ fontSize: '3.2rem', lineHeight: '1.1', marginBottom: '1.5rem', fontWeight: 800 }}>
          Hi, I'm <span className="text-gradient">Nikhil Teja</span>
        </h1>
        
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: '1.7' }}>
          I design and ship production AI systems built around large language models — turning model capabilities into dependable products. 
          My work spans multi-agent orchestration with LangGraph, hybrid retrieval pipelines on ChromaDB and BM25 reciprocal rank fusion, 
          domain-adapted applications such as BiomedBERT-powered NLP tools, and the API, orchestration, and reliability layers that hold it all together. 
          Explore my portfolio below, or chat directly with my interactive AI Recruiter Agent.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onOpenChat}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Grill My AI Recruiter
          </button>
          
          <a href="#projects" className="btn btn-secondary">
            View Engineering Projects
          </a>
        </div>
      </div>
    </header>
  );
}
