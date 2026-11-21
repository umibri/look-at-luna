import { useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial, type Points } from 'three';
import type { SceneState } from '@components/Three/sceneConstants';

const COUNT = 4200;
/** How much a full moon washes out the stars (0 = not at all, 1 = completely). */
const MOONLIGHT_WASHOUT = 0.5;
/**
 * The whole sky turns slowly, as it does with Earth's rotation, sped up to one
 * turn every 40 minutes: a couple of pixels a second, enough to feel alive.
 */
const DRIFT_RADIANS_PER_SECOND = (2 * Math.PI) / (40 * 60);
/** Tilt of the drift axis, so stars wheel diagonally instead of sliding flat. */
const DRIFT_AXIS_TILT = 0.5;

/** Small deterministic PRNG so the sky is the same on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rough star colours: mostly white, some blue-white, some warm. */
const TINTS: [number, number, number][] = [
  [1.0, 0.98, 0.95],
  [1.0, 0.98, 0.95],
  [1.0, 0.98, 0.95],
  [0.8, 0.88, 1.0],
  [0.86, 0.92, 1.0],
  [1.0, 0.9, 0.76],
  [1.0, 0.82, 0.66],
];

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aBase;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uTwinkle;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying vec3 vColor;
  varying float vHalo;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;

    // Scintillation: two out-of-step flickers per star, so it never looks
    // like a regular pulse. Bright stars twinkle most, as they do by eye.
    float f1 = sin(uTime * (1.3 + aSeed * 2.7) + aSeed * 61.0);
    float f2 = sin(uTime * (3.1 + aSeed * 4.3) + aSeed * 17.0);
    float flicker = 0.5 + 0.5 * (0.65 * f1 + 0.35 * f2);
    float depth = mix(0.35, 0.75, smoothstep(0.4, 1.0, aBase));
    vAlpha = aBase * (1.0 - uTwinkle * depth * flicker);

    vColor = aColor;
    vHalo = smoothstep(2.4, 4.0, aSize); // only the bigger stars get a halo
    gl_PointSize = aSize * uPixelRatio * (1.0 + vHalo * 1.6);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uBrightness;
  varying float vAlpha;
  varying vec3 vColor;
  varying float vHalo;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0; // 0 at centre, 1 at edge
    // Bright core; haloed stars draw their core smaller inside a bigger sprite.
    float coreRadius = mix(1.0, 0.4, vHalo);
    float core = smoothstep(coreRadius, 0.0, d);
    float halo = vHalo * 0.35 * exp(-d * 5.0);
    float a = (core + halo) * vAlpha * uBrightness;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

interface Props {
  scene: RefObject<SceneState>;
  /** Off when the viewer prefers reduced motion: no twinkle, no drift. */
  animate: boolean;
}

/**
 * The star field: tinted stars that twinkle, slowly wheel across the sky,
 * and fade as the moon brightens, the way moonlight washes out the real sky.
 */
export default function StarrySky({ scene, animate }: Props) {
  const pixelRatio = useThree((s) => s.viewport.dpr);
  const points = useRef<Points>(null);

  const geometry = useMemo(() => {
    const random = mulberry32(20261120);
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const base = new Float32Array(COUNT);
    const seeds = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      // Uniform on a sphere shell around the moon.
      const u = random() * 2 - 1;
      const theta = random() * Math.PI * 2;
      const r = 110 + random() * 60;
      const s = Math.sqrt(1 - u * u);
      positions.set([r * s * Math.cos(theta), r * s * Math.sin(theta), r * u], i * 3);

      // Mostly faint pinpricks, a handful of bright ones.
      const bright = random() ** 7;
      sizes[i] = 1.1 + bright * 3.6;
      base[i] = 0.3 + 0.7 * Math.max(bright * 1.4, random() * 0.55);
      seeds[i] = random();
      colors.set(TINTS[Math.floor(random() * TINTS.length)], i * 3);
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positions, 3));
    g.setAttribute('aColor', new BufferAttribute(colors, 3));
    g.setAttribute('aSize', new BufferAttribute(sizes, 1));
    g.setAttribute('aBase', new BufferAttribute(base, 1));
    g.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    return g;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uTwinkle: { value: 1 },
          uPixelRatio: { value: 1 },
          uBrightness: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  const brightness = useRef(1);

  useFrame(({ clock }, dt) => {
    const u = material.uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uTwinkle.value = animate ? 1 : 0;
    u.uPixelRatio.value = pixelRatio;

    const target = 1 - MOONLIGHT_WASHOUT * (scene.current?.illumination ?? 0);
    brightness.current += (target - brightness.current) * (1 - Math.exp(-4 * dt));
    u.uBrightness.value = brightness.current;

    if (animate && points.current) points.current.rotation.y += DRIFT_RADIANS_PER_SECOND * Math.min(dt, 0.1);
  });

  return (
    <group rotation={[DRIFT_AXIS_TILT, 0, 0.2]}>
      <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
