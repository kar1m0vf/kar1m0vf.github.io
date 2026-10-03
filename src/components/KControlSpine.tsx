import { useEffect, useRef } from 'react';
import { kControlSections, type SiteSectionId } from '../data/siteSections';

export function KControlSpine({ activeSection, enabled }: { activeSection: SiteSectionId; enabled: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const svg = svgRef.current;
    const nav = svg?.parentElement;
    if (!enabled || !svg || !nav) return;
    const path = svg.querySelector('path');
    if (!path) return;
    const points = Array.from(svg.querySelectorAll('circle'));
    const links = Array.from(nav.querySelectorAll<HTMLElement>('.k-control__destination'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, frame = 0;
    let lastTime: number | null = null;
    let rowCenters: number[] = [], knots: number[] = [];

    const draw = () => {
      if (!width || !height) return;
      const amplitude = width * .16;
      const frequency = Math.PI * 3.3 / height;
      const x = (y: number) => width / 2 + amplitude * Math.sin(y * frequency - phaseRef.current);
      const slope = (y: number) => amplitude * frequency * Math.cos(y * frequency - phaseRef.current);
      let d = `M${x(0).toFixed(3)} 0`;
      let start = 0;
      for (const end of knots.slice(1)) {
        const third = (end - start) / 3;
        d += `C${(x(start) + slope(start) * third).toFixed(3)} ${(start + third).toFixed(3)} ${
          (x(end) - slope(end) * third).toFixed(3)} ${(end - third).toFixed(3)} ${x(end).toFixed(3)} ${end.toFixed(3)}`;
        start = end;
      }
      path.setAttribute('d', d);
      rowCenters.forEach((y, index) => points[index]?.setAttribute('cx', x(y).toFixed(3)));
    };

    const tick = (time: number) => {
      if (reduced.matches || document.hidden) { frame = 0; return; }
      // Resume from the same phase after a pause instead of catching up in one jump.
      if (lastTime !== null) phaseRef.current = (phaseRef.current + Math.min(time - lastTime, 64) * Math.PI * 2 / 5_000) % (Math.PI * 2);
      lastTime = time;
      draw();
      frame = requestAnimationFrame(tick);
    };

    const syncMotion = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
      draw();
      if (!reduced.matches && !document.hidden && height > 0) frame = requestAnimationFrame(tick);
    };

    const measure = () => {
      width = svg.clientWidth;
      height = nav.offsetHeight;
      if (!width || !height) return;
      // Layout coordinates stay accurate during the dialog's scale entrance.
      rowCenters = links.map(link => link.offsetTop + link.offsetHeight / 2);
      const samples = new Set([0, height, ...rowCenters]);
      for (let y = 8; y < height; y += 8) samples.add(y);
      knots = [...samples].sort((a, b) => a - b);
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      rowCenters.forEach((y, index) => points[index]?.setAttribute('cy', String(y)));
      // Every dot centre is also a path endpoint, so both share exact geometry.
      syncMotion();
      svg.dataset.ready = 'true';
    };

    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    links.forEach(link => observer.observe(link));
    measure();
    reduced.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncMotion);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      reduced.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncMotion);
    };
  }, [enabled]);

  return (
    <svg aria-hidden="true" className="k-control__spine" fill="none" focusable="false"
      preserveAspectRatio="none" ref={svgRef} viewBox="0 0 20 364">
      <path />
      {kControlSections.map(section => (
        <circle className="k-control__point" data-active={section.id === activeSection ? 'true' : undefined} key={section.id} />
      ))}
    </svg>
  );
}
