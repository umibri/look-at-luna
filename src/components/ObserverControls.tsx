import { useState } from 'react';
import type { Location, RiseSet } from '@lib/observer';

export type Hemisphere = 'north' | 'south';

interface Props {
  hemisphere: Hemisphere;
  onHemisphereChange: (hemisphere: Hemisphere) => void;
  location: Location | null;
  onLocationChange: (location: Location | null) => void;
  riseSet: RiseSet | null;
}

const time = (d: Date | null) =>
  d ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—';

const segment = (active: boolean) =>
  `px-3 h-7 rounded-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moonlight/60 ${
    active ? 'bg-moonlight text-night' : 'text-moonlight/60 hover:text-moonlight'
  }`;

const link =
  'underline decoration-moonlight/30 underline-offset-4 hover:decoration-moonlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moonlight/60 rounded';

export default function ObserverControls({ hemisphere, onHemisphereChange, location, onLocationChange, riseSet }: Props) {
  const [status, setStatus] = useState<'idle' | 'locating' | 'denied' | 'unavailable'>('idle');

  function locate() {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setStatus('idle');
        onLocationChange({ latitude: coords.latitude, longitude: coords.longitude });
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, maximumAge: 60 * 60 * 1000, timeout: 15_000 },
    );
  }

  return (
    <div className="flex flex-col desktop:flex-row items-center justify-between gap-3 text-sm text-moonlight/70">
      <div className="flex items-center gap-1 rounded-full border border-white/10 p-0.5" role="group" aria-label="Hemisphere">
        <button className={segment(hemisphere === 'north')} aria-pressed={hemisphere === 'north'} onClick={() => onHemisphereChange('north')}>
          Northern
        </button>
        <button className={segment(hemisphere === 'south')} aria-pressed={hemisphere === 'south'} onClick={() => onHemisphereChange('south')}>
          Southern
        </button>
      </div>

      {location ? (
        <p className="tabular-nums">
          Moonrise <span className="text-moonlight">{riseSet ? time(riseSet.rise) : '…'}</span>
          <span className="mx-2 text-moonlight/30">·</span>
          Moonset <span className="text-moonlight">{riseSet ? time(riseSet.set) : '…'}</span>
          <button className={`${link} ml-3 text-xs text-moonlight/40`} onClick={() => onLocationChange(null)}>
            Forget location
          </button>
        </p>
      ) : (
        <p>
          <button className={link} onClick={locate} disabled={status === 'locating'}>
            {status === 'locating' ? 'Finding you…' : 'Use my location for moonrise & moonset'}
          </button>
          {status === 'denied' && <span className="block text-xs text-moonlight/40 mt-1">Location permission was denied.</span>}
          {status === 'unavailable' && <span className="block text-xs text-moonlight/40 mt-1">Location isn't available right now.</span>}
        </p>
      )}
    </div>
  );
}
