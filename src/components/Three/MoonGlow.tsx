import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Quaternion, Vector3, type Mesh, ShaderMaterial } from 'three';
import { MOON_RADIUS, type SceneState } from '@components/Three/sceneConstants';

/** Halo extent beyond the limb, as a multiple of the moon's radius. */
const REACH = 0.35;
/** Peak halo strength at full moon. Kept low: a soft rim, not a bloom. */
const STRENGTH = 0.13;

const vertexShader = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uRadius;
  uniform float uReach;
  uniform float uStrength;
  uniform vec2 uSun;      // sun direction projected onto the view plane
  uniform float uSunSide; // 0 when the sun is straight behind us (full), 1 when it is off to a side
  varying vec2 vPos;

  void main() {
    float r = length(vPos);
    if (r < uRadius) discard;
    float t = (r - uRadius) / (uRadius * uReach);
    float falloff = exp(-6.0 * t) * (1.0 - smoothstep(0.6, 1.0, t));
    // Hug the lit limb: weight by how much this side faces the sun.
    float facing = dot(normalize(vPos), normalize(uSun + 1e-5));
    float side = mix(1.0, smoothstep(-0.2, 1.0, facing), uSunSide);
    gl_FragColor = vec4(vec3(0.92, 0.9, 0.84), falloff * side * uStrength);
  }
`;

const toCamera = new Quaternion();
const sunView = new Vector3();

/**
 * A soft halo around the lit edge of the moon: nearly invisible at a thin
 * crescent, a gentle haze at full moon. It's a camera-facing disc behind the
 * moon's centre, so the moon itself hides its middle.
 */
export default function MoonGlow({ scene }: { scene: RefObject<SceneState> }) {
  const mesh = useRef<Mesh>(null);
  const size = MOON_RADIUS * (1 + REACH) * 2;

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uRadius: { value: MOON_RADIUS * 0.995 },
          uReach: { value: REACH },
          uStrength: { value: 0 },
          uSun: { value: [1, 0] },
          uSunSide: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  useFrame(({ camera }) => {
    const state = scene.current;
    if (!mesh.current || !state) return;

    // Face the camera.
    mesh.current.quaternion.copy(camera.quaternion);

    // Sun direction in the camera's frame, for which limb is lit on screen.
    toCamera.copy(camera.quaternion).invert();
    sunView.set(...state.sun).applyQuaternion(toCamera);
    const u = material.uniforms;
    u.uSun.value = [sunView.x, sunView.y];
    u.uSunSide.value = Math.min(1, Math.hypot(sunView.x, sunView.y) * 1.5);
    u.uStrength.value = STRENGTH * state.illumination ** 1.5;
  });

  return (
    <mesh ref={mesh} material={material} renderOrder={-1}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}
