import { useState } from 'react';
import { parseLocalDate } from '@lib/utils';
import type { MoonData } from '@lib/types';
import { phaseName } from '@lib/moon';

interface Props {
  date: Date;
  moon: MoonData;
  onDateChange: (date: Date) => void;
}

export default function MoonCalculator({ date, moon, onDateChange }: Props) {
  const [today] = useState(() => new Date());
  const [inputDate, setInputDate] = useState('');
  const [error, setError] = useState('');

  function changeDate(next: Date) {
    setError('');
    onDateChange(next);
  }

  function handleInputPhaseChange() {
    const parsed = parseLocalDate(inputDate);
    if (!parsed) {
      setError('Pick a date first.');
      return;
    }
    changeDate(parsed);
  }

  return (
    <div className="desktop:w-1/2 w-[90%] h-1/4 my-16">
      <div className="grid grid-cols-2 gap-4 mb-4 text-center">
        <div>
          <p>{today.toDateString()}</p>

          <div className="text-center my-4">
            <button className="py-2 px-4 bg-slate-500 text-sm" onClick={() => changeDate(new Date())}>{`Today's Phase`}</button>
          </div>
        </div>

        <div className="flex flex-col">
          <input className="mb-4" type="date" onChange={(event) => setInputDate(event.target.value)} />
          <button className="py-2 px-4 bg-slate-500 text-sm" onClick={handleInputPhaseChange}>Calculate Phase</button>
        </div>
      </div>

      <div>
        {error && <p className="text-center mb-2 text-red-300">{error}</p>}
        <p className="text-center mb-2">{date.toDateString()}</p>

        <div className="bg-slate-400 text-center">{phaseName(moon.phase)}</div>
        {Object.keys(moon).map((item) => (
          <div key={item}>{item}: {moon[item]}</div>
        ))}
      </div>
    </div>
  );
}
