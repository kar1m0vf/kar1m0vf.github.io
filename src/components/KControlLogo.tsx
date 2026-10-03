/** The portfolio's display and editorial typefaces form one restrained wordmark. */
export function KControlLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span aria-hidden="true" className={`k-control-logo${compact ? ' k-control-logo--compact' : ''}`}>
      <span className="k-control-logo__initial">K</span>
      {!compact && <span className="k-control-logo__wordmark">Control</span>}
    </span>
  );
}
