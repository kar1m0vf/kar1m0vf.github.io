import { useEffect, useState } from 'react';
import { siteSections, type SiteSectionId } from '../data/siteSections';

const activationPoint = 0.42;

export function useActiveSection(disabled = false) {
  const [activeId, setActiveId] = useState<SiteSectionId>('top');

  useEffect(() => {
    if (disabled) return;

    const sectionElements = siteSections.flatMap((section) => {
      const element = document.getElementById(section.id);
      return element ? [{ element, section }] : [];
    });

    if (sectionElements.length === 0) return;

    const updateActiveSection = () => {
      const viewportMarker = window.innerHeight * activationPoint;
      const containingMarker = sectionElements.find(({ element }) => {
        const bounds = element.getBoundingClientRect();
        return bounds.top <= viewportMarker && bounds.bottom > viewportMarker;
      });

      const nextSection = containingMarker?.section
        ?? sectionElements.reduce((closest, candidate) => {
          const closestDistance = Math.abs(closest.element.getBoundingClientRect().top - viewportMarker);
          const candidateDistance = Math.abs(candidate.element.getBoundingClientRect().top - viewportMarker);
          return candidateDistance < closestDistance ? candidate : closest;
        }).section;

      setActiveId((current) => (current === nextSection.id ? current : nextSection.id));
    };

    const observer = new IntersectionObserver(updateActiveSection, {
      rootMargin: '-41% 0px -58% 0px',
      threshold: 0,
    });

    sectionElements.forEach(({ element }) => observer.observe(element));
    updateActiveSection();

    return () => observer.disconnect();
  }, [disabled]);

  return activeId;
}
