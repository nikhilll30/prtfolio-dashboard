import { createRef, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import useNetworkCanvas from '../hooks/useNetworkCanvas';

export default function ArchitectureSimulator({ project }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const nodeRefs = useMemo(() => new Map(project.architecture.nodes.map((node) => [
    node.id,
    createRef(),
  ])), [project.architecture.nodes]);
  const stage = project.architecture.stages[activeIndex];

  const activeIds = useMemo(() => stage.activeNodes, [stage]);

  useNetworkCanvas({
    containerRef,
    canvasRef,
    nodeRefs,
    edges: project.architecture.edges,
    activeIds,
    accent: project.accent,
    animate: isPlaying,
  });

  useEffect(() => {
    if (!isPlaying || reduceMotion) return undefined;

    const timer = window.setTimeout(() => {
      if (activeIndex === project.architecture.stages.length - 1) {
        setIsPlaying(false);
      } else {
        setActiveIndex((current) => current + 1);
      }
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [activeIndex, isPlaying, project.architecture.stages.length, reduceMotion]);

  const handlePlay = () => {
    if (reduceMotion) {
      setActiveIndex((current) => (current + 1) % project.architecture.stages.length);
      return;
    }
    if (activeIndex === project.architecture.stages.length - 1) setActiveIndex(0);
    setIsPlaying((current) => !current);
  };

  return (
    <section className="architecture-section" aria-labelledby="architecture-title">
      <div className="case-section-heading">
        <div>
          <p className="eyebrow">Interactive architecture simulation</p>
          <h2 id="architecture-title">Follow the request through the system.</h2>
        </div>
        <p>Deterministic walkthrough based on the documented architecture—not a live model run.</p>
      </div>

      <div className="architecture-simulator" style={{ '--project-accent': project.accent, '--project-rgb': project.accentRgb }}>
        <div className="architecture-toolbar">
          <div className="architecture-toolbar__status">
            <span>Walkthrough</span>
            <strong>{String(activeIndex + 1).padStart(2, '0')} / {String(project.architecture.stages.length).padStart(2, '0')}</strong>
          </div>
          <button className="button button--compact button--project" type="button" onClick={handlePlay}>
            {reduceMotion ? 'Next step' : isPlaying ? 'Pause walkthrough' : 'Play walkthrough'}
          </button>
        </div>

        <div className="architecture-layout">
          <div className="architecture-steps" role="tablist" aria-label="Architecture stages">
            {project.architecture.stages.map((item, index) => (
              <button
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                key={item.label}
                className={index === activeIndex ? 'is-active' : ''}
                onClick={() => {
                  setActiveIndex(index);
                  setIsPlaying(false);
                }}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="architecture-stage">
            <div className="architecture-map" ref={containerRef} aria-hidden="true">
              <canvas ref={canvasRef} className="architecture-canvas" />
              <div className="architecture-grid" />
              {project.architecture.nodes.map((node) => {
                const isActive = activeIds.includes(node.id);
                return (
                  <div
                    key={node.id}
                    ref={nodeRefs.get(node.id)}
                    className={`architecture-node${isActive ? ' is-active' : ''}`}
                    style={{ '--x': `${node.x}%`, '--y': `${node.y}%` }}
                  >
                    <span>{node.label}</span>
                    <small>{node.meta}</small>
                  </div>
                );
              })}
            </div>

            <ol className="architecture-mobile-flow" aria-label="System components">
              {project.architecture.nodes.map((node) => (
                <li key={node.id} className={activeIds.includes(node.id) ? 'is-active' : ''}>
                  <span>{node.label}</span><small>{node.meta}</small>
                </li>
              ))}
            </ol>

            <div className="architecture-narrative" role="tabpanel" aria-live="polite">
              <div>
                <span className="architecture-narrative__step">Step {String(activeIndex + 1).padStart(2, '0')}</span>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
              </div>
              <code>{stage.output}</code>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
