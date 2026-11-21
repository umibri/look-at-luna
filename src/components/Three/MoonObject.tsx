import { useRef, useState, type RefObject } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Color, SRGBColorSpace, TextureLoader, type DirectionalLight, type Mesh } from 'three';
import { sunDirection } from '@lib/moon';
import type { Libration } from '@lib/libration';
import { MOON_RADIUS, type SceneState } from '@components/Three/sceneConstants';

const SUN_DISTANCE = 100;
/** How quickly the light eases toward a new phase (higher is faster). */
const EASE_RATE = 6;
/** On first load the terminator sweeps forward into today's phase. */
const INTRO_SECONDS = 1.6;
const INTRO_SPAN = 0.35; // of a cycle

/**
 * Earthshine: sunlight reflected off Earth onto the moon's dark side. Earth
 * seen from the moon is "full" when the moon is new, so it's brightest at a
 * thin crescent and fades as the moon fills in.
 */
const EARTHSHINE = new Color('#9fb3d9');
const EARTHSHINE_MAX = 0.22;

/** Shortest signed angle from `from` to `to`, in [-π, π). */
const shortestArc = (from: number, to: number) =>
  ((((to - from + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const wrap = (phase: number) => ((phase % 1) + 1) % 1;

/** Turns the texture's 0° longitude (near-side centre, +X by default) to face the viewer on +Z. */
const BASE_YAW = -Math.PI / 2;
const DEG = Math.PI / 180;

interface Props {
  /** Fraction of the lunar cycle: 0 = new, 0.5 = full. */
  phase: number;
  libration: Libration;
  /** Written every frame for the sky and glow. */
  scene: RefObject<SceneState>;
  /** Play the intro sweep (off when the viewer prefers reduced motion). */
  intro: boolean;
}

export default function MoonObject({ phase, libration, scene, intro }: Props) {
  const colorMap = useLoader(TextureLoader, `${import.meta.env.BASE_URL}textures/moon.jpg`);
  colorMap.colorSpace = SRGBColorSpace;

  const sun = useRef<DirectionalLight>(null);
  const earthshine = useRef<DirectionalLight>(null);
  // Current (animated) phase, kept outside React state so frames don't re-render.
  const shown = useRef(intro ? wrap(phase - INTRO_SPAN) : phase);
  const introStart = useRef<number | null>(intro ? null : -Infinity);
  const moon = useRef<Mesh>(null);
  // Initial orientation only. A stable array means R3F won't re-apply it on
  // re-render; after mount, useFrame eases the mesh toward each new libration.
  const [initialRotation] = useState<[number, number, number]>(() => [
    libration.latitude * DEG,
    BASE_YAW - libration.longitude * DEG,
    0,
  ]);

  useFrame(({ clock }, dt) => {
    const ease = 1 - Math.exp(-EASE_RATE * dt);

    introStart.current ??= clock.elapsedTime;
    const introT = (clock.elapsedTime - introStart.current) / INTRO_SECONDS;
    if (introT < 1) {
      // Sweep forward through the last stretch of the cycle into today.
      shown.current = wrap(phase - INTRO_SPAN * (1 - easeOutCubic(introT)));
    } else {
      const target = phase * 2 * Math.PI;
      const current = shown.current * 2 * Math.PI;
      shown.current = (current + shortestArc(current, target) * ease) / (2 * Math.PI);
    }

    const [x, y, z] = sunDirection(shown.current);
    sun.current?.position.set(x * SUN_DISTANCE, y * SUN_DISTANCE, z * SUN_DISTANCE);

    const illumination = (1 - Math.cos(2 * Math.PI * shown.current)) / 2;
    if (earthshine.current) earthshine.current.intensity = EARTHSHINE_MAX * (1 - illumination) ** 2;
    if (scene.current) {
      scene.current.illumination = illumination;
      scene.current.sun = [x, y, z];
    }

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
      <ambientLight intensity={0.01} />
      <directionalLight ref={sun} intensity={3} />
      {/* From the viewer's side, i.e. from Earth. */}
      <directionalLight ref={earthshine} position={[0, 0, SUN_DISTANCE]} color={EARTHSHINE} intensity={0} />

      <mesh ref={moon} rotation={initialRotation}>
        <sphereGeometry args={[MOON_RADIUS, 96, 64]} />
        {/* The colour map doubles as a bump map: craters catch light along the terminator. */}
        <meshStandardMaterial map={colorMap} bumpMap={colorMap} bumpScale={0.04} roughness={1} metalness={0} />
      </mesh>
    </>
  );
}
