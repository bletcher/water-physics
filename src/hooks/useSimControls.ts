import { useEffect, useState } from 'react';
import type { WaterSim } from '../sim/WaterSim';

/**
 * Common per-instrument controls: the boundary mode (open/infinite vs walls), a
 * freeze flag, and the camera pitch (view angle). Keeps the sim's `boundary` in
 * sync with the toggle.
 */
export function useSimControls(sim: WaterSim, opts?: { infinite?: boolean }) {
  const [infinite, setInfinite] = useState(opts?.infinite ?? true);
  const [paused, setPaused] = useState(false);
  const [viewDeg, setViewDeg] = useState(0);
  useEffect(() => { sim.boundary = infinite ? 'open' : 'walls'; }, [sim, infinite]);
  return { infinite, setInfinite, paused, setPaused, viewDeg, setViewDeg };
}
