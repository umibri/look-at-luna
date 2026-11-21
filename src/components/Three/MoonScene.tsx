import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { OrbitControlsWrapper } from '@components/Three/OrbitControlsWrapper';
import MoonObject from '@components/Three/MoonObject';
import StarrySky from '@components/Three/StarrySky';

export default function MoonScene() {
  return (
    <div className="w-[90%] h-[60vh]">
      <Canvas
        camera={{ fov: 75, near: 1, far: 1000, position: [500, 0, -1] }}
        onCreated={state => state.gl.setClearColor(0x000011, 1)}
        dpr={[1, 2]}
        shadows
      >
        <Suspense>
          <StarrySky />
          <MoonObject />
          <OrbitControlsWrapper />
        </Suspense>
      </Canvas>
    </div>
  );
}
