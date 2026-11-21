import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial, Vector3, type Points } from 'three';

/** Seconds between satellites. */
const GAP = [14, 30] as const;
const FIRST_GAP = [6, 12] as const;
/** Seconds to cross the view. Real ones take a few minutes; this is sped up. */
const CROSSING = [16, 26] as const;
/** Distance in front of the camera where they're drawn. */
const DEPTH = 80;

const vertexShader = /* glsl */ `
  uniform float uSize;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d) * uAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(1.0, 0.97, 0.9, a);
  }
`;

const between = ([lo, hi]: readonly [number, number]) => lo + Math.random() * (hi - lo);

interface Pass {
  from: Vector3;
  to: Vector3;
  born: number;
  duration: number;
  /** Some satellites flare briefly as a solar panel catches the sun. */
  flareAt: number | null;
}

/**
 * Now and then a satellite: a steady, faint dot gliding in a straight line
 * across the sky, which is how you tell one from a star. Off with reduced
 * motion (the parent doesn't render it).
 */
export default function Satellites() {
  const dpr = useThree((s) => s.viewport.dpr);
  const points = useRef<Points>(null);
  const pass = useRef<Pass | null>(null);
  const nextAt = useRef<number | null>(null);

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(3), 3));
    return g;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uAlpha: { value: 0 }, uSize: { value: 3 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  useFrame(({ camera, clock }) => {
    const now = clock.elapsedTime;
    nextAt.current ??= now + between(FIRST_GAP);
    if (!points.current) return;

    if (!pass.current && now >= nextAt.current) {
      // Enter just off one edge and leave off the opposite one, on a slant.
      const toWorld = (x: number, y: number) =>
        new Vector3(x, y, 0.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(DEPTH).add(camera.position);
      const side = Math.random() < 0.5 ? -1 : 1;
      const y0 = -0.8 + Math.random() * 1.6;
      const y1 = Math.max(-0.95, Math.min(0.95, y0 + (Math.random() - 0.5) * 1.2));
      const duration = between(CROSSING);
      pass.current = {
        from: toWorld(-1.1 * side, y0),
        to: toWorld(1.1 * side, y1),
        born: now,
        duration,
        flareAt: Math.random() < 0.3 ? 0.3 + Math.random() * 0.4 : null,
      };
    }

    const p = pass.current;
    if (!p) {
      points.current.visible = false;
      return;
    }

    const t = (now - p.born) / p.duration;
    if (t >= 1) {
      pass.current = null;
      nextAt.current = now + between(GAP);
      points.current.visible = false;
      return;
    }

    const position = geometry.getAttribute('position') as BufferAttribute;
    const x = p.from.x + (p.to.x - p.from.x) * t;
    const y = p.from.y + (p.to.y - p.from.y) * t;
    const z = p.from.z + (p.to.z - p.from.z) * t;
    position.setXYZ(0, x, y, z);
    position.needsUpdate = true;
    points.current.visible = true;

    // Fade in and out near the ends; a quick brightening if it flares.
    const edges = Math.min(1, t * 8, (1 - t) * 8);
    const flare = p.flareAt === null ? 0 : Math.exp(-(((t - p.flareAt) * p.duration) ** 2) / 0.35);
    material.uniforms.uAlpha.value = Math.min(1, 0.55 * edges + 0.9 * flare);
    material.uniforms.uSize.value = (2.6 + 2.5 * flare) * dpr;
  });

  return <points ref={points} geometry={geometry} material={material} visible={false} frustumCulled={false} renderOrder={-2} />;
}
