function Placeholder({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer ${className}`} />
}

export function DashboardMetricsSkeleton() {
  return (
    <section className="dashboard-metrics dashboard-skeleton" aria-hidden="true">
      {['blue', 'amber', 'purple', 'green'].map((color) => (
        <article className={`dashboard-metric-card--${color}`} key={color}>
          <div className="flex items-start gap-3">
            <Placeholder className="h-11 w-11 shrink-0" />
            <div className="grid flex-1 gap-3 pt-1">
              <Placeholder className="h-3 w-3/4" />
              <Placeholder className="h-7 w-12" />
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}

export function DashboardSkeleton() {
  return (
    <section className="dashboard-content-grid dashboard-skeleton" aria-hidden="true">
      {['approval', 'phase', 'division', 'budget', 'key', 'insights', 'recent', 'actions'].map((section) => (
        <article className="dashboard-panel" key={section}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="grid w-2/3 gap-3">
              <Placeholder className="h-5 w-4/5" />
              <Placeholder className="h-3 w-full" />
            </div>
            <Placeholder className="h-10 w-20 shrink-0" />
          </div>
          {section === 'approval' ? (
            <div className="dashboard-donut-layout">
              <Placeholder className="dashboard-skeleton__donut" />
              <div className="grid gap-4">
                {Array.from({ length: 5 }, (_, index) => <Placeholder className="h-3 w-full" key={index} />)}
              </div>
            </div>
          ) : section === 'phase' || section === 'budget' ? (
            <div className="flex h-44 items-end justify-around gap-3 px-4 pb-6">
              {[60, 85, 45, 70, 30].map((height) => (
                <div className="flex h-full flex-1 items-end gap-1" key={height}>
                  <div className="skeleton-shimmer w-full" style={{ height: `${height}%` }} />
                  {section === 'budget' && <div className="skeleton-shimmer w-full" style={{ height: `${height * 0.7}%` }} />}
                </div>
              ))}
            </div>
          ) : section === 'division' ? (
            <div className="grid gap-5 py-3">
              {[90, 75, 60, 45, 30].map((width) => (
                <div className="flex items-center gap-4" key={width}>
                  <Placeholder className="h-3 w-1/3" />
                  <div className="flex-1"><div className="skeleton-shimmer h-4" style={{ width: `${width}%` }} /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className={section === 'actions' ? 'dashboard-actions-grid' : section === 'insights' ? 'grid grid-cols-1 gap-3 sm:grid-cols-2' : 'grid gap-3'}>
              {Array.from({ length: section === 'actions' ? 8 : section === 'recent' ? 5 : 4 }, (_, index) => (
                <div className="dashboard-skeleton__item" key={index}>
                  <Placeholder className="h-8 w-8 shrink-0" />
                  <div className="grid w-full gap-2">
                    <Placeholder className="h-3 w-3/4" />
                    <Placeholder className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      ))}
    </section>
  )
}
