/** Moon radius in scene units; everything else in the scene is sized from it. */
export const MOON_RADIUS = 5;

/**
 * Per-frame values shared between scene objects without React re-renders.
 * MoonObject writes them; the sky, glow and camera read them.
 */
export interface SceneState {
  /** Illuminated fraction of the moon as currently drawn (follows the animation). */
  illumination: number;
  /** Unit vector toward the sun, in world space (follows the animation). */
  sun: [number, number, number];
}
