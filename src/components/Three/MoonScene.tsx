import { Canvas } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import CameraRig from '@components/Three/CameraRig';
import MoonGlow from '@components/Three/MoonGlow';
import MoonObject from '@components/Three/MoonObject';
import Parallax from '@components/Three/Parallax';
import Satellites from '@components/Three/Satellites';
import ShootingStars from '@components/Three/ShootingStars';
import StarrySky from '@components/Three/StarrySky';
import type { SceneState } from '@components/Three/sceneConstants';
import type { Libration } from '@lib/libration';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface Props {
  phase: number;
  libration: Libration;
  southern: boolean;
  topInset: number;
  bottomInset: number;
}

export default function MoonScene({ phase, libration, southern, topInset, bottomInset }: Props) {
  // Shared per-frame values; MoonObject writes, the sky and glow read.
  const scene = useRef<SceneState>({ illumination: (1 - Math.cos(2 * Math.PI * phase)) / 2, sun: [0, 0, 1] });
  // With reduced motion: no intro sweep, twinkle, drift, meteors, satellites or parallax. Phase changes
  // still ease, since they only happen when the viewer asks for them.
  const reducedMotion = useReducedMotion();

  return (
    <div className="fixed inset-0" aria-hidden="true">
      {/* Viewer (Earth) on +Z looking at the moon at the origin. */}
      <Canvas camera={{ fov: 40, near: 0.1, far: 1000, position: [0, 0, 20] }} dpr={[1, 2]}>
        <color attach="background" args={['#080b1a']} />
        <CameraRig topInset={topInset} bottomInset={bottomInset} southern={southern} />
        {!reducedMotion && <Parallax />}
        <StarrySky scene={scene} animate={!reducedMotion} />
        {!reducedMotion && <ShootingStars scene={scene} />}
        {!reducedMotion && <Satellites />}
        <Suspense fallback={null}>
          <MoonGlow scene={scene} />
          <MoonObject phase={phase} libration={libration} scene={scene} intro={!reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
