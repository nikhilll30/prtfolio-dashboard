import { AnimatePresence, motion } from 'motion/react';
import { skillsData } from '../data/projects';
import { reveal, stagger, viewportOnce } from '../motion';

export default function SkillsMatrix({ selectedSkill, onSelectSkill }) {
  return (
    <motion.section variants={stagger} initial="hidden" whileInView="visible" viewport={viewportOnce} style={{ marginBottom: '3.5rem' }}>
      <h2 className="section-title"><span className="section-num">01 //</span> SKILLS</h2>

      <motion.div variants={reveal} className="panel">
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
                      <motion.button
                        layout
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        key={skill}
                        className={`skill-pill${isSelected ? ' selected' : ''}`}
                        onClick={() => onSelectSkill(isSelected ? null : skill)}
                      >
                        {skill}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <AnimatePresence>
          {selectedSkill && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ display: 'flex', justifyContent: 'center', marginTop: '1.75rem', overflow: 'hidden' }}>
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="btn" onClick={() => onSelectSkill(null)} style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}>
                [clear_filter: {selectedSkill.toLowerCase()}]
              </motion.button>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.section>
  );
}
