import React from 'react';

export default function ProjectModal({ project, onClose, onAskAgent, onDownloadPdf }) {
  if (!project) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(6, 5, 12, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem 1rem'
    }} onClick={onClose}>
      
      <div 
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2.5rem',
          position: 'relative',
          backgroundColor: 'rgba(18, 15, 32, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing modal on click inside
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            color: 'var(--text-secondary)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '1.2rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          ✕
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '2rem' }}>
          <span className="tag tag-accent" style={{ marginBottom: '0.5rem' }}>Project Deep-Dive</span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
            {project.title}
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--accent-cyan)', fontWeight: 500 }}>
            {project.subtitle}
          </p>
        </div>

        {/* Extended Description */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ fontSize: '1rem', textTransform: 'uppercase', color: 'var(--accent-purple)', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 700 }}>
            Overview
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            {project.description}
          </p>
        </div>

        {/* Major Achievements & Engineering Highlights */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ fontSize: '1rem', textTransform: 'uppercase', color: 'var(--accent-purple)', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 700 }}>
            Engineering Highlights
          </h4>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.92rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {project.achievements.map((ach, idx) => (
              <li key={idx} style={{ listStyleType: 'square', lineHeight: '1.5' }}>{ach}</li>
            ))}
          </ul>
        </div>

        {/* Technical Concepts */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h4 style={{ fontSize: '1rem', textTransform: 'uppercase', color: 'var(--accent-purple)', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 700 }}>
            Core Concepts Applied
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {project.concepts.map((concept) => (
              <span key={concept} className="tag" style={{ border: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(255, 255, 255, 0.01)', color: 'var(--text-secondary)' }}>
                {concept}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: '1.5rem'
        }}>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              onAskAgent(`Tell me about the engineering challenges Nikhil solved in his "${project.title}" project.`);
              onClose();
            }}
            style={{ fontSize: '0.9rem' }}
          >
            Ask Recruiter Agent About This
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={() => onDownloadPdf(project.id)}
            style={{ fontSize: '0.9rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download PDF Docs
          </button>
          
          <button 
            className="btn btn-outline" 
            onClick={onClose}
            style={{ marginLeft: 'auto', fontSize: '0.9rem' }}
          >
            Close Modal
          </button>
        </div>

      </div>
    </div>
  );
}
