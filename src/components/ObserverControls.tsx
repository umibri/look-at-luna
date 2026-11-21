import { useEffect, useId, useRef, useState } from 'react';
import { coarsen, type Location, type RiseSet } from '@lib/observer';
import { loadPlaces, nearestPlace, placeLabel, searchPlaces, type Place } from '@lib/places';
import { browserTimeZone, formatTimeIn, zoneAbbreviation } from '@lib/timezone';

export type Hemisphere = 'north' | 'south';

interface Props {
  /** The chosen place, or the time-zone guess; null if neither is known. */
  location: Location | null;
  onLocationChange: (location: Location | null) => void;
  riseSet: RiseSet | null;
  /** Manual fallback, only shown when there is no location. */
  hemisphere: Hemisphere;
  onHemisphereChange: (hemisphere: Hemisphere) => void;
}

const link =
  'underline decoration-moonlight/30 underline-offset-4 hover:decoration-moonlight rounded ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moonlight/60';

const segment = (active: boolean) =>
  `px-3 h-7 rounded-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moonlight/60 ${
    active ? 'bg-moonlight text-night' : 'text-moonlight/60 hover:text-moonlight'
  }`;

const toLocation = (place: Place, source: Location['source']): Location => ({
  latitude: place.latitude,
  longitude: place.longitude,
  timeZone: place.timeZone,
  label: placeLabel(place),
  source,
});

export default function ObserverControls({ location, onLocationChange, riseSet, hemisphere, onHemisphereChange }: Props) {
  const [open, setOpen] = useState(false);

  const time = (d: Date | null) => (d && location ? formatTimeIn(d, location.timeZone) : '—');
  // Say whose clock the times are on when it isn't the viewer's own.
  const foreignZone =
    location && location.timeZone !== browserTimeZone() ? ` ${zoneAbbreviation(riseSet?.rise ?? new Date(), location.timeZone)}` : '';

  return (
    <div className="flex flex-col gap-3 text-sm text-moonlight/70">
      <div className="flex flex-col items-center gap-1 text-center">
        <p>
          {location ? (
            <>
              <span className="text-moonlight/50">Viewing from </span>
              <button className={`${link} text-moonlight`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                {location.label}
              </button>
              {location.source === 'timezone' && <span className="text-moonlight/40 whitespace-nowrap"> · based on your time zone</span>}
            </>
          ) : (
            <button className={link} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              Choose a location for moonrise &amp; moonset
            </button>
          )}
        </p>

        {location ? (
          <p className="tabular-nums whitespace-nowrap">
            Moonrise <span className="text-moonlight">{riseSet ? time(riseSet.rise) : '…'}</span>
            <span className="mx-2 text-moonlight/30">·</span>
            Moonset <span className="text-moonlight">{riseSet ? time(riseSet.set) : '…'}</span>
            {foreignZone && <span className="text-moonlight/40">{foreignZone}</span>}
          </p>
        ) : (
          // Without a location, the hemisphere is the one thing we can't infer.
          <div className="flex items-center gap-1 rounded-full border border-white/10 p-0.5" role="group" aria-label="Hemisphere">
            <button className={segment(hemisphere === 'north')} aria-pressed={hemisphere === 'north'} onClick={() => onHemisphereChange('north')}>
              Northern
            </button>
            <button className={segment(hemisphere === 'south')} aria-pressed={hemisphere === 'south'} onClick={() => onHemisphereChange('south')}>
              Southern
            </button>
          </div>
        )}
      </div>

      {open && (
        <LocationPicker
          location={location}
          onPick={(next) => {
            onLocationChange(next);
            setOpen(false);
          }}
          onReset={() => {
            onLocationChange(null);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

interface PickerProps {
  location: Location | null;
  onPick: (location: Location) => void;
  /** Forget the chosen place and go back to the time-zone guess. */
  onReset: () => void;
  onClose: () => void;
}

function LocationPicker({ location, onPick, onReset, onClose }: PickerProps) {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<'idle' | 'locating' | 'denied' | 'unavailable'>('idle');
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    loadPlaces().then(setPlaces);
    input.current?.focus();
  }, []);

  const results = places ? searchPlaces(places, query) : [];

  function useDevice() {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const all = await loadPlaces();
        const point = coarsen({ latitude: coords.latitude, longitude: coords.longitude });
        const near = nearestPlace(all, point);
        setStatus('idle');
        onPick({
          ...point,
          // The device is where the browser is, so its clock is the right one.
          timeZone: browserTimeZone() ?? near?.timeZone ?? 'UTC',
          label: near ? `Your location (near ${near.name})` : 'Your location',
          source: 'device',
        });
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, maximumAge: 60 * 60 * 1000, timeout: 15_000 },
    );
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      onPick(toLocation(results[active], 'city'));
    } else if (event.key === 'Escape') {
      onClose();
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <input
        ref={input}
        type="text"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        aria-label="Search for a city"
        placeholder={places ? 'Search for a city…' : 'Loading cities…'}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        className="w-full h-9 rounded-full border border-white/10 bg-white/5 px-4 text-moonlight placeholder:text-moonlight/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moonlight/60"
      />

      <ul id={listId} role="listbox" aria-label="Cities" className="mt-2 max-h-56 overflow-y-auto">
        {results.map((place, i) => (
          <li
            key={`${place.name}-${place.latitude}-${place.longitude}`}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(event) => event.preventDefault()} // keep focus in the input
            onClick={() => onPick(toLocation(place, 'city'))}
            className={`cursor-pointer rounded-lg px-3 py-1.5 ${i === active ? 'bg-white/10 text-moonlight' : ''}`}
          >
            {placeLabel(place)}
          </li>
        ))}
        {query && places && results.length === 0 && (
          <li className="px-3 py-1.5 text-moonlight/40">No match. Try a nearby larger city.</li>
        )}
      </ul>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <button className={link} onClick={useDevice} disabled={status === 'locating'}>
          {status === 'locating' ? 'Finding you…' : 'Use my precise location'}
        </button>
        {location && location.source !== 'timezone' && (
          <button className={`${link} text-moonlight/50`} onClick={onReset}>
            Forget location
          </button>
        )}
      </div>
      {status === 'denied' && <p className="mt-1 text-xs text-moonlight/40">Location permission was denied.</p>}
      {status === 'unavailable' && <p className="mt-1 text-xs text-moonlight/40">Location isn't available right now.</p>}
      <p className="mt-2 text-[0.65rem] text-moonlight/30">
        City data © <a className={link} href="https://www.geonames.org" target="_blank" rel="noreferrer">GeoNames</a> (CC BY 4.0).
        A chosen place is saved only in this browser.
      </p>
    </div>
  );
}
