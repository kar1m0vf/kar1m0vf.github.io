import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import './PriceHistoryChart.css';

interface PriceHistoryChartProps {
  currentPrice: number;
  targetPrice: number;
  previousPrice: number;
  min: number;
  max: number;
}

const priceFormatter = new Intl.NumberFormat('en-US');
const formatPrice = (value: number) => `₺${priceFormatter.format(value)}`;
const plot = { left: 12, right: 308, top: 10, bottom: 94 };

export function PriceHistoryChart({ currentPrice, targetPrice, previousPrice, min, max }: PriceHistoryChartProps) {
  const chartId = `price-history-${useId()}`;
  const reduceMotion = useReducedMotion();
  const prices = [1250, 1210, 1260, 1170, 1190, previousPrice, currentPrice];
  const low = Math.min(min, targetPrice, ...prices);
  const high = Math.max(max, targetPrice, ...prices);
  const span = Math.max(high - low, 1);
  const priceY = (price: number) => plot.bottom - (price - low) / span * (plot.bottom - plot.top);
  const pricePath = prices.map((price, index) => {
    const x = plot.left + index / (prices.length - 1) * (plot.right - plot.left);
    return `${index ? 'L' : 'M'}${x.toFixed(2)},${priceY(price).toFixed(2)}`;
  }).join(' ');
  const areaPath = `${pricePath} L${plot.right},${plot.bottom} L${plot.left},${plot.bottom} Z`;
  const targetPath = `M${plot.left},${priceY(targetPrice).toFixed(2)} H${plot.right}`;
  const transition = { duration: reduceMotion ? 0 : .25 };

  return (
    <figure className="price-history-chart">
      <figcaption className="price-history-chart__heading">
        <strong>Price history</strong>
        <span>Illustrative · ₺</span>
      </figcaption>
      <div className="price-history-chart__legend" aria-hidden="true">
        <span><i className="price-history-chart__price-key" />Price</span>
        <span><i className="price-history-chart__target-key" />Your target <strong>{formatPrice(targetPrice)}</strong></span>
      </div>
      <svg className="price-history-chart__plot" role="img" viewBox="0 0 320 104" preserveAspectRatio="none"
        aria-labelledby={`${chartId}-title`} aria-describedby={`${chartId}-description`}>
        <title id={`${chartId}-title`}>Illustrative price history</title>
        <desc id={`${chartId}-description`}>
          Seven example price checks in Turkish lira (₺). The orange line shows price, ending at {formatPrice(currentPrice)}.
          The dashed line shows your target of {formatPrice(targetPrice)}.
        </desc>
        <defs>
          <linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop className="price-history-chart__fill-start" offset="0%" />
            <stop className="price-history-chart__fill-end" offset="100%" />
          </linearGradient>
        </defs>
        <path className="price-history-chart__grid" d={`M${plot.left},${plot.top}H${plot.right} M${plot.left},52H${plot.right} M${plot.left},${plot.bottom}H${plot.right}`} vectorEffect="non-scaling-stroke" />
        <motion.path className="price-history-chart__area" initial={false} animate={{ d: areaPath }}
          fill={`url(#${chartId}-fill)`} transition={transition} />
        <motion.path className="price-history-chart__target" initial={false} animate={{ d: targetPath }}
          transition={transition} vectorEffect="non-scaling-stroke" />
        <motion.path className="price-history-chart__line" initial={false} animate={{ d: pricePath }}
          transition={transition} vectorEffect="non-scaling-stroke" />
        <motion.circle className="price-history-chart__endpoint" cx={plot.right} r="4.2" initial={false}
          animate={{ cy: priceY(currentPrice) }} transition={transition} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="price-history-chart__timeline" aria-hidden="true"><span>Earlier</span><span>Now</span></div>
    </figure>
  );
}
