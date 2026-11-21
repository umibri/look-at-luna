import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import CameraRig from '@components/Three/CameraRig';
import MoonObject from '@components/Three/MoonObject';
import StarrySky from '@components/Three/StarrySky';
import type { Libration } from '@lib/libration';

interface Props {
  phase: number;
  libration: Libration;
  southern: boolean;
  topInset: number;
  bottomInset: number;
}

export default function MoonScene({ phase, libration, southern, topInset, bottomInset }: Props) {
  return (
    <div className="fixed inset-0" aria-hidden="true">
      {/* Viewer (Earth) on +Z looking at the moon at the origin. */}
      <Canvas camera={{ fov: 40, near: 0.1, far: 1000, position: [0, 0, 20] }} dpr={[1, 2]}>
        <color attach="background" args={['#05060d']} />
        <CameraRig topInset={topInset} bottomInset={bottomInset} southern={southern} />
        <StarrySky />
        <Suspense fallback={null}>
          <MoonObject phase={phase} libration={libration} />
        </Suspense>
      </Canvas>
    </div>
  );
}
