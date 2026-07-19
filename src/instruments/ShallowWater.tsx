import { useEffect, useMemo, useState } from 'react';
import { WaterSim } from '../sim/WaterSim';
import { ShallowWaterRenderer } from '../sim/ShallowWaterRenderer';
import { buildShoreFields, injectSwell } from '../sim/shore';
import { useWaterEngine } from '../hooks/useWaterEngine';
import { useSimControls } from '../hooks/useSimControls';
import { Slider } from '../components/Slider';
import { ToggleButton } from '../components/ToggleButton';
import { SimToggles } from '../components/SimToggles';
import { Details } from '../components/Details';
import { drawSun } from '../overlays';

const SWELL_PERIOD = 90;    // frames between incoming swells
const OBJECT_R = 9;         // radius (grid cells) of a dropped object

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
  const [tool, setTool] = useState<'water' | 'object'>('water');
  const { infinite, setInfinite, paused, setPaused, viewDeg, setViewDeg } = useSimControls(sim);

  useEffect(() => { sim.damp = damp; }, [sim, damp]);
  useEffect(() => { renderer.lightDeg = lightDeg; }, [renderer, lightDeg]);

  // Build the bathymetry (deep left → waterline → dry beach right) and its
  // matching wave-speed field; `curve` bows the coastline, `shoreCurve` its slope.
  useEffect(() => {
    buildShoreFields(sim.W, sim.H, depthField, c2Field, { cMax, shoreCurve, curve });
    sim.c2Field = c2Field;
    sim.c = cMax;                                    // used by the open boundary
    renderer.depthField = depthField;
  }, [sim, renderer, depthField, c2Field, cMax, shoreCurve, curve]);

  // no default circular rock here (objects are painted); start with a few swells
  useEffect(() => {
    sim.rockR = 0;
    sim.rock.x = -100;
    sim.rock.y = -100;
    injectSwell(sim, 12);
    injectSwell(sim, 48);
    injectSwell(sim, 84);
  }, [sim]);

  const canvasRef = useWaterEngine(sim, renderer, {
    getDropSize: () => dropR,
    isPaused: () => paused,
    getViewAngle: () => viewDeg,
    overlay: (c, w, h) => drawSun(c, w, h, lightDeg),
    onPointer: (s, p) => {
      if (tool !== 'object') return false; // fall through to the default water drop
      s.paintMask(p.x, p.y, OBJECT_R, 1);  // place / drag out a rock
      return true;
    },
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
        <div className="hint">
          {tool === 'object'
            ? 'tap or drag to place rocks · waves reflect & bend around them'
            : 'open water at left · beach at right · tap to drop'}
        </div>
      </div>

      <div className="panel">
        <div className="row" role="group" aria-label="tap tool">
          <ToggleButton label="drop water" pressed={tool === 'water'} onToggle={() => setTool('water')} />
          <ToggleButton label="drop object" pressed={tool === 'object'} onToggle={() => setTool('object')} />
        </div>
        <div className="controls">
          <Slider label="shore curvature" value={curve} display={curve.toFixed(2)} min={-0.4} max={0.4} step={0.02} onChange={setCurve} />
          <Slider label="wave speed" value={cMax} display={cMax.toFixed(2)} min={0.2} max={0.6} step={0.01} onChange={setCMax} />
        </div>
        <div className="row">
          <ToggleButton label="incoming swell" pressed={swell} onToggle={() => setSwell((v) => !v)} />
          <button onClick={() => sim.clearMask()}>clear objects</button>
          <button onClick={() => sim.clear()}>reset</button>
          <SimToggles
            infinite={infinite}
            onInfinite={() => setInfinite((v) => !v)}
            paused={paused}
            onPause={() => setPaused((v) => !v)}
          />
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
        </Details>
      </div>
    </>
  );
}
