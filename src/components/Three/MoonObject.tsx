import { useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { SRGBColorSpace, TextureLoader, type DirectionalLight, type Mesh } from 'three';
import { sunDirection } from '@lib/moon';
import type { Libration } from '@lib/libration';
import { MOON_RADIUS } from '@components/Three/sceneConstants';

const SUN_DISTANCE = 100;
/** How quickly the light eases toward a new phase (higher is faster). */
const EASE_RATE = 6;

/** Shortest signed angle from `from` to `to`, in [-π, π). */
const shortestArc = (from: number, to: number) =>
  ((((to - from + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;

/** Turns the texture's 0° longitude (near-side centre, +X by default) to face the viewer on +Z. */
const BASE_YAW = -Math.PI / 2;
const DEG = Math.PI / 180;

interface Props {
  /** Fraction of the lunar cycle: 0 = new, 0.5 = full. */
  phase: number;
  libration: Libration;
}

export default function MoonObject({ phase, libration }: Props) {
  const colorMap = useLoader(TextureLoader, `${import.meta.env.BASE_URL}textures/moon.jpg`);
  colorMap.colorSpace = SRGBColorSpace;

  const light = useRef<DirectionalLight>(null);
  // Current (animated) phase, kept outside React state so frames don't re-render.
  const shown = useRef(phase);
  const moon = useRef<Mesh>(null);
  // Initial orientation only. A stable array means R3F won't re-apply it on
  // re-render; after mount, useFrame eases the mesh toward each new libration.
  const [initialRotation] = useState<[number, number, number]>(() => [
    libration.latitude * DEG,
    BASE_YAW - libration.longitude * DEG,
    0,
  ]);

  useFrame((_, dt) => {
    const ease = 1 - Math.exp(-EASE_RATE * dt);

    const target = phase * 2 * Math.PI;
    const current = shown.current * 2 * Math.PI;
    shown.current = (current + shortestArc(current, target) * ease) / (2 * Math.PI);

    const [x, y, z] = sunDirection(shown.current);
    light.current?.position.set(x * SUN_DISTANCE, y * SUN_DISTANCE, z * SUN_DISTANCE);

    // Libration: turn the sub-Earth point toward the viewer. Euler order XYZ
    // applies the yaw (longitude) first, then tilts in world space (latitude).
    // East is to the viewer's right, so a positive longitude yaws further
    // negative; a positive latitude tips the north pole toward the viewer.
    if (moon.current) {
      const r = moon.current.rotation;
      r.y += (BASE_YAW - libration.longitude * DEG - r.y) * ease;
      r.x += (libration.latitude * DEG - r.x) * ease;
    }
  });

  return (
    <>
      {/* Earthshine: just enough to make out the dark side. */}
      <ambientLight intensity={0.03} />
      <directionalLight ref={light} intensity={3} />

      <mesh ref={moon} rotation={initialRotation}>
        <sphereGeometry args={[MOON_RADIUS, 96, 64]} />
        {/* The colour map doubles as a bump map: craters catch light along the terminator. */}
        <meshStandardMaterial map={colorMap} bumpMap={colorMap} bumpScale={0.04} roughness={1} metalness={0} />
      </mesh>
    </>
  );
}
