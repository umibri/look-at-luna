import { OrbitControls } from '@react-three/drei';

export const OrbitControlsWrapper = () => {
  const args = {
    enableDamping: true,
    enablePan: false,
    enableRotate: false,
    enableZoom: true,
    reverseOrbit: false,
    minDistance: 10,
    maxDistance: 250,
  };

  return <OrbitControls {...args} />;
};
