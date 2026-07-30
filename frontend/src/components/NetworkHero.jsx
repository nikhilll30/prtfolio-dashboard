import { createRef, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { capabilities, projectsData } from '../data/projects';
import useNetworkCanvas from '../hooks/useNetworkCanvas';
import DitheringShader from './ui/dithering-shader';

const projectNodeId = (projectId) => `project-${projectId}`;
const capabilityNodeId = (capabilityId) => `capability-${capabilityId}`;

export default function NetworkHero({ activeCapability, onCapabilityChange, onOpenAgent }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [focusedProject, setFocusedProject] = useState(null);

  const nodeRefs = useMemo(() => {
    const nodeIds = [
      'center',
      ...projectsData.map((project) => projectNodeId(project.id)),
      ...capabilities.map((capability) => capabilityNodeId(capability.id)),
    ];
    return new Map(nodeIds.map((id) => [id, createRef()]));
  }, []);

  const edges = useMemo(() => [
    ...projectsData.map((project) => ['center', projectNodeId(project.id)]),
    ...capabilities.flatMap((capability) => capability.projectIds.map((projectId) => [
      capabilityNodeId(capability.id),
      projectNodeId(projectId),
    ])),
  ], []);

  const activeIds = useMemo(() => {
    if (focusedProject) {
      const project = projectsData.find((item) => item.id === focusedProject);
      return ['center', projectNodeId(project.id), ...project.capabilities.map(capabilityNodeId)];
    }

    if (activeCapability) {
      const capability = capabilities.find((item) => item.id === activeCapability);
      return [
        'center',
        capabilityNodeId(capability.id),
        ...capability.projectIds.map(projectNodeId),
      ];
    }

    return ['center', ...projectsData.map((project) => projectNodeId(project.id))];
  }, [activeCapability, focusedProject]);

  const activeAccent = focusedProject
    ? projectsData.find((project) => project.id === focusedProject)?.accent
    : '#ff6339';

  useNetworkCanvas({
    containerRef,
    canvasRef,
    nodeRefs,
    edges,
    activeIds,
    accent: activeAccent,
  });

  const activeCapabilityData = capabilities.find((item) => item.id === activeCapability);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__copy">
        <motion.p
          className="eyebrow hero__eyebrow"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          Nikhil Teja · Applied AI Engineer
        </motion.p>
        <motion.h1
          id="hero-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          I build AI systems that <span>retrieve, reason, recover</span>—and show their work.
        </motion.h1>
        <motion.p
          className="hero__lede"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18 }}
        >
          Four systems across agent orchestration, hybrid retrieval, safe text-to-SQL, and domain model adaptation. Explore the architecture, tradeoffs, and evidence behind each one.
        </motion.p>

        <motion.div
          className="button-row"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.28 }}
        >
          <a className="button button--light" href="#work">Explore the system</a>
          <button className="button button--ghost" type="button" onClick={onOpenAgent}>Ask about my work</button>
        </motion.div>

        <div className="hero__availability" aria-label="Availability">
          <span className="status-dot" aria-hidden="true" />
          <span>Jersey City, NJ</span>
          <span aria-hidden="true">·</span>
          <span>Open to remote and relocation</span>
        </div>
      </div>

      <motion.div
        className="network-shell"
        initial={{ opacity: 0, scale: 0.965 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="network-topline">
          <span>System map / 04 projects</span>
          <span className="network-topline__live"><i /> interactive</span>
        </div>

        <div className="network-map" ref={containerRef} aria-label="Interactive map connecting projects and capabilities">
          <canvas ref={canvasRef} className="network-canvas" aria-hidden="true" />
          <div className="network-grid" aria-hidden="true" />

          <div className="network-center" ref={nodeRefs.get('center')}>
            <DitheringShader
              className="network-center__shader"
              colorBack="#0a0c0d"
              colorFront="#ff6339"
              shape="sphere"
              type="random"
              pxSize={2}
              speed={1.5}
            />
            <span className="network-center__orbit" aria-hidden="true" />
            <strong>NT</strong>
            <small>applied AI<br />systems</small>
          </div>

          {projectsData.map((project) => {
            const matchesCapability = !activeCapability || project.capabilities.includes(activeCapability);
            const isFocused = focusedProject === project.id;
            return (
              <button
                key={project.id}
                ref={nodeRefs.get(projectNodeId(project.id))}
                type="button"
                className={`network-project${matchesCapability ? '' : ' is-muted'}${isFocused ? ' is-active' : ''}`}
                style={{ '--x': `${project.position.x}%`, '--y': `${project.position.y}%`, '--project-accent': project.accent, '--project-rgb': project.accentRgb }}
                onMouseEnter={() => setFocusedProject(project.id)}
                onMouseLeave={() => setFocusedProject(null)}
                onFocus={() => setFocusedProject(project.id)}
                onBlur={() => setFocusedProject(null)}
                onClick={() => navigate(`/work/${project.id}`)}
                aria-label={`Open case study: ${project.title}`}
              >
                <span className="network-project__index">{project.index}</span>
                <strong>{project.shortTitle}</strong>
                <small>{project.proof[0].value} · {project.proof[0].label}</small>
              </button>
            );
          })}

          {capabilities.map((capability) => {
            const selected = activeCapability === capability.id;
            return (
              <button
                key={capability.id}
                ref={nodeRefs.get(capabilityNodeId(capability.id))}
                type="button"
                className={`network-capability${selected ? ' is-selected' : ''}`}
                style={{ '--x': `${capability.position.x}%`, '--y': `${capability.position.y}%` }}
                onClick={() => onCapabilityChange(selected ? null : capability.id)}
                aria-pressed={selected}
              >
                <span aria-hidden="true">+</span> {capability.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="network-caption" aria-live="polite">
          <span>{activeCapabilityData ? 'Capability selected' : 'How to explore'}</span>
          <p>{activeCapabilityData ? activeCapabilityData.description : 'Select a capability to trace it across projects, or open a project node for the full system walkthrough.'}</p>
        </div>
      </motion.div>
    </section>
  );
}
