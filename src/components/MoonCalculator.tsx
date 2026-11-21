import { useState } from 'react';
import { EmptyMoonData as EMD } from '@lib/constants';
import { toJulianDate, parseLocalDate } from '@lib/utils';
import type { MoonData } from '@lib/types';
import { getMoonData, phaseName } from '@lib/moon';

export default function MoonCalculator() {
  const [today] = useState(() => new Date());
  const [displayDate, setDisplayDate] = useState(today);
  const [inputDate, setInputDate] = useState('');
  const [moonPhaseText, setMoonPhaseText] = useState('');
  const [error, setError] = useState('');
  const [moonData, setMoonData] = useState<MoonData>(EMD);

  // Takes the date explicitly instead of reading `displayDate` from state:
  // a setState call doesn't update the value this render's closure sees.
  function showPhaseFor(date: Date) {
    const result = getMoonData(toJulianDate(date));

    setError('');
    setDisplayDate(date);
    setMoonData(result);
    setMoonPhaseText(phaseName(result.phase));
  }

  function handleInputPhaseChange() {
    const date = parseLocalDate(inputDate);

    if (!date) {
      setError('Pick a date first.');
      setMoonPhaseText('');
      setMoonData(EMD);
      return;
    }

    showPhaseFor(date);
  }

  return (
    <div className="desktop:w-1/2 w-[90%] h-1/4 my-16">
      <div className="grid grid-cols-2 gap-4 mb-4 text-center">
        <div>
          <p>{today.toDateString()}</p>

          <div className="text-center my-4">
            <button className="py-2 px-4 bg-slate-500 text-sm" onClick={() => showPhaseFor(new Date())}>{`Today's Phase`}</button>
          </div>
        </div>

        <div className="flex flex-col">
          <input className="mb-4" type="date" onChange={(event) => setInputDate(event.target.value)} />
          <button className="py-2 px-4 bg-slate-500 text-sm" onClick={handleInputPhaseChange}>Calculate Phase</button>
        </div>
      </div>

      <div>
        {error
          ? <p className="text-center mb-2 text-red-300">{error}</p>
          : <p className="text-center mb-2">{displayDate.toDateString()}</p>}

        <div className="bg-slate-400 text-center">{moonPhaseText}</div>
        {Object.keys(moonData).map((item) => (
          <div key={item}>{item}: {moonData[item]}</div>
        ))}
      </div>
    </div>
  );
}
