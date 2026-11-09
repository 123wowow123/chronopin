import { incidentNamesModel, type ServiceState, type ServiceStatusJson } from '@/lib/serviceStatus';

const STATE_LABEL: Record<ServiceState, string> = { up: 'Operational', warning: 'Partial outage', down: 'Outage', maintenance: 'Maintenance' };
const DAY_CLASS: Record<ServiceState, string> = { up: 'bg-emerald-500', warning: 'bg-amber-500', down: 'bg-red-500', maintenance: 'bg-sky-500' };
const TEXT_CLASS: Record<ServiceState, string> = { up: 'text-emerald-600', warning: 'text-amber-600', down: 'text-red-600', maintenance: 'text-sky-600' };

// The vendor's live health and 30-day uptime on an AI model pin (ServiceStatus, 0250).
// An ongoing outage or partial outage gets a banner above the uptime figure.
export function PinServiceStatus({ status, title, className = '' }: { status: ServiceStatusJson; title: string; className?: string }) {
  const trouble = status.status !== 'up';
  return (
    <section className={`text-sm ${className}`} aria-label="Service uptime">
      <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">Service uptime</h2>
      <div className="surface rounded-lg px-3 py-2">
        {trouble ? (
          <p role="status" className={`mb-2 rounded-md border border-current px-2 py-1 font-semibold ${TEXT_CLASS[status.status]}`}>
            {STATE_LABEL[status.status]} now{status.headline ? `. ${status.headline}` : `: ${status.name}`}
          </p>
        ) : null}
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-2xl font-bold">{status.uptimePct == null ? 'n/a' : `${status.uptimePct.toFixed(2)}%`}</span>
          <span className="text-muted">uptime over the last {status.days.length} days · {status.name}</span>
          {!trouble ? <span className={`font-semibold ${TEXT_CLASS.up}`}>{STATE_LABEL.up}</span> : null}
        </div>
        <div className="mt-2 flex h-8 items-stretch gap-px" role="list" aria-label="Daily status, oldest first">
          {status.days.map((day) => (
            <div key={day.d} role="listitem" title={`${day.d}: ${STATE_LABEL[day.s]}`} aria-label={`${day.d}: ${STATE_LABEL[day.s]}`} className={`min-w-0 flex-1 rounded-sm ${DAY_CLASS[day.s]}`} />
          ))}
        </div>
        {status.incidents.length ? (
          <div className="mt-3">
            <h3 className="mb-1 text-xs font-semibold text-muted">Recent incidents</h3>
            <ul className="divide-y divide-border text-xs">
              {status.incidents.slice(0, 5).map((incident) => (
                <li key={`${incident.name}${incident.startedAt}`} className="flex flex-wrap items-baseline gap-x-2 py-1">
                  <span className={`rounded px-1.5 font-semibold ${incident.severity === 'down' ? TEXT_CLASS.down : incident.severity === 'maintenance' ? TEXT_CLASS.maintenance : TEXT_CLASS.warning}`}>
                    {incident.severity === 'down' ? 'Down' : incident.severity === 'maintenance' ? 'Maintenance' : 'Warn'}
                  </span>
                  <span className={incidentNamesModel(incident.name, title) ? 'font-semibold' : ''}>{incident.name}</span>
                  <span className="text-muted">
                    {incident.duration} · <time dateTime={incident.startedAt}>{incident.startedAt.slice(0, 10)}</time>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-1 text-xs text-muted">
          {status.source === 'official' ? (
            <>From the vendor&apos;s <a href={status.sourceUrl} rel="nofollow noopener" target="_blank" className="underline">own status page</a>. Uptime is the share of the window not covered by a major or critical incident</>
          ) : (
            <>Unofficial, from <a href={status.sourceUrl} rel="nofollow noopener" target="_blank" className="underline">StatusGator</a>. Uptime is the share of the window not marked down</>
          )}
          {' '}({status.downMinutes} min down, {status.degradedMinutes} min degraded); it covers the whole service, not this version alone.
        </p>
      </div>
    </section>
  );
}
