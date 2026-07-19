import { useEffect, useRef } from 'react';
import type { WaterSim } from '../sim/WaterSim';
import type { Renderer } from '../sim/types';

export interface EngineOptions {
  /** interaction: radius (grid cells) of a drop made by the pointer */
  getDropSize: () => number;
  /** per-frame hook for ambient sources (steady drip, rain) */
  onFrame?: (sim: WaterSim, frame: number) => void;
  /** physics substeps per rendered frame (2 = smoother waves) */
  substeps?: number;
  /** when true, time is frozen: no stepping or sources, but still renders */
  isPaused?: () => boolean;
  /**
   * Custom pointer handling (e.g. painting obstacles). Return true if the event
   * was fully handled, to skip the default drop / rock-drag behaviour.
   */
  onPointer?: (sim: WaterSim, p: { x: number; y: number }, phase: 'down' | 'move') => boolean;
}

/**
 * Drives a WaterSim + Renderer on an animation loop against a <canvas>, and
 * wires pointer interaction (tap to drop, drag for a wake, drag the rock).
 *
 * Params that change every frame are read through a ref, so slider tweaks never
 * tear down the loop and React never re-renders per frame. Returns the ref to
 * attach to your <canvas>.
 */
export function useWaterEngine(
  sim: WaterSim,
  renderer: Renderer,
  options: EngineOptions,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const optsRef = useRef(options);
  useEffect(() => { optsRef.current = options; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const off = document.createElement('canvas');
    off.width = sim.W;
    off.height = sim.H;
    const offCtx = off.getContext('2d');
    if (!ctx || !offCtx) return;
    const img = offCtx.createImageData(sim.W, sim.H);

    const fit = () => {
      const cssW = canvas.clientWidth || 360;
      canvas.width = Math.round(cssW * (window.devicePixelRatio > 1 ? 1.5 : 1));
      canvas.height = Math.round(canvas.width * sim.H / sim.W);
      ctx.imageSmoothingEnabled = true;
    };
    fit();
    window.addEventListener('resize', fit);

    // ---- pointer interaction ----
    let draggingRock = false, painting = false, drawing = false, lastDropT = 0;
    const toSim = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width * sim.W,
        y: (e.clientY - r.top) / r.height * sim.H,
      };
    };
    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      const p = toSim(e);
      if (optsRef.current.onPointer?.(sim, p, 'down')) { drawing = true; e.preventDefault(); return; }
      const dx = p.x - sim.rock.x, dy = p.y - sim.rock.y;
      if (dx * dx + dy * dy < (sim.rockR + 5) ** 2) draggingRock = true;
      else { painting = true; sim.drop(p.x, p.y, optsRef.current.getDropSize(), 2.4); }
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (!draggingRock && !painting && !drawing) return;
      const p = toSim(e);
      if (drawing) {
        optsRef.current.onPointer?.(sim, p, 'move');
      } else if (draggingRock) {
        sim.moveRock(p.x, p.y);
      } else if (performance.now() - lastDropT > 26) {
        sim.drop(p.x, p.y, optsRef.current.getDropSize() * 0.8, 1.1);
        lastDropT = performance.now();
      }
    };
    const release = () => { draggingRock = painting = drawing = false; };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    // ---- animation loop ----
    let raf = 0, frame = 0;
    const substeps = optsRef.current.substeps ?? 2;
    const paint = () => {
      renderer.render(sim, img);
      offCtx.putImageData(img, 0, 0);
      ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
    };
    const tick = () => {
      if (!optsRef.current.isPaused?.()) {
        optsRef.current.onFrame?.(sim, frame++);
        for (let s = 0; s < substeps; s++) sim.step();
      }
      paint(); // always render, so slider/lighting tweaks show even when frozen
      raf = requestAnimationFrame(tick);
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sim.step();
      paint();
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', release);
      canvas.removeEventListener('pointercancel', release);
    };
  }, [sim, renderer]);

  return canvasRef;
}
