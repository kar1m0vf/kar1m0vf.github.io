import { Contact } from './components/Contact';
import { ExperienceRail } from './components/ExperienceRail';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Journey } from './components/Journey';
import { LoopTrace } from './components/LoopTrace';
import { Method } from './components/Method';
import { ProjectChapter } from './components/ProjectChapter';
import { projectWorlds } from './data/projects';

export default function App() {
  return (
    <>
      <Header />
      <ExperienceRail />
      <main id="main-content">
        <Hero />
        <Method />
        <div className="work" id="work">
          {projectWorlds.map((project) => (
            <ProjectChapter key={project.id} project={project} />
          ))}
        </div>
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
    </>
  );
}
