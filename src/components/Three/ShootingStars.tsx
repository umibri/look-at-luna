import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Quaternion, ShaderMaterial, Vector3, type Mesh } from 'three';
import type { SceneState } from '@components/Three/sceneConstants';

/** Seconds between meteors: random within this range, so they stay a surprise. */
const GAP = [9, 22] as const;
const FIRST_GAP = [3, 7] as const;
/** How long one streak lasts, in seconds. */
const DURATION = 0.9;
/** Distance in front of the camera where streaks are drawn (in front of the stars, well behind the moon's edge). */
const DEPTH = 60;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A streak along +x: bright head at the right end, tail fading to the left,
// soft across its width.
const fragmentShader = /* glsl */ `
  uniform float uAlpha;
  varying vec2 vUv;
  void main() {
    float along = pow(vUv.x, 2.5);
    float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
    float a = along * pow(across, 1.5) * uAlpha;
    gl_FragColor = vec4(vec3(1.0, 0.98, 0.92), a);
  }
`;

const between = ([lo, hi]: readonly [number, number]) => lo + Math.random() * (hi - lo);

interface Meteor {
  start: Vector3; // head position at t = 0, world space
  dir: Vector3; // unit direction, world space
  angle: number; // in-plane rotation on screen
  length: number; // world units
  speed: number; // world units per second
  born: number; // clock time
}

/**
 * An occasional meteor: a faint streak across a random part of the sky
 * every 9-22 seconds, dimmer when moonlight washes the sky out. Off when the
 * viewer prefers reduced motion (the parent doesn't render it).
 */
export default function ShootingStars({ scene }: { scene: RefObject<SceneState> }) {
  const mesh = useRef<Mesh>(null);
  const meteor = useRef<Meteor | null>(null);
  const nextAt = useRef<number | null>(null);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uAlpha: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  const tmp = useMemo(() => ({ v: new Vector3(), q: new Quaternion(), z: new Vector3(0, 0, 1) }), []);

  useFrame(({ camera, clock }) => {
    const now = clock.elapsedTime;
    nextAt.current ??= now + between(FIRST_GAP);
    if (!mesh.current) return;

    if (!meteor.current && now >= nextAt.current) {
      // Start somewhere in the upper part of the view, away from the centre
      // where the moon sits, and head down and sideways.
      const side = Math.random() < 0.5 ? -1 : 1;
      const ndc = new Vector3(side * (0.25 + Math.random() * 0.6), 0.2 + Math.random() * 0.7, 0.5);
      const start = ndc.unproject(camera).sub(camera.position).normalize().multiplyScalar(DEPTH).add(camera.position);

      // Screen-space heading: from the right, down and to the left; from the
      // left, down and to the right. Between 20° and 50° below horizontal.
      const slope = 0.35 + Math.random() * 0.5;
      const angle = side > 0 ? Math.PI + slope : -slope;
      const dir = new Vector3(Math.cos(angle), Math.sin(angle), 0).applyQuaternion(camera.quaternion);
      meteor.current = { start, dir, angle, length: 6 + Math.random() * 6, speed: 26 + Math.random() * 14, born: now };
    }

    const m = meteor.current;
    if (!m) {
      mesh.current.visible = false;
      return;
    }

    const t = (now - m.born) / DURATION;
    if (t >= 1) {
      meteor.current = null;
      nextAt.current = now + between(GAP);
      mesh.current.visible = false;
      return;
    }

    // Head travels; the tail grows in, then the whole streak fades out.
    const travelled = m.speed * (now - m.born);
    const tail = m.length * Math.min(1, t * 3);
    const head = tmp.v.copy(m.dir).multiplyScalar(travelled).add(m.start);
    mesh.current.position.copy(head).addScaledVector(m.dir, -tail / 2);
    mesh.current.quaternion.copy(camera.quaternion).multiply(tmp.q.setFromAxisAngle(tmp.z, m.angle));
    mesh.current.scale.set(tail, 0.24, 1);
    mesh.current.visible = true;

    const fade = Math.sin(Math.PI * Math.min(1, t * 1.15));
    const moonlight = 1 - 0.6 * (scene.current?.illumination ?? 0);
    material.uniforms.uAlpha.value = 0.85 * fade * moonlight;
  });

  return (
    <mesh ref={mesh} material={material} visible={false} frustumCulled={false} renderOrder={-2}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
