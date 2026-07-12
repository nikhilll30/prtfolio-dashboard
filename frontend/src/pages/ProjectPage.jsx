import { Link, Navigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import ArchitectureSimulator from '../components/ArchitectureSimulator';
import CaseStudyBody from '../components/CaseStudyBody';
import { getCapability, getNextProject, projectsById } from '../data/projects';
import usePageMeta from '../hooks/usePageMeta';

export default function ProjectPage({ onOpenAgent }) {
  const { projectId } = useParams();
  const project = projectsById[projectId];

  usePageMeta({
    title: project ? `${project.title} — Nikhil Teja` : 'Project not found — Nikhil Teja',
    description: project?.summary || 'Applied AI engineering case studies by Nikhil Teja.',
    path: project ? `/work/${project.id}` : '/work',
  });

  if (!project) return <Navigate to="/not-found" replace />;
  const nextProject = getNextProject(project.id);

  return (
    <main className="case-study" style={{ '--project-accent': project.accent, '--project-rgb': project.accentRgb }}>
      <section className="case-hero">
        <div className="case-hero__topline">
          <Link to="/#work">← All systems</Link>
          <span>{project.index} / 04</span>
        </div>

        <div className="case-hero__grid">
          <motion.div
            className="case-hero__copy"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow">{project.eyebrow}</p>
            <h1>{project.title}</h1>
            <p className="case-hero__thesis">{project.thesis}</p>
          </motion.div>

          <motion.div
            className="case-hero__brief"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, delay: 0.14 }}
          >
            <div className="case-status"><i /> {project.status}</div>
            <p>{project.summary}</p>
            <dl>
              <div><dt>Role</dt><dd>{project.role}</dd></div>
              <div><dt>Focus</dt><dd>{project.capabilities.map((capabilityId) => getCapability(capabilityId).shortLabel).join(' · ')}</dd></div>
            </dl>
            <div className="button-row">
              <button className="button button--project" type="button" onClick={onOpenAgent}>Ask about this system</button>
              <a className="button button--ghost" href="#architecture">Walk the architecture</a>
            </div>
          </motion.div>
        </div>

        <div className="case-tech" aria-label="Technology stack">
          {project.techStack.map((technology) => <span key={technology}>{technology}</span>)}
        </div>
      </section>

      <section className="case-proof" aria-labelledby="proof-title">
        <div className="case-proof__intro">
          <p className="eyebrow">Evidence before adjectives</p>
          <h2 id="proof-title">What can be verified.</h2>
        </div>
        <div className="case-proof__grid">
          {project.proof.map((item) => (
            <article key={item.label}>
              <strong>{item.value}</strong>
              <h3>{item.label}</h3>
              <p>{item.qualifier}</p>
              <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noreferrer' : undefined}>
                {item.sourceLabel} <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <div id="architecture">
        <ArchitectureSimulator project={project} />
      </div>
      <CaseStudyBody project={project} />

      <section className="case-links" aria-labelledby="case-links-title">
        <div>
          <p className="eyebrow">Inspect the source</p>
          <h2 id="case-links-title">Go beyond the portfolio layer.</h2>
        </div>
        <div className="case-links__list">
          {project.links.map((link) => (
            <a key={link.href} href={link.href} target={link.href.startsWith('http') ? '_blank' : undefined} rel={link.href.startsWith('http') ? 'noreferrer' : undefined}>
              <span>{link.kind}</span>
              <strong>{link.label}</strong>
              <i aria-hidden="true">↗</i>
            </a>
          ))}
        </div>
      </section>

      <Link className="next-project" to={`/work/${nextProject.id}`} style={{ '--next-accent': nextProject.accent }}>
        <span>Next system · {nextProject.index}</span>
        <strong>{nextProject.title}</strong>
        <i aria-hidden="true">↗</i>
      </Link>
    </main>
  );
}
