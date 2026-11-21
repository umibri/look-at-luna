import { useMemo, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BackSide, ShaderMaterial } from 'three';

/** Overall strength of the band's glow. Faint: it should read as haze behind the stars. */
const STRENGTH = 0.16;

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The band lies on the sphere's equator (y = 0). Its brightness is a soft
// Gaussian across the band, broken up by fractal noise, with darker dust
// lanes along the middle, like the real thing seen from a dark site.
const fragmentShader = /* glsl */ `
  uniform float uStrength;
  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    float lat = d.y;
    float wide = exp(-lat * lat / (2.0 * 0.2 * 0.2));
    float core = exp(-lat * lat / (2.0 * 0.07 * 0.07));

    float clouds = fbm(d * 3.0);
    float detail = fbm(d * 9.0 + 7.0);
    float glow = wide * (0.25 + 0.75 * clouds) * 0.6 + core * (0.4 + 0.6 * detail);

    // Dust lanes: dark filaments that cut through the bright core.
    float dust = smoothstep(0.48, 0.7, fbm(d * 6.0 + 21.0)) * smoothstep(0.0, 0.6, core);
    glow *= 1.0 - 0.75 * dust;

    vec3 cool = vec3(0.45, 0.55, 0.85);
    vec3 warm = vec3(0.95, 0.85, 0.7);
    vec3 color = mix(cool, warm, clamp(core * detail * 1.4, 0.0, 1.0));
    gl_FragColor = vec4(color * glow * uStrength, 1.0);
  }
`;

/**
 * A faint Milky Way on a big sphere behind the stars. It sits on the star
 * field's equator, so it turns with the sky, and moonlight washes it out with
 * the stars.
 */
export default function MilkyWay({ brightness }: { brightness: RefObject<number> }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uStrength: { value: STRENGTH } },
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  useFrame(() => {
    // Moonlight drowns the faint band faster than the stars.
    const b = brightness.current ?? 1;
    material.uniforms.uStrength.value = STRENGTH * b * b;
  });

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[400, 64, 32]} />
    </mesh>
  );
}
