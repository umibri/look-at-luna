import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/** Largest tilt of the view, in degrees. Small on purpose: depth, not motion. */
const MAX_DEG = 2.5;
const DEG = Math.PI / 180;
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * Orbits the camera a couple of degrees around the moon to follow the
 * pointer, or the phone's tilt where the browser reports it without asking.
 * The moon stays centred while the stars slide behind it, which reads as
 * depth. CameraRig owns the distance; this only changes the angle.
 */
export default function Parallax() {
  const camera = useThree((s) => s.camera);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return; // touch drags shouldn't swing the sky
      target.current = {
        x: clamp((event.clientX / window.innerWidth) * 2 - 1),
        y: clamp((event.clientY / window.innerHeight) * 2 - 1),
      };
    };

    // Tilt relative to how the phone was held at first, so any grip works.
    let baseline: { beta: number; gamma: number } | null = null;
    const onTilt = (event: DeviceOrientationEvent) => {
      if (event.beta == null || event.gamma == null) return;
      baseline ??= { beta: event.beta, gamma: event.gamma };
      target.current = {
        x: clamp((event.gamma - baseline.gamma) / 20),
        y: clamp((event.beta - baseline.beta) / 20),
      };
    };

    const resetOnLeave = () => (target.current = { x: 0, y: 0 });

    window.addEventListener('pointermove', onPointer);
    window.addEventListener('deviceorientation', onTilt);
    document.documentElement.addEventListener('pointerleave', resetOnLeave);
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onTilt);
      document.documentElement.removeEventListener('pointerleave', resetOnLeave);
    };
  }, []);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-3 * dt);
    current.current.x += (target.current.x - current.current.x) * k;
    current.current.y += (target.current.y - current.current.y) * k;

    const distance = camera.position.length();
    const yaw = current.current.x * MAX_DEG * DEG;
    const pitch = current.current.y * MAX_DEG * DEG;
    // Screen-space directions, so it feels the same in the southern view
    // (where the camera is upside down).
    const flip = camera.up.y < 0 ? -1 : 1;
    camera.position.set(
      distance * Math.sin(yaw) * Math.cos(pitch) * flip,
      distance * Math.sin(pitch) * flip,
      distance * Math.cos(yaw) * Math.cos(pitch),
    );
    camera.lookAt(0, 0, 0);
  });

  return null;
}
