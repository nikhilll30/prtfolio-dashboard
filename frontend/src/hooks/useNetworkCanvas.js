import { useEffect } from 'react';

const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

export default function useNetworkCanvas({
  containerRef,
  canvasRef,
  nodeRefs,
  edges,
  activeIds = [],
  accent = '#ff6339',
  animate = true,
}) {
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    const context = canvas.getContext('2d');
    const active = new Set(activeIds);
    const accentRgb = hexToRgb(accent);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId;
    let isVisible = true;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const centerFor = (id) => {
      const node = nodeRefs.get(id)?.current;
      if (!node) return null;
      const nodeRect = node.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return {
        x: nodeRect.left - containerRect.left + nodeRect.width / 2,
        y: nodeRect.top - containerRect.top + nodeRect.height / 2,
      };
    };

    const draw = (time = 0) => {
      context.clearRect(0, 0, width, height);

      edges.forEach(([fromId, toId], index) => {
        const from = centerFor(fromId);
        const to = centerFor(toId);
        if (!from || !to) return;

        const isActive = active.size > 0 && active.has(fromId) && active.has(toId);
        const touchesActive = active.has(fromId) || active.has(toId);
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.lineWidth = isActive ? 1.5 : 1;
        context.strokeStyle = isActive
          ? `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.78)`
          : touchesActive
            ? `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.28)`
            : 'rgba(240, 238, 231, 0.115)';
        context.stroke();

        if (isActive && animate && !reduceMotion) {
          const progress = ((time / 1800) + index * 0.19) % 1;
          const x = from.x + (to.x - from.x) * progress;
          const y = from.y + (to.y - from.y) * progress;
          context.beginPath();
          context.arc(x, y, 2.4, 0, Math.PI * 2);
          context.fillStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.95)`;
          context.shadowColor = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.8)`;
          context.shadowBlur = 10;
          context.fill();
          context.shadowBlur = 0;
        }
      });

      if (isVisible && animate && !reduceMotion) frameId = window.requestAnimationFrame(draw);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduceMotion || !animate) draw();
    });
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting && document.visibilityState === 'visible';
      window.cancelAnimationFrame(frameId);
      if (isVisible) frameId = window.requestAnimationFrame(draw);
    }, { rootMargin: '120px' });

    const handleVisibility = () => {
      isVisible = document.visibilityState === 'visible';
      window.cancelAnimationFrame(frameId);
      if (isVisible) frameId = window.requestAnimationFrame(draw);
    };

    resize();
    resizeObserver.observe(container);
    intersectionObserver.observe(container);
    document.addEventListener('visibilitychange', handleVisibility);
    frameId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [containerRef, canvasRef, nodeRefs, edges, activeIds, accent, animate]);
}
