import { useRef, useState } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { Bounds } from '@react-three/drei';

export default function MoonObject() {
  const colorMap = useLoader(TextureLoader, '/textures/moon.jpg');
  const [someX, setSomeX] = useState(0);
  const [someZ, setSomeZ] = useState(0);
  const ref = useRef(null);
  const r = 30;

  // TODO(phase 2): drive the light from the computed phase instead of a timer,
  // and mutate it through the ref rather than setState on every frame.
  function animatePhase() {
    setSomeX(r * Math.cos(Date.now() / 1000));
    setSomeZ(r * Math.sin(Date.now() / 1000));
  }

  useFrame(() => animatePhase());

  return (
    <Bounds fit observe margin={1.5}>
      <ambientLight intensity={0.04} />
      <pointLight position={[someX, 0, someZ]} intensity={1} decay={0} ref={ref} />

      <mesh receiveShadow>
        <sphereGeometry args={[5, 50, 50]} />
        <meshStandardMaterial map={colorMap} />
      </mesh>
    </Bounds>
  );
}
