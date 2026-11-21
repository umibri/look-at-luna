import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { MOON_RADIUS } from '@components/Three/sceneConstants';

interface Props {
  /** Pixels covered by UI at the top and bottom of the canvas. */
  topInset: number;
  bottomInset: number;
  /** Fraction of the free space's smaller side the moon's diameter should fill. */
  fill?: number;
  /** View from the Southern Hemisphere: the whole moon appears rotated 180°. */
  southern?: boolean;
}

/**
 * Fits the moon into the part of the full-screen canvas the UI doesn't cover:
 * moves the camera back until the moon is the right size, then shifts the
 * projection (not the camera) so the moon is centred in the free space.
 */
export default function CameraRig({ topInset, bottomInset, fill = 0.72, southern = false }: Props) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const { width, height } = useThree((s) => s.size);

  useLayoutEffect(() => {
    const freeHeight = Math.max(height - topInset - bottomInset, height * 0.35);
    const target = fill * Math.min(width, freeHeight); // moon diameter in px

    // At distance d, the view is 2·d·tan(fov/2) world units tall.
    const viewHeightPerUnitDistance = 2 * Math.tan((camera.fov * Math.PI) / 360);
    const distance = (2 * MOON_RADIUS * height) / (viewHeightPerUnitDistance * target);
    camera.position.set(0, 0, distance);
    camera.up.set(0, southern ? -1 : 1, 0);
    camera.lookAt(0, 0, 0);

    // A positive y offset moves the view window down, which moves content up.
    camera.setViewOffset(width, height, 0, (bottomInset - topInset) / 2, width, height);
    camera.updateProjectionMatrix();
  }, [camera, width, height, topInset, bottomInset, fill, southern]);

  return null;
}
