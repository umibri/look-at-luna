import { useEffect, useMemo, useState } from 'react';
import Header from '@components/Header';
import DateControls from '@components/DateControls';
import LoadingVeil from '@components/LoadingVeil';
import MoonInfo from '@components/MoonInfo';
import ObserverControls, { type Hemisphere } from '@components/ObserverControls';
import PhaseScrubber from '@components/PhaseScrubber';
import MoonScene from '@components/Three/MoonScene';
import { useElementHeight } from './hooks/useElementHeight';
import { getLibration } from '@lib/libration';
import { findPhase, getMoonData, lunarCycle } from '@lib/moon';
import { coarsen, hemisphereOf, moonRiseSet, type Location, type RiseSet } from '@lib/observer';
import { loadPlaces, placeForTimeZone, placeLabel } from '@lib/places';
import { load, save } from '@lib/storage';
import { browserTimeZone } from '@lib/timezone';
import { addDays, isSameLocalDay, parseLocalDate, toDateInputValue, toJulianDate } from '@lib/utils';

const isHemisphere = (v: unknown): v is Hemisphere => v === 'north' || v === 'south';
const hasCoordinates = (v: unknown): v is { latitude: number; longitude: number } =>
  typeof v === 'object' && v !== null &&
  typeof (v as Location).latitude === 'number' && typeof (v as Location).longitude === 'number';

/**
 * A saved location. Phase 5 saved bare coordinates from the device; read those
 * as a device location on this browser's clock.
 */
function loadSavedLocation(): Location | null {
  const saved = load('luna.location', null, hasCoordinates);
  if (!saved) return null;
  const v = saved as Partial<Location>;
  if (typeof v.timeZone === 'string' && typeof v.label === 'string' && (v.source === 'city' || v.source === 'device')) {
    return saved as Location;
  }
  return { latitude: saved.latitude, longitude: saved.longitude, timeZone: browserTimeZone() ?? 'UTC', label: 'Your location', source: 'device' };
}

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
  const libration = useMemo(() => getLibration(toJulianDate(date)), [date]);
  const day = toDateInputValue(date);
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

  // Where the moon is viewed from: a place the viewer chose (saved in this
  // browser), else the largest city in the browser's time zone. The guess
  // needs no permission and is never saved.
  const [saved, setSaved] = useState<Location | null>(loadSavedLocation);
  const [guess, setGuess] = useState<Location | null>(null);
  const location = saved ?? guess;

  useEffect(() => {
    const zone = browserTimeZone();
    if (!zone) return;
    loadPlaces().then((places) => {
      const place = placeForTimeZone(places, zone);
      if (place) {
        setGuess({ latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone, label: placeLabel(place), source: 'timezone' });
      }
    });
  }, []);

  const changeLocation = (next: Location | null) => {
    const stored = next && coarsen(next);
    setSaved(stored);
    save('luna.location', stored);
  };

  // A location settles the hemisphere; the manual toggle is only a fallback.
  const [manualHemisphere, setManualHemisphere] = useState<Hemisphere>(() => load('luna.hemisphere', 'north', isHemisphere));
  const hemisphere = location ? hemisphereOf(location) : manualHemisphere;
  const changeHemisphere = (next: Hemisphere) => {
    setManualHemisphere(next);
    save('luna.hemisphere', next);
  };

  const [riseSet, setRiseSet] = useState<RiseSet | null>(null);

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

  // Moonrise/moonset for the selected calendar day at the location.
  useEffect(() => {
    if (!location) {
      setRiseSet(null);
      return;
    }
    let cancelled = false;
    setRiseSet(null);
    moonRiseSet(day, location).then((result) => {
      if (!cancelled) setRiseSet(result);
    });
    return () => {
      cancelled = true;
    };
  }, [day, location]);

  // Keep ?date=YYYY-MM-DD in the URL so a link reopens the same day. Today has
  // no param. Keyed on the day string so scrubbing doesn't spam history.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (isSameLocalDay(date, new Date())) url.searchParams.delete('date');
    else url.searchParams.set('date', day);
    window.history.replaceState(null, '', url);
  }, [day]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <MoonScene phase={moon.phase} libration={libration} southern={hemisphere === 'south'} topInset={headerHeight} bottomInset={panelHeight} />
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
          <div className="border-t border-white/10 pt-4">
            <ObserverControls
              hemisphere={hemisphere}
              onHemisphereChange={changeHemisphere}
              location={location}
              onLocationChange={changeLocation}
              riseSet={riseSet}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
