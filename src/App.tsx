import { useEffect, useState } from 'react';
import { BuilderModeHud } from './components/BuilderMode';
import { Contact } from './components/Contact';
import { ExperienceRail } from './components/ExperienceRail';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Journey } from './components/Journey';
import { KControl } from './components/KControl';
import { LoopTrace } from './components/LoopTrace';
import { Method } from './components/Method';
import { SiteLoader } from './components/SiteLoader';
import { WorkSequence } from './components/WorkSequence';
import { siteSections } from './data/siteSections';
import { useActiveSection } from './hooks/useActiveSection';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [builderMode, setBuilderMode] = useState(false);
  const activeSectionId = useActiveSection(isLoading);
  const activeSection = siteSections.find((section) => section.id === activeSectionId) ?? siteSections[0];

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.experienceSection = activeSection.id;
    root.dataset.experienceTheme = activeSection.theme;

    return () => {
      delete root.dataset.experienceSection;
      delete root.dataset.experienceTheme;
    };
  }, [activeSection]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.builderMode = builderMode ? 'true' : 'false';
    return () => { delete root.dataset.builderMode; };
  }, [builderMode]);

  return (
    <>
      {isLoading ? <SiteLoader onComplete={() => setIsLoading(false)} /> : null}
      <div aria-busy={isLoading} aria-hidden={isLoading} className="site" inert={isLoading ? true : undefined}>
        <Header />
        <ExperienceRail activeId={activeSectionId} />
        <KControl
          activeSection={activeSectionId}
          builderMode={builderMode}
          disabled={isLoading}
          onBuilderModeChange={setBuilderMode}
        />
        <BuilderModeHud
          activeSection={activeSectionId}
          enabled={builderMode}
          onDisable={() => setBuilderMode(false)}
        />
        <main id="main-content">
          <Hero />
          <Method />
          <WorkSequence builderMode={builderMode} />
          <div className="finale">
            <LoopTrace className="finale__trace" variant="finale" />
            <picture aria-hidden="true" className="finale__backdrop">
              <source
                srcSet="/media/journey/baku-1280.avif 1280w, /media/journey/baku-1920.avif 1672w"
                type="image/avif"
              />
              <img
                alt=""
                decoding="async"
                height="941"
                loading="lazy"
                src="/media/journey/baku-1920.webp"
                srcSet="/media/journey/baku-1280.webp 1280w, /media/journey/baku-1920.webp 1672w"
                width="1672"
              />
            </picture>
            <Journey />
            <Contact />
          </div>
        </main>
      </div>
    </>
  );
}
