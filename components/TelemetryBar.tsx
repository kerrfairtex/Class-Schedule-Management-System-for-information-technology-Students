'use client';

interface TelemetryBarProps {
  data: {
    term: string;
    week: string;
    health: 'healthy' | 'warning' | 'critical';
    conflicts: number;
  };
}

export function TelemetryBar({ data }: TelemetryBarProps) {
  const healthConfig = {
    healthy: { label: 'SYSTEM NOMINAL', class: 'text-emerald-400', dotClass: 'bg-emerald-500' },
    warning: { label: 'DEGRADED PERFORMANCE', class: 'text-amber-400', dotClass: 'bg-amber-500' },
    critical: { label: 'CRITICAL FAILURE', class: 'text-red-400', dotClass: 'bg-red-500' },
  };

  const health = healthConfig[data.health];

  return (
    <div className="telemetry-bar mx-6 -mt-2 animate-in" role="region" aria-label="System telemetry">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="telemetry-item">
            <span className="telemetry-label">ACADEMIC TERM</span>
            <span className="telemetry-value telemetry-value-accent">{data.term}</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">ACTIVE WEEK</span>
            <span className="telemetry-value font-mono">{data.week}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 telemetry-item">
            <span className="relative flex h-6 items-center">
              <span className={`status-dot h-2.5 w-2.5 ${health.dotClass}`} />
            </span>
            <span className={`telemetry-value ${health.class}`}>{health.label}</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">CONFLICT ALERTS</span>
            <span className={`telemetry-value ${data.conflicts > 0 ? 'telemetry-value-warning' : 'telemetry-value-success'}`}>
              {data.conflicts}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}