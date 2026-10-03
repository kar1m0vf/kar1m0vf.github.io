import { useId } from 'react';

/** A serif K held by the same continuous thread that connects the portfolio. */
export function KControlLogo({ compact = false }: { compact?: boolean }) {
  const gradientId = useId();
  return (
    <span aria-hidden="true" className={`k-control-logo${compact ? ' k-control-logo--compact' : ''}`}>
      <svg className="k-control-logo__mark" fill="none" focusable="false" viewBox="0 0 64 64">
        <defs>
          <linearGradient id={gradientId} x1="17" x2="48" y1="12" y2="53" gradientUnits="userSpaceOnUse">
            <stop className="k-control-logo__light" />
            <stop className="k-control-logo__colour" offset=".48" />
            <stop className="k-control-logo__shade" offset="1" />
          </linearGradient>
        </defs>
        <path className="k-control-logo__orbit" d="M12 41C4 30 15 14 33 10C49 6 60 14 55 28C51 39 36 52 20 54" />
        <path d="M15 12H28V14C24 15 24 18 24 23V30L39 17C41 15 40 14 37 14V12H51V14C47 15 44 18 41 21L31 30L47 45C49 47 51 49 54 49V52H39V50C41 49 40 47 38 45L24 33V43C24 47 25 49 29 50V52H15V50C19 49 20 46 20 43V21C20 17 18 15 15 14Z" fill={`url(#${gradientId})`} />
        <path className="k-control-logo__glint" d="M21 20V43M26 32L43 48" />
        <circle className="k-control-logo__node" cx="55" cy="28" r="2.1" />
      </svg>
      {!compact && <span className="k-control-logo__wordmark">Control</span>}
    </span>
  );
}
