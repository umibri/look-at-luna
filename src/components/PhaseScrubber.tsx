export interface PhaseMark {
  /** Phase fraction, 0 (new) to 1 (the next new). */
  phase: number;
  /** Short label shown under the track. */
  short: string;
  /** Full name, for screen readers and the tooltip. */
  name: string;
  /** When the moon reaches this phase within the cycle. */
  at: Date;
}

interface Props {
  date: Date;
  /** Phase fraction of the date shown, to highlight the matching mark. */
  phase: number;
  /** The new moons on either side of the date being scrubbed. */
  cycle: { start: Date; end: Date };
  /** The eight phases from this new moon to the next (nine marks, new at both ends). */
  marks: PhaseMark[];
  /** Draw the icons as seen from the southern hemisphere (mirrored). */
  southern: boolean;
  onScrub: (date: Date) => void;
  playing: boolean;
  onTogglePlay: () => void;
}

const STEPS = 1000;
const shortDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/**
 * A tiny moon at a given phase: a dark disc with the lit part drawn as a
 * half-disc on the sunward side plus (or minus) a half-ellipse for the
 * terminator, whose width is |cos 2πp|.
 */
function PhaseIcon({ phase, southern }: { phase: number; southern: boolean }) {
  const r = 6;
  const waning = phase > 0.5;
  const p = waning ? 1 - phase : phase; // 0..0.5, lit on the right
  const rx = Math.abs(Math.cos(2 * Math.PI * p)) * r;
  const gibbous = p > 0.25 ? 1 : 0;
  const lit = `M0,${-r} A${r},${r} 0 0 1 0,${r} A${rx},${r} 0 0 ${gibbous} 0,${-r}Z`;
  const mirror = waning !== southern;
  return (
    <svg viewBox="-7 -7 14 14" className="h-3.5 w-3.5" aria-hidden="true">
      <circle r={r} className="fill-white/10 stroke-moonlight/30" strokeWidth="0.8" />
      <path d={lit} className="fill-moonlight" transform={mirror ? 'scale(-1,1)' : undefined} />
    </svg>
  );
}

export default function PhaseScrubber({ date, phase, cycle, marks, southern, onScrub, playing, onTogglePlay }: Props) {
  const start = cycle.start.getTime();
  const span = cycle.end.getTime() - start;
  const fraction = (d: Date) => (d.getTime() - start) / span;
  const position = Math.round(fraction(date) * STEPS);

  // The mark for the date's named phase; for "New", whichever end is nearer.
  const bin = ((Math.round(phase * 8) % 8) + 8) % 8;
  const active = bin === 0 ? (fraction(date) < 0.5 ? 0 : marks.length - 1) : bin;

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

        {/*
          One mark per phase, placed at the moment it happens. The spacing is
          uneven on purpose: the moon moves faster near perigee, so the
          quarters fall anywhere from about 6.5 to 8.3 days apart.
        */}
        <ol className="relative h-12 sm:h-14" aria-label="Phases in this lunar cycle">
          {marks.map((mark, i) => {
            const edge = i === 0 ? 'translate-x-0 items-start' : i === marks.length - 1 ? '-translate-x-full items-end' : '-translate-x-1/2 items-center';
            const isActive = i === active;
            return (
              <li key={i} className={`absolute top-0 ${edge} flex flex-col`} style={{ left: `${fraction(mark.at) * 100}%` }}>
                <button
                  onClick={() => onScrub(mark.at)}
                  title={`${mark.name}, ${shortDate(mark.at)}`}
                  aria-label={`${mark.name}, ${mark.at.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`group -mx-1.5 flex flex-col ${i === 0 ? 'items-start' : i === marks.length - 1 ? 'items-end' : 'items-center'} gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moonlight/60 ${isActive ? 'text-moonlight' : 'text-moonlight/50 hover:text-moonlight/90'}`}
                >
                  <span className={`rounded-full transition-shadow ${isActive ? 'shadow-[0_0_0_2px_rgba(232,228,216,0.35)]' : ''}`}>
                    <PhaseIcon phase={mark.phase} southern={southern} />
                  </span>
                  <span className="hidden sm:block whitespace-nowrap text-[0.6rem] uppercase tracking-[0.12em] leading-none">{mark.short}</span>
                  <span className={`whitespace-nowrap text-[0.65rem] leading-none tabular-nums ${isActive ? 'text-moonlight/80' : 'text-moonlight/40'}`}>
                    <span className="sm:hidden">{mark.at.getDate()}</span>
                    <span className="hidden sm:inline">{shortDate(mark.at)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
