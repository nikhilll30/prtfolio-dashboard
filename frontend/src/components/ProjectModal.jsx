import React from 'react';

export default function ProjectModal({ project, onClose, onAskAgent, onDownloadPdf }) {
  if (!project) return null;

  const sectionLabelStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.78rem',
    textTransform: 'lowercase',
    color: 'var(--accent-dim)',
    letterSpacing: '0.06em',
    marginBottom: '0.6rem',
    fontWeight: 500
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem 1rem'
    }} onClick={onClose}>

      <div
        className="panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-panel-raised)',
          borderColor: 'var(--accent-dim)'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing modal on click inside
      >
        {/* Title bar */}
        <div className="panel-header" style={{ position: 'sticky', top: 0, background: 'var(--bg-panel-raised)', zIndex: 1 }}>
          <span>┌─ {project.id} — deep_dive</span>
          <button className="icon-btn" onClick={onClose}>[x]</button>
        </div>

        <div style={{ padding: '2rem 2.25rem 2.25rem' }}>
          {/* Modal Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              {project.title}
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent)' }}>
              {project.subtitle}
            </p>
          </div>

          {/* Extended Description */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={sectionLabelStyle}>## overview</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.65' }}>
              {project.description}
            </p>
          </div>

          {/* Major Achievements & Engineering Highlights */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={sectionLabelStyle}>## engineering_highlights</h4>
            <ul style={{ listStyle: 'none', color: 'var(--text-secondary)', fontSize: '0.92rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {project.achievements.map((ach, idx) => (
                <li key={idx} style={{ lineHeight: '1.55', display: 'flex', gap: '0.6rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-dim)', flexShrink: 0 }}>▸</span>
                  <span>{ach}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Technical Concepts */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h4 style={sectionLabelStyle}>## core_concepts</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {project.concepts.map((concept) => (
                <span key={concept} className="tag">{concept}</span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            borderTop: '1px solid var(--border)',
            paddingTop: '1.5rem'
          }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                onAskAgent(`Tell me about the engineering challenges Nikhil solved in his "${project.title}" project.`);
                onClose();
              }}
            >
              [ask_recruiter_agent]
            </button>

            <button className="btn" onClick={() => onDownloadPdf(project.id)}>
              [download_pdf]
            </button>

            <button className="btn" onClick={onClose} style={{ marginLeft: 'auto' }}>
              [close]
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
