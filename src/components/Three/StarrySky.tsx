import { useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial, type Group } from 'three';
import MilkyWay from '@components/Three/MilkyWay';
import type { SceneState } from '@components/Three/sceneConstants';

/** Stars scattered evenly over the sky. */
const COUNT = 4200;
/** Extra stars crowded along the Milky Way band. */
const BAND_COUNT = 3000;
/** How much a full moon washes out the stars (0 = not at all, 1 = completely). */
const MOONLIGHT_WASHOUT = 0.35;
/**
 * The whole sky turns slowly, as it does with Earth's rotation, sped up to one
 * turn every 40 minutes: a couple of pixels a second, enough to feel alive.
 */
const DRIFT_RADIANS_PER_SECOND = (2 * Math.PI) / (40 * 60);
/**
 * Tilt of the drift axis. The Milky Way lies on the drift's equator, so it
 * crosses the view diagonally and slides along itself as the sky turns.
 */
const SKY_TILT: [number, number, number] = [0.12, 0, 0.6];

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
 * The star field: tinted stars that twinkle, a faint Milky Way, all slowly
 * wheeling across the sky, and fading as the moon brightens, the way moonlight washes out the real sky.
 */
export default function StarrySky({ scene, animate }: Props) {
  const pixelRatio = useThree((s) => s.viewport.dpr);
  const sky = useRef<Group>(null);

  const geometry = useMemo(() => {
    const random = mulberry32(20261120);
    const total = COUNT + BAND_COUNT;
    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const sizes = new Float32Array(total);
    const base = new Float32Array(total);
    const seeds = new Float32Array(total);

    for (let i = 0; i < total; i++) {
      const inBand = i >= COUNT;
      // Height above the band's plane: uniform for the open sky, bunched
      // near zero (roughly Gaussian) for the band.
      const u = inBand ? (random() + random() + random() - 1.5) * 0.22 : random() * 2 - 1;
      const theta = random() * Math.PI * 2;
      const r = 110 + random() * 60;
      const s = Math.sqrt(1 - u * u);
      positions.set([r * s * Math.cos(theta), r * u, r * s * Math.sin(theta)], i * 3);

      // Mostly faint pinpricks, a handful of bright ones. Band stars are
      // smaller and dimmer: a dusting, not a wall.
      const bright = random() ** 7;
      sizes[i] = inBand ? 0.9 + bright * 1.6 : 1.2 + bright * 3.8;
      base[i] = inBand ? 0.25 + 0.45 * random() : 0.4 + 0.6 * Math.max(bright * 1.4, random() * 0.6);
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

    if (animate && sky.current) sky.current.rotation.y += DRIFT_RADIANS_PER_SECOND * Math.min(dt, 0.1);
  });

  return (
    <group rotation={SKY_TILT}>
      <group ref={sky}>
        <MilkyWay brightness={brightness} />
        <points geometry={geometry} material={material} frustumCulled={false} />
      </group>
    </group>
  );
}
