import { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { SRGBColorSpace, TextureLoader, type DirectionalLight } from 'three';
import { sunDirection } from '@lib/moon';
import { MOON_RADIUS } from '@components/Three/sceneConstants';

const SUN_DISTANCE = 100;
/** How quickly the light eases toward a new phase (higher is faster). */
const EASE_RATE = 6;

/** Shortest signed angle from `from` to `to`, in [-π, π). */
const shortestArc = (from: number, to: number) =>
  ((((to - from + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;

interface Props {
  /** Fraction of the lunar cycle: 0 = new, 0.5 = full. */
  phase: number;
}

export default function MoonObject({ phase }: Props) {
  const colorMap = useLoader(TextureLoader, `${import.meta.env.BASE_URL}textures/moon.jpg`);
  colorMap.colorSpace = SRGBColorSpace;

  const light = useRef<DirectionalLight>(null);
  // Current (animated) phase, kept outside React state so frames don't re-render.
  const shown = useRef(phase);

  useFrame((_, dt) => {
    const target = phase * 2 * Math.PI;
    const current = shown.current * 2 * Math.PI;
    const step = shortestArc(current, target) * (1 - Math.exp(-EASE_RATE * dt));
    shown.current = (current + step) / (2 * Math.PI);

    const [x, y, z] = sunDirection(shown.current);
    light.current?.position.set(x * SUN_DISTANCE, y * SUN_DISTANCE, z * SUN_DISTANCE);
  });

  return (
    <>
      {/* Earthshine: just enough to make out the dark side. */}
      <ambientLight intensity={0.03} />
      <directionalLight ref={light} intensity={3} />

      {/* The texture's 0° longitude (near-side centre) sits on +X by default;
          turn it to face the viewer on +Z. */}
      <mesh rotation-y={-Math.PI / 2}>
        <sphereGeometry args={[MOON_RADIUS, 96, 64]} />
        {/* The colour map doubles as a bump map: craters catch light along the terminator. */}
        <meshStandardMaterial map={colorMap} bumpMap={colorMap} bumpScale={0.04} roughness={1} metalness={0} />
      </mesh>
    </>
  );
}
