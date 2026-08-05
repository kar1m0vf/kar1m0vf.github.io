import { useEffect, useState } from 'react';

type ExperienceSectionId =
  | 'top'
  | 'method'
  | 'nar'
  | 'trendyol'
  | 'blaster'
  | 'journey'
  | 'contact';

type ExperienceTheme = 'blue' | 'nar' | 'trendyol' | 'blaster';

interface ExperienceSection {
  id: ExperienceSectionId;
  index: string;
  label: string;
  theme: ExperienceTheme;
}

const experienceSections = [
  { id: 'top', index: '01', label: 'Start', theme: 'blue' },
  { id: 'method', index: '02', label: 'Junction', theme: 'blue' },
  { id: 'nar', index: '03', label: 'Nar', theme: 'nar' },
  { id: 'trendyol', index: '04', label: 'Trendyol', theme: 'trendyol' },
  { id: 'blaster', index: '05', label: 'Blaster', theme: 'blaster' },
  { id: 'journey', index: '06', label: 'Journey', theme: 'blue' },
  { id: 'contact', index: '07', label: 'Contact', theme: 'blue' },
] as const satisfies readonly ExperienceSection[];

const activationPoint = 0.42;

export function ExperienceRail() {
  const [activeId, setActiveId] = useState<ExperienceSectionId>('top');

  useEffect(() => {
    const sectionElements = experienceSections.flatMap((section) => {
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
  }, []);

  const activeIndex = Math.max(0, experienceSections.findIndex((section) => section.id === activeId));
  const activeSection = experienceSections[activeIndex] ?? experienceSections[0];
  const progress = activeIndex / (experienceSections.length - 1);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.experienceSection = activeSection.id;
    root.dataset.experienceTheme = activeSection.theme;

    return () => {
      delete root.dataset.experienceSection;
      delete root.dataset.experienceTheme;
    };
  }, [activeSection]);

  return (
    <nav
      aria-label="Portfolio sections"
      className={`experience-rail experience-rail--${activeSection.theme}`}
      data-active-section={activeSection.id}
      data-theme={activeSection.theme}
    >
      <span aria-hidden="true" className="experience-rail__progress">
        <span
          className="experience-rail__progress-fill"
          style={{ transform: `scaleY(${progress})` }}
        />
      </span>
      <ol className="experience-rail__list">
        {experienceSections.map((section) => {
          const isActive = section.id === activeSection.id;

          return (
            <li
              className={`experience-rail__item${isActive ? ' is-active' : ''}`}
              key={section.id}
            >
              <a
                aria-current={isActive ? 'location' : undefined}
                className="experience-rail__link"
                href={`#${section.id}`}
                onClick={() => setActiveId(section.id)}
              >
                <span aria-hidden="true" className="experience-rail__marker" />
                <span className="experience-rail__index">{section.index}</span>
                <span className="experience-rail__label">{section.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
