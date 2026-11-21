interface Props {
  date: Date;
  /** The new moons on either side of the date being scrubbed. */
  cycle: { start: Date; end: Date };
  onScrub: (date: Date) => void;
}

const STEPS = 1000;
const shortDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function PhaseScrubber({ date, cycle, onScrub }: Props) {
  const start = cycle.start.getTime();
  const span = cycle.end.getTime() - start;
  const position = Math.round(((date.getTime() - start) / span) * STEPS);

  return (
    <div>
      <input
        type="range"
        min={0}
        max={STEPS}
        value={Math.min(STEPS, Math.max(0, position))}
        onChange={(event) => onScrub(new Date(start + (Number(event.target.value) / STEPS) * span))}
        className="w-full accent-slate-300"
        aria-label="Scrub through this lunar cycle"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>New · {shortDate(cycle.start)}</span>
        <span>Drag to scrub this lunar cycle</span>
        <span>New · {shortDate(cycle.end)}</span>
      </div>
    </div>
  );
}
