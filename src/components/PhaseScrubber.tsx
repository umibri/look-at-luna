interface Props {
  date: Date;
  /** The new moons on either side of the date being scrubbed. */
  cycle: { start: Date; end: Date };
  /** First quarter, full and last quarter within the cycle. */
  markers: { label: string; at: Date }[];
  onScrub: (date: Date) => void;
}

const STEPS = 1000;
const shortDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function PhaseScrubber({ date, cycle, markers, onScrub }: Props) {
  const start = cycle.start.getTime();
  const span = cycle.end.getTime() - start;
  const fraction = (d: Date) => (d.getTime() - start) / span;
  const position = Math.round(fraction(date) * STEPS);

  return (
    <div>
      <input
        type="range"
        min={0}
        max={STEPS}
        value={Math.min(STEPS, Math.max(0, position))}
        onChange={(event) => onScrub(new Date(start + (Number(event.target.value) / STEPS) * span))}
        className="scrubber"
        aria-label="Scrub through this lunar cycle"
        aria-valuetext={date.toDateString()}
      />

      {/* Marker labels sit under the track at the moment each phase happens. */}
      <div className="relative h-8 text-[0.65rem] uppercase tracking-[0.15em] text-moonlight/50">
        <span className="absolute left-0 top-0 text-left">New<br /><span className="normal-case tracking-normal text-moonlight/40">{shortDate(cycle.start)}</span></span>
        {markers.map(({ label, at }) => (
          <span key={label} className="absolute top-0 -translate-x-1/2 text-center whitespace-nowrap" style={{ left: `${fraction(at) * 100}%` }}>
            {label}<br /><span className="normal-case tracking-normal text-moonlight/40">{shortDate(at)}</span>
          </span>
        ))}
        <span className="absolute right-0 top-0 text-right">New<br /><span className="normal-case tracking-normal text-moonlight/40">{shortDate(cycle.end)}</span></span>
      </div>
    </div>
  );
}
