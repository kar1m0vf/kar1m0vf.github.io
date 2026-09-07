import { useCallback, useEffect, useState } from 'react';
import { BuilderModeHud } from './components/BuilderMode';
import { Contact } from './components/Contact';
import { ExperienceRail } from './components/ExperienceRail';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Journey } from './components/Journey';
import { KControl } from './components/KControl';
import { Method } from './components/Method';
import { SiteLoader } from './components/SiteLoader';
import { WorkSequence } from './components/WorkSequence';
import { MiddleThread } from './components/thread/MiddleThread';
import { siteSections } from './data/siteSections';
import { useActiveSection } from './hooks/useActiveSection';

const builderPreferenceKey = 'portfolio:builder:v1';

function readBuilderPreference() {
  try { return window.localStorage.getItem(builderPreferenceKey) === 'true'; }
  catch { return false; }
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [heroReady, setHeroReady] = useState(false);
  const [builderMode, setBuilderMode] = useState(readBuilderPreference);
  const activeSectionId = useActiveSection(isLoading);
  const activeSection = siteSections.find((section) => section.id === activeSectionId) ?? siteSections[0];
  const handleHeroReady = useCallback(() => setHeroReady(true), []);

  useEffect(() => {
    if (isLoading || !window.location.hash) return;
    // The initial fragment may be resolved before React mounts or while the page is inert.
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isLoading]);

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
    try { window.localStorage.setItem(builderPreferenceKey, String(builderMode)); }
    catch { /* The setting still works when storage is unavailable. */ }
    return () => { delete root.dataset.builderMode; };
  }, [builderMode]);

  return (
    <>
      {isLoading ? <SiteLoader heroReady={heroReady} onComplete={() => setIsLoading(false)} /> : null}
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
          <Hero onReady={handleHeroReady} />
          <MiddleThread>
            <Method />
            <WorkSequence builderMode={builderMode} />
            <Journey />
          </MiddleThread>
          <Contact />
        </main>
      </div>
    </>
  );
}
