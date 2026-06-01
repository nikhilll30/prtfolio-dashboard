import React from 'react';

export default function ProjectCard({ project, onSelect, selectedSkill, onDownloadPdf }) {
  // Check if this card contains the selected skill to apply highlight styling
  const isHighlighted = selectedSkill && project.skills.includes(selectedSkill);
  const opacity = selectedSkill && !isHighlighted ? 0.4 : 1;
  const borderStyle = isHighlighted 
    ? '1px solid var(--accent-cyan)' 
    : '1px solid var(--border-color)';
  
  const boxStyle = isHighlighted
    ? '0 0 20px rgba(0, 242, 254, 0.15)'
    : 'none';

  return (
    <div 
      className="glass-panel" 
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '1.75rem',
        opacity: opacity,
        border: borderStyle,
        boxShadow: boxStyle,
        transform: isHighlighted ? 'scale(1.02)' : 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Metric badges at the top */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {project.metrics.map((metric, idx) => (
          <div key={idx} style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            padding: '0.35rem 0.65rem',
            textAlign: 'center',
            flexGrow: 1
          }}>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
              {metric.label}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--accent-purple)', fontWeight: 700 }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* Title & Subtitle */}
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          {project.title}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 500 }}>
          {project.subtitle}
        </p>
      </div>

      {/* Description */}
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem', flexGrow: 1 }}>
        {project.description}
      </p>

      {/* Tech Stack Icons/Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.75rem' }}>
        {project.techStack.map((tech) => (
          <span key={tech} className="tag" style={{ fontSize: '0.7rem' }}>
            {tech}
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
        <button 
          className="btn btn-outline" 
          onClick={onSelect}
          style={{ flexGrow: 1, fontSize: '0.85rem', padding: '0.6rem 1rem', justifyContent: 'center' }}
        >
          Deep Dive
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={() => onDownloadPdf(project.id)}
          style={{ padding: '0.6rem 0.85rem', color: 'var(--accent-purple)', border: '1px solid rgba(157, 78, 221, 0.2)' }}
          title="Download Documentation PDF"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}
