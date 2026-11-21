import { useEffect, useMemo, useState } from 'react';
import Header from '@components/Header';
import DateControls from '@components/DateControls';
import LoadingVeil from '@components/LoadingVeil';
import MoonInfo from '@components/MoonInfo';
import PhaseScrubber from '@components/PhaseScrubber';
import MoonScene from '@components/Three/MoonScene';
import { useElementHeight } from './hooks/useElementHeight';
import { findPhase, getMoonData, lunarCycle } from '@lib/moon';
import { addDays, isSameLocalDay, parseLocalDate, toDateInputValue, toJulianDate } from '@lib/utils';

const dateFromUrl = () => parseLocalDate(new URLSearchParams(window.location.search).get('date') ?? '');

export default function App() {
  // The one source of truth: everything on the page is derived from this date.
  const [date, setDate] = useState(() => dateFromUrl() ?? new Date());
  // The date the scrubber's cycle is built around. Scrubbing moves `date` but
  // not the anchor, so the slider's ends stay put while you drag.
  const [anchor, setAnchor] = useState(date);

  const goTo = (next: Date) => {
    setDate(next);
    setAnchor(next);
  };

  const moon = useMemo(() => getMoonData(toJulianDate(date)), [date]);
  const cycle = useMemo(() => lunarCycle(anchor), [anchor]);
  const nextNew = useMemo(() => findPhase(date, 0), [date]);
  const nextFull = useMemo(() => findPhase(date, 0.5), [date]);
  const markers = useMemo(
    () => [
      { label: 'First Q', at: findPhase(cycle.start, 0.25) },
      { label: 'Full', at: findPhase(cycle.start, 0.5) },
      { label: 'Last Q', at: findPhase(cycle.start, 0.75) },
    ],
    [cycle],
  );

  const [headerRef, headerHeight] = useElementHeight<HTMLElement>();
  const [panelRef, panelHeight] = useElementHeight<HTMLElement>();

  // ←/→ step a day, unless a form control has focus (it uses the arrows itself).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, select, textarea')) return;
      if (event.key === 'ArrowLeft') goTo(addDays(date, -1));
      if (event.key === 'ArrowRight') goTo(addDays(date, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [date]);

  // Keep ?date=YYYY-MM-DD in the URL so a link reopens the same day. Today has
  // no param. Keyed on the day string so scrubbing doesn't spam history.
  const day = toDateInputValue(date);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (isSameLocalDay(date, new Date())) url.searchParams.delete('date');
    else url.searchParams.set('date', day);
    window.history.replaceState(null, '', url);
  }, [day]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <MoonScene phase={moon.phase} topInset={headerHeight} bottomInset={panelHeight} />
      <Header ref={headerRef} />

      {/* The moon's spot: the scene centres the moon in this gap. */}
      <div className="relative flex-1 min-h-[35vh]">
        <LoadingVeil />
      </div>

      <main ref={panelRef} className="relative z-10 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl flex flex-col gap-5 rounded-3xl border border-white/10 bg-night/55 p-5 desktop:p-7 backdrop-blur-md">
          <MoonInfo date={date} moon={moon} nextNew={nextNew} nextFull={nextFull} />
          <PhaseScrubber date={date} cycle={cycle} markers={markers} onScrub={setDate} />
          <DateControls date={date} isToday={isSameLocalDay(date, new Date())} onChange={goTo} />
        </div>
      </main>
    </div>
  );
}
