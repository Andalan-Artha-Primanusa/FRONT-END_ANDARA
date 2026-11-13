export type RouteSuspenseFallbackProps = {
  cards?: number;
};

export function RouteSuspenseFallback({ cards = 3 }: RouteSuspenseFallbackProps) {
  return (
    <div className="route-suspense-fallback" aria-busy="true" aria-live="polite">
      <div className="route-suspense-fallback__header" />
      <div className="route-suspense-fallback__row">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={`route-skeleton-card-${index}`} className="route-suspense-fallback__card" />
        ))}
      </div>
      <div className="route-suspense-fallback__table" />
    </div>
  );
}
