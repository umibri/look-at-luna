interface Props {
  date: Date;
  /** The new moons on either side of the date being scrubbed. */
  cycle: { start: Date; end: Date };
  /** First quarter, full and last quarter within the cycle. */
  markers: { label: string; at: Date }[];
  onScrub: (date: Date) => void;
  playing: boolean;
  onTogglePlay: () => void;
}

const STEPS = 1000;
const shortDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function PhaseScrubber({ date, cycle, markers, onScrub, playing, onTogglePlay }: Props) {
  const start = cycle.start.getTime();
  const span = cycle.end.getTime() - start;
  const fraction = (d: Date) => (d.getTime() - start) / span;
  const position = Math.round(fraction(date) * STEPS);

  return (
    <div className="flex items-start gap-3">
      <button
        onClick={onTogglePlay}
        aria-label={playing ? 'Pause' : 'Play through this lunar cycle'}
        aria-pressed={playing}
        title={playing ? 'Pause' : 'Play through this lunar cycle'}
        className="mt-px h-6 w-6 shrink-0 rounded-full border border-white/15 bg-white/5 text-moonlight/80 transition-colors hover:bg-white/10 hover:text-moonlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moonlight/60 grid place-items-center"
      >
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor" aria-hidden="true">
          {playing ? (
            <>
              <rect x="2" y="1.5" width="2.6" height="9" rx="0.6" />
              <rect x="7.4" y="1.5" width="2.6" height="9" rx="0.6" />
            </>
          ) : (
            <path d="M3 1.6v8.8c0 .5.5.8.9.5l6.6-4.4c.4-.3.4-.8 0-1.1L3.9 1.1c-.4-.3-.9 0-.9.5z" />
          )}
        </svg>
      </button>

      <div className="min-w-0 flex-1">
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
    </div>
  );
}
