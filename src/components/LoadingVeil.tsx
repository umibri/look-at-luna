import { useProgress } from '@react-three/drei';

/** Shown over the moon's spot while the texture downloads. */
export default function LoadingVeil() {
  const { active, progress } = useProgress();
  const done = !active && progress === 100;

  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${done ? 'opacity-0' : 'opacity-100'}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-display italic text-xl text-moonlight/70 animate-pulse">
        {done ? '' : 'Finding the moon…'}
      </p>
    </div>
  );
}
