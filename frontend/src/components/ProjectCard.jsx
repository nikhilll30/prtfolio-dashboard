import { motion } from 'motion/react';
import { reveal, viewportOnce } from '../motion';

export default function ProjectCard({ project, onSelect, selectedSkill, onDownloadPdf }) {
  // Check if this card contains the selected skill to apply highlight styling
  const isHighlighted = selectedSkill && project.skills.includes(selectedSkill);
  const isDimmed = selectedSkill && !isHighlighted;

  return (
    <motion.article
      layout
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      whileHover={{ y: -8, scale: 1.012 }}
      transition={{ layout: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
      className="project-card-shell"
    >
    <div
      className="panel project-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        opacity: isDimmed ? 0.35 : 1,
        borderColor: isHighlighted ? 'var(--accent)' : undefined,
        transition: 'border-color 0.2s ease, opacity 0.3s ease'
      }}
    >
      <div className="panel-header" style={{ color: isHighlighted ? 'var(--accent)' : undefined }}>
        <span>┌─ {project.id}</span>
        {isHighlighted && <span style={{ color: 'var(--accent)' }}>match</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '1.5rem' }}>
        {/* Metric rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '1.25rem' }}>
          {project.metrics.map((metric, idx) => (
            <div key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', textTransform: 'lowercase' }}>{metric.label}:</span>
              <span style={{ color: 'var(--accent)' }}>{metric.value}</span>
            </div>
          ))}
        </div>

        {/* Title & Subtitle */}
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
            {project.title}
          </h3>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent-dim)' }}>
            {project.subtitle}
          </p>
        </div>

        {/* Description */}
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem', flexGrow: 1 }}>
          {project.description}
        </p>

        {/* Tech Stack Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
          {project.techStack.map((tech) => (
            <span key={tech} className="tag">{tech}</span>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: 'auto' }}>
          <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary" onClick={onSelect} style={{ flexGrow: 1 }}>
            [deep_dive]
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.94 }}
            className="btn"
            onClick={() => onDownloadPdf(project.id)}
            title="Download Documentation PDF"
          >
            [pdf]
          </motion.button>
        </div>
      </div>
    </div>
    </motion.article>
  );
}
