import { motion, useScroll, useTransform } from 'motion/react';
import type { RefObject } from 'react';
import { HeartIcon } from './Icons';

interface NarTrackerHandoffProps {
  targetRef: RefObject<HTMLElement | null>;
}

export function NarTrackerHandoff({ targetRef }: NarTrackerHandoffProps) {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start 92%', 'start 34%'],
  });

  const stageY = useTransform(scrollYProgress, [0, 0.72, 1], ['0%', '0%', '-102%']);
  const surfaceScaleX = useTransform(scrollYProgress, [0, 0.28, 0.58, 0.74], [1, 1, 0.78, 0.78]);
  const surfaceScaleY = useTransform(scrollYProgress, [0, 0.28, 0.58, 0.78], [1, 1, 0.15, 0.15]);
  const surfaceOpacity = useTransform(scrollYProgress, [0, 0.66, 0.8], [1, 1, 0]);
  const statementOpacity = useTransform(scrollYProgress, [0, 0.12, 0.34, 0.5], [0.25, 1, 1, 0]);
  const statementY = useTransform(scrollYProgress, [0, 0.34, 0.5], [18, 0, -24]);

  const cardOpacity = useTransform(scrollYProgress, [0.38, 0.52, 0.82, 0.96], [0, 1, 1, 0]);
  const cardScaleX = useTransform(scrollYProgress, [0.38, 0.58], [0.78, 1]);
  const cardY = useTransform(scrollYProgress, [0.38, 0.58, 0.88], [22, 0, -8]);
  const narStateOpacity = useTransform(scrollYProgress, [0.46, 0.57, 0.66], [1, 1, 0]);
  const trackerStateOpacity = useTransform(scrollYProgress, [0.57, 0.68, 0.92], [0, 1, 1]);
  const trackerStateX = useTransform(scrollYProgress, [0.57, 0.7], [22, 0]);

  const fieldOpacity = useTransform(scrollYProgress, [0.32, 0.58], [0.35, 1]);
  const observeOpacity = useTransform(scrollYProgress, [0.5, 0.66, 0.88], [0, 1, 0.34]);
  const observeX = useTransform(scrollYProgress, [0.5, 0.72], ['8%', '0%']);
  const gateScale = useTransform(scrollYProgress, [0.54, 0.78], [0.82, 1]);
  const gateOpacity = useTransform(scrollYProgress, [0.54, 0.76], [0, 1]);
  const scanX = useTransform(scrollYProgress, [0.52, 0.9], ['-35%', '35%']);

  return (
    <motion.div
      aria-hidden="true"
      className="world-handoff"
      style={{ y: stageY }}
    >
      <motion.div className="world-handoff__field" style={{ opacity: fieldOpacity }}>
        <span className="world-handoff__index">02</span>
        <motion.span
          className="world-handoff__observe"
          style={{ opacity: observeOpacity, x: observeX }}
        >
          Observe
        </motion.span>
        <motion.div
          className="world-handoff__gates"
          style={{ opacity: gateOpacity, scale: gateScale }}
        >
          <i /><i /><i />
        </motion.div>
        <motion.span className="world-handoff__scan" style={{ x: scanX }} />
      </motion.div>

      <motion.div
        className="world-handoff__surface"
        style={{
          opacity: surfaceOpacity,
          scaleX: surfaceScaleX,
          scaleY: surfaceScaleY,
        }}
      >
        <span className="world-handoff__glaze" />
        <motion.div
          className="world-handoff__statement"
          style={{ opacity: statementOpacity, y: statementY }}
        >
          <span>01 · State retained</span>
          <strong>A choice should survive the route.</strong>
        </motion.div>
      </motion.div>

      <motion.div
        className="world-handoff__card"
        style={{ opacity: cardOpacity, scaleX: cardScaleX, y: cardY }}
      >
        <div className="world-handoff__product">
          <picture>
            <source
              sizes="(min-width: 1100px) 68vw, 94vw"
              srcSet="/media/nar/product-720.avif 720w, /media/nar/product-960.avif 960w, /media/nar/product-1440.avif 1440w"
              type="image/avif"
            />
            <source
              sizes="(min-width: 1100px) 68vw, 94vw"
              srcSet="/media/nar/product-720.webp 720w, /media/nar/product-960.webp 960w, /media/nar/product-1440.webp 1440w"
              type="image/webp"
            />
            <img
              alt=""
              decoding="async"
              height="1000"
              loading="lazy"
              sizes="(min-width: 1100px) 68vw, 94vw"
              src="/media/nar/product-1440.webp"
              srcSet="/media/nar/product-720.webp 720w, /media/nar/product-960.webp 960w, /media/nar/product-1440.webp 1440w"
              width="1440"
            />
          </picture>
          <span className="world-handoff__heart"><HeartIcon filled /></span>
          <motion.span className="world-handoff__beacon" style={{ opacity: trackerStateOpacity }} />
        </div>

        <div className="world-handoff__copy">
          <motion.span style={{ opacity: narStateOpacity }}>Saved choice</motion.span>
          <motion.span
            className="world-handoff__tracker-label"
            style={{ opacity: trackerStateOpacity, x: trackerStateX }}
          >
            Price changed
          </motion.span>
          <strong>Chocolate Cake</strong>
        </div>

        <div className="world-handoff__value">
          <motion.span style={{ opacity: narStateOpacity }}>28.90 AZN · saved</motion.span>
          <motion.span
            className="world-handoff__price"
            style={{ opacity: trackerStateOpacity, x: trackerStateX }}
          >
            <s>₺1,159</s>
            <strong>₺1,099</strong>
          </motion.span>
        </div>

        <div className="world-handoff__state">
          <motion.span style={{ opacity: narStateOpacity }}>Remembered</motion.span>
          <motion.span style={{ opacity: trackerStateOpacity, x: trackerStateX }}>Observed</motion.span>
        </div>
      </motion.div>
    </motion.div>
  );
}
