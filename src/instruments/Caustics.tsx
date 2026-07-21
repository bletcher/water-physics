import { useEffect, useMemo, useState } from 'react';
import { WaterSim } from '../sim/WaterSim';
import { CausticsRenderer } from '../sim/CausticsRenderer';
import { WindField, whitecapFromWind } from '../sim/wind';
import { useWaterEngine } from '../hooks/useWaterEngine';
import { useSimControls } from '../hooks/useSimControls';
import { Slider } from '../components/Slider';
import { ToggleButton } from '../components/ToggleButton';
import { SimToggles } from '../components/SimToggles';
import { WindControls } from '../components/WindControls';
import { Details } from '../components/Details';
import { CausticsCrossSection } from '../components/CausticsCrossSection';
import { drawSun, drawWindArrow } from '../overlays';
import { useGuide } from '../shell/GuideContext';

/**
 * Caustics — sunlight refracted through the moving surface, focused onto the
 * pool floor. Beer–Lambert depth tint; the rock casts a soft shadow.
 */
export function Caustics() {
  const sim = useMemo(() => new WaterSim(320, 180), []);
  const renderer = useMemo(() => new CausticsRenderer(), []);
  const wind = useMemo(() => new WindField(), []);
  const { setGuide } = useGuide();
  useEffect(() => {
    setGuide({
      eyebrow: 'Caustics',
      title: 'Light on the pool floor',
      seeing: 'Sunlight refracts through the moving surface and focuses into the dancing net on the floor.',
      painting: 'Paint caustics as bright, wobbling, broken lines — brightest where the water curves.',
    });
    return () => setGuide(null);
  }, [setGuide]);

  const [c, setC] = useState(0.42);
  const [damp, setDamp] = useState(0.995);
  const [depth, setDepth] = useState(18);
  const [str, setStr] = useState(0.75);
  const [elevation, setElevation] = useState(62);
  const [lightDeg, setLightDeg] = useState(230);
  const [dropR, setDropR] = useState(3.5);
  const [rockR, setRockR] = useState(14);
  const [raining, setRaining] = useState(false);
  const [dripping, setDripping] = useState(true);
  const [crossSection, setCrossSection] = useState(false);
  const { infinite, setInfinite, paused, setPaused, viewDeg, setViewDeg, windSpeed, setWindSpeed, windDeg, setWindDeg } = useSimControls(sim);

  useEffect(() => { sim.c = c; }, [sim, c]);
  useEffect(() => { sim.damp = damp; }, [sim, damp]);
  useEffect(() => { sim.rockR = rockR; sim.buildRock(); }, [sim, rockR]);
  useEffect(() => { renderer.depth = depth; }, [renderer, depth]);
  useEffect(() => { renderer.str = str; }, [renderer, str]);
  useEffect(() => { renderer.elevation = elevation; }, [renderer, elevation]);
  useEffect(() => { renderer.lightDeg = lightDeg; }, [renderer, lightDeg]);
  useEffect(() => { renderer.whitecap = whitecapFromWind(windSpeed); }, [renderer, windSpeed]);

  // seed a few drops so the caustics have something to dance to
  useEffect(() => {
    sim.drop(sim.W * 0.25, sim.H * 0.5, 4, 2.4);
    sim.drop(sim.W * 0.7, sim.H * 0.35, 3, 2.0);
    sim.drop(sim.W * 0.45, sim.H * 0.7, 3, 1.8);
  }, [sim]);

  const canvasRef = useWaterEngine(sim, renderer, {
    getDropSize: () => dropR,
    isPaused: () => paused,
    getViewAngle: () => viewDeg,
    overlay: (cx, w, h) => { drawSun(cx, w, h, lightDeg, elevation); drawWindArrow(cx, w, h, windDeg, windSpeed); },
    onFrame: (s, frame) => {
      wind.update(s, windSpeed, windDeg);
      if (raining && Math.random() < 0.10)
        s.drop(4 + Math.random() * (s.W - 8), 4 + Math.random() * (s.H - 8), 1.5 + Math.random() * 2, 1.6);
      if (dripping && frame % 70 === 0)
        s.drop(s.W * 0.25, s.H * 0.5, dropR, 2.4);
    },
  });

  return (
    <>
      <div className="stage">
        <canvas
          ref={canvasRef}
          className="water-canvas"
          aria-label="Interactive pool floor with light caustics. Tap to drop; drag the rock."
        />
        <div className="hint">tap water to drop · drag finger for a wake · drag the rock to move it</div>
        {crossSection && <CausticsCrossSection sim={sim} depth={depth} elevation={elevation} lightDeg={lightDeg} />}
      </div>

      <div className="panel">
        <div className="controls">
          <Slider label="caustic strength" value={str} display={str.toFixed(2)} min={0.15} max={1.6} step={0.05} onChange={setStr} />
          <Slider label="water depth" value={depth} display={`${depth} px`} min={4} max={42} step={1} onChange={setDepth} />
        </div>
        <div className="row">
          <ToggleButton label="steady drip" pressed={dripping} onToggle={() => setDripping((v) => !v)} />
          <ToggleButton label="cross-section" pressed={crossSection} onToggle={() => setCrossSection((v) => !v)} />
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
            floor light ∝ Σ refracted rays · Snell <b>n=1.33</b> · absorb <b>e<sup>−{(depth * 0.01).toFixed(2)}·c</sup></b>
          </div>
          <div className="controls">
            <Slider label="light height" value={elevation} display={`${elevation}°`} min={8} max={90} step={1} onChange={setElevation} />
            <Slider label="light angle" value={lightDeg} display={`${lightDeg}°`} min={0} max={360} step={5} onChange={setLightDeg} />
            <Slider label="wave speed c" value={c} display={c.toFixed(2)} min={0.1} max={0.62} step={0.01} onChange={setC} />
            <Slider label="damping" value={damp} display={damp.toFixed(3)} min={0.96} max={0.999} step={0.001} onChange={setDamp} />
            <Slider label="drop size" value={dropR} display={dropR.toFixed(1)} min={1.5} max={8} step={0.5} onChange={setDropR} />
            <Slider label="rock radius" value={rockR} display={`${rockR} px`} min={6} max={30} step={1} onChange={setRockR} />
            <Slider label="view angle" value={viewDeg} display={`${viewDeg}°`} min={0} max={65} step={1} onChange={setViewDeg} />
            <WindControls speed={windSpeed} onSpeed={setWindSpeed} deg={windDeg} onDeg={setWindDeg} />
          </div>
          <div className="row">
            <ToggleButton label="rain" pressed={raining} onToggle={() => setRaining((v) => !v)} />
          </div>
        </Details>
      </div>
    </>
  );
}
