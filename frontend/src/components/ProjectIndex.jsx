import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { getCapability, projectsData } from '../data/projects';

function Arrow() {
  return <span className="arrow" aria-hidden="true">↗</span>;
}

export default function ProjectIndex({ activeCapability }) {
  const capability = getCapability(activeCapability);

  return (
    <section className="work-section" id="work" aria-labelledby="work-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Selected systems / 2026</p>
          <h2 id="work-title">Work that can be inspected,<br />not merely described.</h2>
        </div>
        <p className="section-heading__aside">
          {capability
            ? `Showing where “${capability.label}” appears in the work.`
            : 'Each case study exposes the architecture, the decisions, the failure paths, and the evidence.'}
        </p>
      </div>

      <div className="project-list">
        {projectsData.map((project) => {
          const isMatch = !activeCapability || project.capabilities.includes(activeCapability);
          return (
            <motion.article
              key={project.id}
              className={`project-row${isMatch ? '' : ' is-muted'}`}
              style={{ '--project-accent': project.accent, '--project-rgb': project.accentRgb }}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.16 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="project-row__number">{project.index}</div>
              <div className="project-row__body">
                <p className="project-row__eyebrow">{project.eyebrow}</p>
                <h3>{project.title}</h3>
                <p className="project-row__thesis">{project.thesis}</p>
                <p className="project-row__summary">{project.summary}</p>

                <div className="project-row__tags" aria-label="Technology stack">
                  {project.techStack.slice(0, 5).map((technology) => <span key={technology}>{technology}</span>)}
                </div>
              </div>

              <div className="project-row__evidence">
                <span className="project-row__status"><i /> {project.status}</span>
                <dl>
                  {project.proof.slice(0, 2).map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
                <Link className="project-row__link" to={`/work/${project.id}`}>
                  Inspect the system <Arrow />
                </Link>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
