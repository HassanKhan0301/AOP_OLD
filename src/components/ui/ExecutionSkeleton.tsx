export function ExecutionSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div role="status" aria-label="Loading execution details" className="grid gap-4 p-4 motion-reduce:[&_.skeleton-shimmer]:animate-none">
      <span className="sr-only">Loading execution details...</span>
      <div aria-hidden="true" className="skeleton-shimmer h-6 w-2/5" />
      <div aria-hidden="true" className={compact ? 'grid gap-3' : 'grid gap-4 md:grid-cols-2'}>
        {Array.from({ length: compact ? 3 : 6 }, (_, index) => (
          <div key={index} className="grid gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="skeleton-shimmer h-3 w-1/2" />
            <div className="skeleton-shimmer h-10 w-full" />
            {!compact && <div className="skeleton-shimmer h-16 w-full" />}
          </div>
        ))}
      </div>
    </div>
  )
}
