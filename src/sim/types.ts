import type { WaterSim } from './WaterSim';

/**
 * A Renderer turns a WaterSim's height field into pixels. Each renderer owns
 * its own look-and-feel parameters (light angle, depth, …) as mutable fields
 * that the UI writes to directly, so the animation loop never re-allocates.
 */
export interface Renderer {
  /** Fill `img` (sized to sim.W × sim.H) from the current surface. */
  render(sim: WaterSim, img: ImageData): void;
}
