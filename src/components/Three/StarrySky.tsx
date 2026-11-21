import { useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import type { SceneState } from '@components/Three/sceneConstants';

const COUNT = 2600;
/** How much a full moon washes out the stars (0 = not at all, 1 = completely). */
const MOONLIGHT_WASHOUT = 0.7;

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

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aBase;
  attribute float aSeed;
  uniform float uTime;
  uniform float uTwinkle;
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // Each star shimmers at its own slow rate and offset.
    float shimmer = 0.5 + 0.5 * sin(uTime * (0.4 + aSeed * 1.3) + aSeed * 40.0);
    vAlpha = aBase * (1.0 - uTwinkle * 0.5 * shimmer);
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uBrightness;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float soft = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(1.0, 0.97, 0.92), soft * vAlpha * uBrightness);
  }
`;

interface Props {
  scene: RefObject<SceneState>;
  /** Off when the viewer prefers reduced motion. */
  twinkle: boolean;
}

/**
 * A fixed star field that twinkles gently and fades as the moon brightens,
 * the way moonlight washes out the real sky near full moon.
 */
export default function StarrySky({ scene, twinkle }: Props) {
  const pixelRatio = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const random = mulberry32(20261120);
    const positions = new Float32Array(COUNT * 3);
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
      // Mostly faint pinpricks, a few brighter stars.
      const bright = random() ** 6;
      sizes[i] = 1.2 + bright * 2.6;
      base[i] = 0.35 + 0.65 * Math.max(bright, random() * 0.6);
      seeds[i] = random();
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positions, 3));
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
    u.uTwinkle.value = twinkle ? 1 : 0;
    u.uPixelRatio.value = pixelRatio;

    const target = 1 - MOONLIGHT_WASHOUT * (scene.current?.illumination ?? 0);
    brightness.current += (target - brightness.current) * (1 - Math.exp(-4 * dt));
    u.uBrightness.value = brightness.current;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
