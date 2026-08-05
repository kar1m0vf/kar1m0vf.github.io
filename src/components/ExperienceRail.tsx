import { siteSections, type SiteSectionId } from '../data/siteSections';

interface ExperienceRailProps {
  activeId: SiteSectionId;
}

export function ExperienceRail({ activeId }: ExperienceRailProps) {
  const activeIndex = Math.max(0, siteSections.findIndex((section) => section.id === activeId));
  const activeSection = siteSections[activeIndex] ?? siteSections[0];
  const progress = activeIndex / (siteSections.length - 1);

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
        {siteSections.map((section) => {
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
