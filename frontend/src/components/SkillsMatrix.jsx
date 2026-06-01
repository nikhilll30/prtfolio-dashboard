import React from 'react';
import { skillsData } from '../data/projects';

export default function SkillsMatrix({ selectedSkill, onSelectSkill }) {
  return (
    <section className="skills-matrix-section glass-panel animate-fade-in" style={{ padding: '2.5rem', marginBottom: '3.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Interactive Skills Matrix</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Click on any technical capability below to highlight and filter the portfolio projects demonstrating it!
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem'
      }}>
        {Object.entries(skillsData).map(([category, skills]) => (
          <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{
              fontSize: '1.05rem',
              color: 'var(--accent-purple)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              paddingBottom: '0.5rem',
              marginBottom: '0.25rem'
            }}>
              {category}
            </h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {skills.map((skill) => {
                const isSelected = selectedSkill === skill;
                return (
                  <button
                    key={skill}
                    onClick={() => onSelectSkill(isSelected ? null : skill)}
                    style={{
                      padding: '0.5rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.08)',
                      background: isSelected 
                        ? 'rgba(0, 242, 254, 0.15)' 
                        : 'rgba(255, 255, 255, 0.02)',
                      color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      boxShadow: isSelected ? '0 0 12px rgba(0, 242, 254, 0.25)' : 'none',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      outline: 'none',
                      userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {selectedSkill && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => onSelectSkill(null)}
            style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
          >
            Clear Filter: <strong style={{ color: 'var(--accent-cyan)', marginLeft: '0.25rem' }}>{selectedSkill}</strong> ✕
          </button>
        </div>
      )}
    </section>
  );
}
