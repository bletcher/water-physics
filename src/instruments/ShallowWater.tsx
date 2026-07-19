import { useEffect, useMemo, useState } from 'react';
import { WaterSim } from '../sim/WaterSim';
import { ShallowWaterRenderer } from '../sim/ShallowWaterRenderer';
import { useWaterEngine } from '../hooks/useWaterEngine';
import { useSimControls } from '../hooks/useSimControls';
import { Slider } from '../components/Slider';
import { ToggleButton } from '../components/ToggleButton';
import { SimToggles } from '../components/SimToggles';

const DMIN = 0.04;          // relative depth at the shoreline
const SWELL_PERIOD = 90;    // frames between incoming swells
const SWELL_AMP = 0.9;
const SWELL_TILT = 0.32;    // wavefront slope, so swell meets the shore at an angle

/**
 * Shallow water / shoreline — the bottom shoals from deep (top) to a beach
 * (bottom). Wave speed follows c ∝ √depth, so swells slow, bend toward shore
 * (refraction), shorten, and break into foam (shoaling).
 */
export function ShallowWater() {
  const sim = useMemo(() => new WaterSim(), []);
  const renderer = useMemo(() => new ShallowWaterRenderer(), []);
  const depthField = useMemo(() => new Float32Array(sim.N), [sim]);
  const c2Field = useMemo(() => new Float32Array(sim.N), [sim]);

  const [cMax, setCMax] = useState(0.5);
  const [damp, setDamp] = useState(0.996);
  const [shoreCurve, setShoreCurve] = useState(1.4);
  const [lightDeg, setLightDeg] = useState(210);
  const [dropR, setDropR] = useState(3.5);
  const [swell, setSwell] = useState(true);
  const { infinite, setInfinite, paused, setPaused } = useSimControls(sim);

  useEffect(() => { sim.damp = damp; }, [sim, damp]);
  useEffect(() => { renderer.lightDeg = lightDeg; }, [renderer, lightDeg]);

  // (re)build the depth profile and matching wave-speed field
  useEffect(() => {
    const { W, H } = sim;
    const cm2 = cMax * cMax;
    for (let y = 0; y < H; y++) {
      const base = 1 - y / (H - 1);                       // 1 at top (deep) → 0 at bottom
      const d = DMIN + (1 - DMIN) * Math.pow(Math.max(0, base), shoreCurve);
      const cc2 = cm2 * d;                                // c² ∝ depth
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        depthField[i] = d;
        c2Field[i] = cc2;
      }
    }
    sim.c2Field = c2Field;
    sim.c = cMax;                                         // used by the open boundary
    renderer.depthField = depthField;
  }, [sim, renderer, depthField, c2Field, cMax, shoreCurve]);

  // seed a couple of drops
  useEffect(() => {
    sim.drop(sim.W * 0.35, sim.H * 0.3, 4, 2.2);
    sim.drop(sim.W * 0.6, sim.H * 0.25, 3, 1.8);
  }, [sim]);

  const canvasRef = useWaterEngine(sim, renderer, {
    getDropSize: () => dropR,
    isPaused: () => paused,
    onFrame: (s, frame) => {
      if (swell && frame % SWELL_PERIOD === 0) {
        // inject a broad, tilted swell in the deep water near the top
        const y0 = 10;
        for (let x = 6; x < s.W - 6; x++) {
          const yc = y0 + SWELL_TILT * (x - s.W / 2);
          for (let dy = -3; dy <= 3; dy++) {
            const yy = Math.round(yc) + dy;
            if (yy > 2 && yy < s.H - 2)
              s.hCurr[yy * s.W + x] -= SWELL_AMP * Math.exp(-(dy * dy) / 5);
          }
        }
      }
    },
  });

  return (
    <>
      <div className="stage">
        <canvas
          ref={canvasRef}
          className="water-canvas"
          aria-label="Waves shoaling and refracting over a shelving bottom toward a shore."
        />
        <div className="hint">deep water at top · beach at the bottom · tap to drop</div>
      </div>

      <div className="panel">
        <div className="eq">
          c(x,y) = <b>{cMax.toFixed(2)}</b>·√depth · shallow ⇒ <b>slow, refract &amp; shoal</b>
        </div>
        <div className="controls">
          <Slider label="max wave speed" value={cMax} display={cMax.toFixed(2)} min={0.2} max={0.6} step={0.01} onChange={setCMax} />
          <Slider label="damping" value={damp} display={damp.toFixed(3)} min={0.96} max={0.999} step={0.001} onChange={setDamp} />
          <Slider label="shore steepness" value={shoreCurve} display={shoreCurve.toFixed(1)} min={0.4} max={3} step={0.1} onChange={setShoreCurve} />
          <Slider label="light angle" value={lightDeg} display={`${lightDeg}°`} min={0} max={360} step={5} onChange={setLightDeg} />
          <Slider label="drop size" value={dropR} display={dropR.toFixed(1)} min={1.5} max={8} step={0.5} onChange={setDropR} />
        </div>
        <div className="row">
          <ToggleButton label="incoming swell" pressed={swell} onToggle={() => setSwell((v) => !v)} />
          <button onClick={() => sim.clear()}>still the water</button>
          <SimToggles
            infinite={infinite}
            onInfinite={() => setInfinite((v) => !v)}
            paused={paused}
            onPause={() => setPaused((v) => !v)}
          />
        </div>
      </div>
    </>
  );
}
