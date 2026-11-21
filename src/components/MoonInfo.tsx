import type { MoonData } from '@lib/types';
import { phaseName } from '@lib/moon';
import { MS_PER_DAY } from '@lib/utils';

interface Props {
  date: Date;
  moon: MoonData;
  nextNew: Date;
  nextFull: Date;
}

const relative = (d: Date, from: Date) => {
  const days = Math.round((d.getTime() - from.getTime()) / MS_PER_DAY);
  return days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
};
const shortDay = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function MoonInfo({ date, moon, nextNew, nextFull }: Props) {
  const stats = [
    { label: 'Illuminated', value: `${Math.round(moon.illuminated * 100)}%` },
    { label: 'Age', value: `${moon.age.toFixed(1)} d` },
    { label: 'Distance', value: `${Math.round(moon.distance).toLocaleString()} km` },
  ];

  return (
    <div className="text-center">
      <p className="text-[0.7rem] uppercase tracking-[0.25em] text-moonlight/60">
        {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </p>
      <h2 className="font-display font-light text-4xl desktop:text-6xl mt-1 mb-5" aria-live="polite">
        {phaseName(moon.phase)}
      </h2>

      <dl className="grid grid-cols-3 gap-2">
        {stats.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-moonlight/50">{label}</dt>
            <dd className="text-base desktop:text-lg tabular-nums whitespace-nowrap mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 flex flex-col desktop:flex-row desktop:justify-center gap-x-4 gap-y-0.5 text-sm text-moonlight/60">
        <span className="whitespace-nowrap">
          Full moon {shortDay(nextFull)} <span className="text-moonlight/40">({relative(nextFull, date)})</span>
        </span>
        <span className="whitespace-nowrap">
          New moon {shortDay(nextNew)} <span className="text-moonlight/40">({relative(nextNew, date)})</span>
        </span>
      </p>
    </div>
  );
}
