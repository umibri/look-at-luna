import type { MoonData } from '@lib/types';
import { phaseName } from '@lib/moon';
import { MS_PER_DAY } from '@lib/utils';

interface Props {
  date: Date;
  moon: MoonData;
  nextNew: Date;
  nextFull: Date;
}

const when = (d: Date, from: Date) => {
  const days = Math.round((d.getTime() - from.getTime()) / MS_PER_DAY);
  const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${label} · ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}`;
};

export default function MoonInfo({ date, moon, nextNew, nextFull }: Props) {
  const stats = [
    ['Illumination', `${(moon.illuminated * 100).toFixed(1)}%`],
    ['Moon age', `${moon.age.toFixed(1)} days`],
    ['Distance', `${Math.round(moon.distance).toLocaleString()} km`],
    ['Next full moon', when(nextFull, date)],
    ['Next new moon', when(nextNew, date)],
  ];

  return (
    <div>
      <p className="text-center text-sm text-slate-400">
        {date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        {' · '}
        {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
      </p>
      <h2 className="text-center text-3xl font-light my-2">{phaseName(moon.phase)}</h2>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mt-4">
        {stats.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-400">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
