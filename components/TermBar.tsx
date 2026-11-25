/** Strip under the portal header: the active term, the week, open conflicts. */
export interface TermBarData {
  term: string;
  week: string;
  conflicts?: number;
}

export function TermBar({ data }: { data: TermBarData }) {
  return (
    <div className="telemetry-bar" role="region" aria-label="Current term">
      <p className="telemetry-item">
        <span className="telemetry-label">Term</span>
        <span className="telemetry-value">{data.term}</span>
      </p>
      <p className="telemetry-item">
        <span className="telemetry-label">Week</span>
        <span className="telemetry-value">{data.week}</span>
      </p>
      {data.conflicts !== undefined && (
        <p className="telemetry-item">
          <span className="telemetry-label">Conflicts</span>
          <span className={`telemetry-value ${data.conflicts > 0 ? 'telemetry-value-error' : 'telemetry-value-success'}`}>
            {data.conflicts === 0 ? 'None' : data.conflicts}
          </span>
        </p>
      )}
    </div>
  );
}
