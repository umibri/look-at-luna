import { useMemo, useState } from 'react';
import Header from '@components/Header';
import MoonCalculator from '@components/MoonCalculator';
import MoonScene from '@components/Three/MoonScene';
import { getMoonData } from '@lib/moon';
import { toJulianDate } from '@lib/utils';

export default function App() {
  // The one source of truth: everything on the page is derived from this date.
  const [date, setDate] = useState(() => new Date());
  const moon = useMemo(() => getMoonData(toJulianDate(date)), [date]);

  return (
    <div className="bg-zinc-900">
      <Header />

      <div className="flex flex-col justify-center items-center">
        <MoonScene phase={moon.phase} />
        <MoonCalculator date={date} moon={moon} onDateChange={setDate} />
      </div>
    </div>
  );
}
