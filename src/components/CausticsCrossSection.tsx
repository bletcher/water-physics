import { useEffect, useRef } from 'react';
import type { WaterSim } from '../sim/WaterSim';

const ETA = 1.0 / 1.33;
const BEND = 1 - ETA;   // horizontal bend of a refracted ray per unit slope·depth
const AMP = 22;         // vertical exaggeration of the wave profile (crest ↔ trough)
const RAY_SCALE = 6;    // bend exaggeration, scaled to match the taller profile

interface Props {
  sim: WaterSim;
  /** water depth (grid cells) — scales how far rays travel before the floor */
  depth: number;
}

/**
 * A live side view of one slice across the pool: sunlight comes straight down,
 * bends where the surface tilts (Snell), and the refracted rays converge onto the
 * floor — bright where the surface curves like a lens, dark where it spreads them.
 * This makes the caustic "focusing" visible in a way the top-down view can't.
 */
export function CausticsCrossSection({ sim, depth }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const depthRef = useRef(depth);
  depthRef.current = depth;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fit = () => {
      const w = canvas.clientWidth || 600;
      canvas.width = Math.round(w * (window.devicePixelRatio > 1 ? 1.5 : 1));
      canvas.height = Math.round(canvas.width * 0.34);
    };
    fit();
    window.addEventListener('resize', fit);

    const { W, H } = sim;
    const midRow = (H >> 1) * W;
    let raf = 0;

    const draw = () => {
      const cw = canvas.width, ch = canvas.height;
      const surfaceY = ch * 0.42;   // still-water level; crests rise, troughs dip
      const floorY = ch * 0.9;
      const D = depthRef.current;
      const toCX = (x: number) => (x / (W - 1)) * cw;
      const hAt = (x: number) => sim.hCurr[midRow + x];
      const sy = (x: number) => {   // clamped screen y of the surface at column x
        const y = surfaceY - hAt(x) * AMP;
        return y < 2 ? 2 : y > floorY - 3 ? floorY - 3 : y;
      };

      // bands: sky / water / floor
      ctx.fillStyle = '#0e1217';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = 'rgba(28,70,96,0.30)';
      ctx.fillRect(0, surfaceY - AMP, cw, floorY - (surfaceY - AMP));
      ctx.fillStyle = '#33414c';
      ctx.fillRect(0, floorY, cw, ch - floorY);

      // still-water reference so crests-above / troughs-below read at a glance
      ctx.strokeStyle = 'rgba(200,211,214,0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, surfaceY);
      ctx.lineTo(cw, surfaceY);
      ctx.stroke();
      ctx.setLineDash([]);

      // incoming sunlight (faint, straight down)
      ctx.strokeStyle = 'rgba(255,240,200,0.10)';
      for (let x = 8; x < W - 8; x += 8) {
        const cx = toCX(x);
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, sy(x));
        ctx.stroke();
      }

      // refracted rays — additive, so overlap on the floor reads as bright focus
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,232,175,0.18)';
      for (let x = 4; x < W - 4; x += 2) {
        const slope = (hAt(x + 1) - hAt(x - 1)) * 0.5;
        const landX = x + BEND * slope * D * RAY_SCALE;
        ctx.beginPath();
        ctx.moveTo(toCX(x), sy(x));
        ctx.lineTo(toCX(landX), floorY);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';

      // the surface line
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const cx = toCX(x), yy = sy(x);
        if (x === 0) ctx.moveTo(cx, yy); else ctx.lineTo(cx, yy);
      }
      ctx.strokeStyle = 'rgba(190,224,232,0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
    };
  }, [sim]);

  return (
    <figure className="xsection">
      <canvas
        ref={ref}
        className="xsection-canvas"
        aria-label="Side view: sunlight refracting through the wavy surface and focusing on the pool floor."
      />
      <figcaption>
        side view — sunlight bends at each ripple and <b>focuses on the floor</b> where the surface curves like a lens
      </figcaption>
    </figure>
  );
}
