import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, SyntheticEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { ProjectMedia } from '../types';
import { projectWorlds } from '../data/projects';

const minimumVisibleTime = 2000;
const maximumWaitTime = 15000;
const fontAssetId = 'portfolio-fonts';
const heroSceneAssetId = 'hero-thread-scene';

interface LoaderMedia {
  id: string;
  media: ProjectMedia;
  sizes: string;
}

interface SiteLoaderProps {
  heroReady: boolean;
  onComplete: () => void;
}

const journeyBackdrop: ProjectMedia = {
  alt: '',
  avifSrcSet: '/media/journey/baku-1280.avif 1280w, /media/journey/baku-1920.avif 1672w',
  caption: 'Baku skyline',
  height: 941,
  src: '/media/journey/baku-1920.webp',
  srcSet: '/media/journey/baku-1280.webp 1280w, /media/journey/baku-1920.webp 1672w',
  width: 1672,
};

const loaderMedia: readonly LoaderMedia[] = [
  ...projectWorlds.flatMap((project) => {
    if (project.theme !== 'nar' && project.theme !== 'blaster') return [];

    return project.media.map((media) => ({
      id: media.src,
      media,
      sizes: project.theme === 'nar'
        ? '(min-width: 1100px) 68vw, 94vw'
        : '(min-width: 901px) min(78rem, 108vw), 94vw',
    }));
  }),
  {
    id: journeyBackdrop.src,
    media: journeyBackdrop,
    sizes: '100vw',
  },
] as const;

const totalAssetCount = loaderMedia.length + 2;

export function SiteLoader({ heroReady, onComplete }: SiteLoaderProps) {
  const reduceMotion = useReducedMotion();
  const startedAtRef = useRef(performance.now());
  const completedAssetsRef = useRef(new Set<string>());
  const completionReportedRef = useRef(false);
  const completedCountRef = useRef(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  const markAssetReady = useCallback((id: string) => {
    const completedAssets = completedAssetsRef.current;
    if (completedAssets.has(id)) return;

    completedAssets.add(id);
    completedCountRef.current = completedAssets.size;
    setCompletedCount(completedAssets.size);
  }, []);

  const decodeImage = useCallback((id: string, image: HTMLImageElement) => {
    if (!image.complete) return;
    if (!image.naturalWidth) {
      markAssetReady(id);
      return;
    }

    void image.decode()
      .catch(() => undefined)
      .then(() => markAssetReady(id));
  }, [markAssetReady]);

  const handleImageLoad = useCallback((id: string, event: SyntheticEvent<HTMLImageElement>) => {
    decodeImage(id, event.currentTarget);
  }, [decodeImage]);

  const handleImageError = useCallback((id: string) => {
    setUsedFallback(true);
    markAssetReady(id);
  }, [markAssetReady]);

  useLayoutEffect(() => {
    document.documentElement.dataset.siteLoading = 'true';
    return () => {
      delete document.documentElement.dataset.siteLoading;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const prepareFonts = async () => {
      if (!('fonts' in document)) return;

      await Promise.all([
        document.fonts.load('400 1em "Instrument Serif"'),
        document.fonts.load('400 1em "Manrope Variable"'),
        document.fonts.ready,
      ]);
    };

    void prepareFonts()
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) markAssetReady(fontAssetId);
      });

    return () => {
      cancelled = true;
    };
  }, [markAssetReady]);

  useEffect(() => {
    if (heroReady) markAssetReady(heroSceneAssetId);
  }, [heroReady, markAssetReady]);

  useEffect(() => {
    if (isExiting) return;

    let animationFrame = 0;
    const updateProgress = (time: number) => {
      const elapsed = time - startedAtRef.current;
      const timeCap = Math.min(1, elapsed / minimumVisibleTime);
      const resourceProgress = completedCountRef.current / totalAssetCount;
      const nextProgress = Math.round(Math.min(resourceProgress, timeCap) * 100);

      setDisplayProgress((current) => current === nextProgress ? current : nextProgress);
      animationFrame = window.requestAnimationFrame(updateProgress);
    };

    animationFrame = window.requestAnimationFrame(updateProgress);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isExiting]);

  useEffect(() => {
    if (completedCount < totalAssetCount || isExiting) return;

    const remaining = Math.max(0, minimumVisibleTime - (performance.now() - startedAtRef.current));
    const timer = window.setTimeout(() => {
      setDisplayProgress(100);
      setIsExiting(true);
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [completedCount, isExiting]);

  useEffect(() => {
    if (isExiting) return;

    const fallbackTimer = window.setTimeout(() => {
      setUsedFallback(true);
      setDisplayProgress(100);
      setIsExiting(true);
    }, maximumWaitTime);

    return () => window.clearTimeout(fallbackTimer);
  }, [isExiting]);

  const completeLoader = () => {
    if (!isExiting || completionReportedRef.current) return;
    completionReportedRef.current = true;
    onComplete();
  };

  const loaderStyle = {
    '--loader-progress': displayProgress / 100,
  } as CSSProperties;

  return (
    <motion.div
      animate={isExiting ? { opacity: 0 } : { opacity: 1 }}
      aria-live="polite"
      className={`site-loader${isExiting ? ' site-loader--exit' : ''}`}
      initial={false}
      onAnimationComplete={completeLoader}
      role="status"
      transition={{
        delay: reduceMotion ? 0 : 0.12,
        duration: reduceMotion ? 0 : 0.44,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="site-loader__scope" style={loaderStyle}>
        <span className="sr-only">
          {isExiting ? 'Portfolio ready.' : usedFallback ? 'Loading portfolio with available media.' : 'Loading portfolio.'}
        </span>
        <div aria-hidden="true" className="site-loader__identity">
          <p className="site-loader__name">Kamil Kerimov</p>
          <svg className="site-loader__thread" fill="none" viewBox="0 0 300 90">
            <path className="site-loader__thread-base" d="M207 18C118 9 12 24 12 45S137 82 250 63S234 17 207 18" />
            <path className="site-loader__thread-live" d="M207 18C118 9 12 24 12 45S137 82 250 63S234 17 207 18" pathLength="1" />
          </svg>
          <div className="site-loader__readout">
            <span>{isExiting ? 'Ready to explore' : 'Loading portfolio'}</span>
            <output>{String(displayProgress).padStart(2, '0')}%</output>
          </div>
        </div>

        <div aria-hidden="true" className="site-loader__preloads">
          {loaderMedia.map(({ id, media, sizes }, index) => (
            <picture key={id}>
              <source sizes={sizes} srcSet={media.avifSrcSet} type="image/avif" />
              <source sizes={sizes} srcSet={media.srcSet} type="image/webp" />
              <img
                alt=""
                decoding="async"
                fetchPriority={index === 0 ? 'high' : 'auto'}
                height={media.height}
                loading="eager"
                onError={() => handleImageError(id)}
                onLoad={(event) => handleImageLoad(id, event)}
                ref={(image) => {
                  if (image?.complete) queueMicrotask(() => decodeImage(id, image));
                }}
                sizes={sizes}
                src={media.src}
                srcSet={media.srcSet}
                width={media.width}
              />
            </picture>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
