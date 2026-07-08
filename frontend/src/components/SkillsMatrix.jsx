import React from 'react';
import { skillsData } from '../data/projects';

export default function SkillsMatrix({ selectedSkill, onSelectSkill }) {
  return (
    <section className="animate-fade-in" style={{ marginBottom: '3.5rem' }}>
      <h2 className="section-title"><span className="section-num">01 //</span> SKILLS</h2>

      <div className="panel">
        <div className="panel-header">
          <span>┌─ skills_matrix</span>
          <span style={{ color: 'var(--accent-dim)' }}>
            {selectedSkill ? `filter: ${selectedSkill.toLowerCase()}` : 'click a skill to filter projects'}
          </span>
        </div>

        <div style={{ padding: '1.75rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {Object.entries(skillsData).map(([category, skills]) => (
              <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <h3 style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  textTransform: 'lowercase',
                  letterSpacing: '0.06em',
                  fontWeight: 500,
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '0.5rem'
                }}>
                  ## {category}
                </h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                  {skills.map((skill) => {
                    const isSelected = selectedSkill === skill;
                    return (
                      <button
                        key={skill}
                        className={`skill-pill${isSelected ? ' selected' : ''}`}
                        onClick={() => onSelectSkill(isSelected ? null : skill)}
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
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.75rem' }}>
              <button className="btn" onClick={() => onSelectSkill(null)} style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}>
                [clear_filter: {selectedSkill.toLowerCase()}]
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
