import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import CameraRig from '@components/Three/CameraRig';
import MoonObject from '@components/Three/MoonObject';
import StarrySky from '@components/Three/StarrySky';

interface Props {
  phase: number;
  topInset: number;
  bottomInset: number;
}

export default function MoonScene({ phase, topInset, bottomInset }: Props) {
  return (
    <div className="fixed inset-0" aria-hidden="true">
      {/* Viewer (Earth) on +Z looking at the moon at the origin. */}
      <Canvas camera={{ fov: 40, near: 0.1, far: 1000, position: [0, 0, 20] }} dpr={[1, 2]}>
        <color attach="background" args={['#05060d']} />
        <CameraRig topInset={topInset} bottomInset={bottomInset} />
        <StarrySky />
        <Suspense fallback={null}>
          <MoonObject phase={phase} />
        </Suspense>
      </Canvas>
    </div>
  );
}
