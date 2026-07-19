import { useEffect, useMemo, useState } from 'react';
import { WaterSim } from '../sim/WaterSim';
import { ShallowWaterRenderer } from '../sim/ShallowWaterRenderer';
import { useWaterEngine } from '../hooks/useWaterEngine';
import { useSimControls } from '../hooks/useSimControls';
import { Slider } from '../components/Slider';
import { ToggleButton } from '../components/ToggleButton';
import { SimToggles } from '../components/SimToggles';
import { Details } from '../components/Details';

const SHORE_MAX = 0.96;     // furthest right the waterline reaches (thin beach beyond)
const SWELL_PERIOD = 90;    // frames between incoming swells
const SWELL_AMP = 0.9;

/**
 * Inject a swell rolling in from the left — a vertical wavefront whose amplitude
 * tapers smoothly to zero at the top and bottom. The taper matters: a line source
 * with hard ends radiates semicircles from each end (the top/bottom "circles"
 * artefact), so we window it to keep a single clean, continuous front.
 */
function injectSwell(s: WaterSim, x0: number) {
  const { W, H } = s;
  const margin = Math.max(10, H * 0.2);
  for (let y = 0; y < H; y++) {
    let e = 1;
    if (y < margin) e = y / margin;
    else if (y > H - 1 - margin) e = (H - 1 - y) / margin;
    e = e * e * (3 - 2 * e); // smoothstep envelope → no sharp ends
    if (e <= 0) continue;
    for (let dx = -3; dx <= 3; dx++) {
      const xx = x0 + dx;
      if (xx > 1 && xx < W - 2) s.hCurr[y * W + xx] -= SWELL_AMP * e * Math.exp(-(dx * dx) / 5);
    }
  }
}

/**
 * Shallow water / shoreline — open water on the left shoals to a drawn beach on
 * the right. Wave speed follows c ∝ √depth, so swells rolling in from the left
 * slow, shorten, and break into foam. Curving the shoreline makes them refract —
 * bend to wrap around the coast.
 */
export function ShallowWater() {
  const sim = useMemo(() => new WaterSim(), []);
  const renderer = useMemo(() => new ShallowWaterRenderer(), []);
  const depthField = useMemo(() => new Float32Array(sim.N), [sim]);
  const c2Field = useMemo(() => new Float32Array(sim.N), [sim]);

  const [cMax, setCMax] = useState(0.5);
  const [damp, setDamp] = useState(0.996);
  const [curve, setCurve] = useState(0);
  const [shoreCurve, setShoreCurve] = useState(1.4);
  const [lightDeg, setLightDeg] = useState(210);
  const [dropR, setDropR] = useState(3.5);
  const [swell, setSwell] = useState(true);
  const { infinite, setInfinite, paused, setPaused, viewDeg, setViewDeg } = useSimControls(sim);

  useEffect(() => { sim.damp = damp; }, [sim, damp]);
  useEffect(() => { renderer.lightDeg = lightDeg; }, [renderer, lightDeg]);

  // Build the bathymetry: deep water (left) → waterline → dry beach (right).
  // `curve` bows the waterline per row; `shoreCurve` sets how steeply it shoals.
  useEffect(() => {
    const { W, H } = sim;
    const cm2 = cMax * cMax;
    // Pin the rightmost point of the shoreline to SHORE_MAX for any curvature, so
    // the shore always sits as far right as it can (beach stays a thin strip):
    // for curve>0 the peak is mid-height (bump=0.5), for curve≤0 it's at the edges.
    const base = SHORE_MAX - Math.max(0, curve) * 0.5;
    for (let y = 0; y < H; y++) {
      const yc = y / (H - 1) - 0.5;
      const bump = (0.25 - yc * yc) * 2;             // 0 at top/bottom, 0.5 mid-height
      let w = base + curve * bump;                   // waterline fraction for this row
      w = w < 0.1 ? 0.1 : w > 0.98 ? 0.98 : w;
      for (let x = 0; x < W; x++) {
        const u = x / (W - 1);
        const d = u <= w
          ? Math.pow((w - u) / w, shoreCurve)        // water: 1 deep → 0 at waterline
          : -((u - w) / (1 - w));                    // land: 0 → −1 up the beach
        const i = y * W + x;
        depthField[i] = d;
        c2Field[i] = cm2 * Math.max(d, 0.02);        // c² ∝ depth (floored so it never stalls hard)
      }
    }
    sim.c2Field = c2Field;
    sim.c = cMax;                                    // used by the open boundary
    renderer.depthField = depthField;
  }, [sim, renderer, depthField, c2Field, cMax, shoreCurve, curve]);

  // start with a few swells already rolling in — no scattered "drop" seeds
  useEffect(() => {
    injectSwell(sim, 12);
    injectSwell(sim, 48);
    injectSwell(sim, 84);
  }, [sim]);

  const canvasRef = useWaterEngine(sim, renderer, {
    getDropSize: () => dropR,
    isPaused: () => paused,
    getViewAngle: () => viewDeg,
    onFrame: (s, frame) => {
      if (swell && frame % SWELL_PERIOD === 0) injectSwell(s, 8);
    },
  });

  return (
    <>
      <div className="stage">
        <canvas
          ref={canvasRef}
          className="water-canvas"
          aria-label="Waves rolling in from the left, shoaling and refracting onto a beach on the right."
        />
        <div className="hint">open water at left · beach at right · tap to drop</div>
      </div>

      <div className="panel">
        <div className="controls">
          <Slider label="shore curvature" value={curve} display={curve.toFixed(2)} min={-0.4} max={0.4} step={0.02} onChange={setCurve} />
          <Slider label="wave speed" value={cMax} display={cMax.toFixed(2)} min={0.2} max={0.6} step={0.01} onChange={setCMax} />
        </div>
        <div className="row">
          <ToggleButton label="incoming swell" pressed={swell} onToggle={() => setSwell((v) => !v)} />
          <button onClick={() => sim.clear()}>reset</button>
        </div>

        <Details>
          <div className="eq">
            c(x,y) = <b>{cMax.toFixed(2)}</b>·√depth · shallow ⇒ <b>slow, refract &amp; shoal</b>
          </div>
          <div className="controls">
            <Slider label="shore steepness" value={shoreCurve} display={shoreCurve.toFixed(1)} min={0.4} max={3} step={0.1} onChange={setShoreCurve} />
            <Slider label="damping" value={damp} display={damp.toFixed(3)} min={0.96} max={0.999} step={0.001} onChange={setDamp} />
            <Slider label="light angle" value={lightDeg} display={`${lightDeg}°`} min={0} max={360} step={5} onChange={setLightDeg} />
            <Slider label="drop size" value={dropR} display={dropR.toFixed(1)} min={1.5} max={8} step={0.5} onChange={setDropR} />
            <Slider label="view angle" value={viewDeg} display={`${viewDeg}°`} min={0} max={65} step={1} onChange={setViewDeg} />
          </div>
          <div className="row">
            <SimToggles
              infinite={infinite}
              onInfinite={() => setInfinite((v) => !v)}
              paused={paused}
              onPause={() => setPaused((v) => !v)}
            />
          </div>
        </Details>
      </div>
    </>
  );
}
