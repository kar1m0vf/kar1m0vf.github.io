import { useEffect, useRef } from 'react';
import { kControlSections, type SiteSectionId } from '../data/siteSections';

export function KControlSpine({ activeSection, enabled }: { activeSection: SiteSectionId; enabled: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const phaseRef = useRef(0);
  const activeSectionRef = useRef(activeSection);
  const drawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    activeSectionRef.current = activeSection;
    drawRef.current?.();
  }, [activeSection]);

  useEffect(() => {
    const svg = svgRef.current;
    const nav = svg?.parentElement;
    if (!enabled || !svg || !nav) return;
    const path = svg.querySelector('.k-control__wave');
    const selection = svg.querySelector('.k-control__selection');
    const selectionEdge = svg.querySelector('.k-control__selection-edge');
    if (!path || !selection || !selectionEdge) return;
    const points = Array.from(svg.querySelectorAll('circle'));
    const links = Array.from(nav.querySelectorAll<HTMLElement>('.k-control__destination'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, right = 0, frame = 0;
    let lastTime: number | null = null;
    let rowCenters: number[] = [], knots: number[] = [];
    let rows: { top: number; bottom: number }[] = [];

    const draw = () => {
      if (!width || !height) return;
      const amplitude = width * .16;
      const frequency = Math.PI * 3.3 / height;
      const x = (y: number) => width / 2 + amplitude * Math.sin(y * frequency - phaseRef.current);
      const slope = (y: number) => amplitude * frequency * Math.cos(y * frequency - phaseRef.current);
      const selectedIndex = kControlSections.findIndex(section => section.id === activeSectionRef.current);
      const selectedRow = rows[selectedIndex];
      let d = `M${x(0).toFixed(3)} 0`;
      let selectedCurve = '';
      let start = 0;
      for (const end of knots.slice(1)) {
        const third = (end - start) / 3;
        const segment = `C${(x(start) + slope(start) * third).toFixed(3)} ${(start + third).toFixed(3)} ${
          (x(end) - slope(end) * third).toFixed(3)} ${(end - third).toFixed(3)} ${x(end).toFixed(3)} ${end.toFixed(3)}`;
        d += segment;
        if (selectedRow && start >= selectedRow.top && end <= selectedRow.bottom) selectedCurve += segment;
        start = end;
      }
      path.setAttribute('d', d);
      if (selectedRow) {
        // The fill reuses the wave's cubic segments, so its left edge never
        // drifts away from the moving line, even between the row's endpoints.
        selection.setAttribute('d', `M${x(selectedRow.top).toFixed(3)} ${selectedRow.top.toFixed(3)}${selectedCurve}`
          + `L${right.toFixed(3)} ${selectedRow.bottom.toFixed(3)}L${right.toFixed(3)} ${selectedRow.top.toFixed(3)}Z`);
        selectionEdge.setAttribute('d', `M${x(selectedRow.bottom).toFixed(3)} ${selectedRow.bottom.toFixed(3)}H${right.toFixed(3)}`);
      } else {
        selection.removeAttribute('d');
        selectionEdge.removeAttribute('d');
      }
      svg.dataset.activeSection = activeSectionRef.current;
      rowCenters.forEach((y, index) => points[index]?.setAttribute('cx', x(y).toFixed(3)));
    };
    drawRef.current = draw;

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
      rows = links.map(link => ({ top: link.offsetTop, bottom: link.offsetTop + link.offsetHeight }));
      rowCenters = rows.map(row => (row.top + row.bottom) / 2);
      const body = nav.closest('.k-control__body');
      const paddingRight = body ? parseFloat(getComputedStyle(body).paddingRight) || 0 : 0;
      right = nav.clientWidth + paddingRight - (parseFloat(getComputedStyle(svg).left) || 0);
      const samples = new Set([0, height, ...rowCenters, ...rows.flatMap(row => [row.top, row.bottom])]);
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
      drawRef.current = null;
      observer.disconnect();
      reduced.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncMotion);
    };
  }, [enabled]);

  return (
    <svg aria-hidden="true" className="k-control__spine" fill="none" focusable="false"
      preserveAspectRatio="none" ref={svgRef} viewBox="0 0 20 364">
      <path className="k-control__selection" />
      <path className="k-control__selection-edge" />
      <path className="k-control__wave" />
      {kControlSections.map(section => (
        <circle className="k-control__point" data-active={section.id === activeSection ? 'true' : undefined} key={section.id} />
      ))}
    </svg>
  );
}
