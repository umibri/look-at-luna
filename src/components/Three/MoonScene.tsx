import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { OrbitControlsWrapper } from '@components/Three/OrbitControlsWrapper';
import MoonObject from '@components/Three/MoonObject';
import StarrySky from '@components/Three/StarrySky';

interface Props {
  phase: number;
}

export default function MoonScene({ phase }: Props) {
  return (
    <div className="w-[90%] h-[60vh]">
      {/* Viewer (Earth) on +Z looking at the moon at the origin. */}
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 1000, position: [0, 0, 16] }}
        onCreated={state => state.gl.setClearColor(0x000011, 1)}
        dpr={[1, 2]}
      >
        <Suspense>
          <StarrySky />
          <MoonObject phase={phase} />
          <OrbitControlsWrapper />
        </Suspense>
      </Canvas>
    </div>
  );
}
