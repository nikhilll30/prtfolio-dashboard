import React from 'react';

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
    <section className="timeline-section animate-fade-in" style={{ marginTop: '4rem', marginBottom: '4rem' }}>
      <h2 className="section-title">Experience & Journey</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
        {/* Central line */}
        <div style={{
          position: 'absolute',
          left: '20px',
          top: '10px',
          bottom: '10px',
          width: '2px',
          background: 'linear-gradient(to bottom, var(--accent-cyan), var(--accent-purple))'
        }} />
        
        {experiences.map((exp, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '1.5rem', position: 'relative' }}>
            {/* Dot indicator */}
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#06050c',
              border: '2px solid var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              flexShrink: 0
            }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--grad-primary)' }} />
            </div>
            
            {/* Experience Glass Panel */}
            <div className="glass-panel" style={{ padding: '1.75rem', flexGrow: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{exp.title}</h3>
                  <span style={{ fontSize: '0.9rem', color: 'var(--accent-purple)', fontWeight: 500 }}>{exp.company}</span>
                </div>
                {exp.period && (
                  <span className="tag" style={{ border: '1px solid rgba(157, 78, 221, 0.3)', color: 'var(--accent-purple)' }}>{exp.period}</span>
                )}
              </div>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>{exp.description}</p>
              
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {exp.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} style={{ listStyleType: 'square' }}>{bullet}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
