import { useEffect, useMemo, useState } from 'react';
import { WaterSim } from '../sim/WaterSim';
import { RippleRenderer } from '../sim/RippleRenderer';
import { useWaterEngine } from '../hooks/useWaterEngine';
import { useSimControls } from '../hooks/useSimControls';
import { Slider } from '../components/Slider';
import { ToggleButton } from '../components/ToggleButton';
import { SimToggles } from '../components/SimToggles';
import { Details } from '../components/Details';
import { drawSun } from '../overlays';

/**
 * Ripple Study — shade the surface directly from its normal. Reflection off the
 * rock, diffraction around its sides, interference behind it.
 */
export function RippleStudy() {
  const sim = useMemo(() => new WaterSim(), []);
  const renderer = useMemo(() => new RippleRenderer(), []);

  const [c, setC] = useState(0.42);
  const [damp, setDamp] = useState(0.994);
  const [dropR, setDropR] = useState(3.5);
  const [rockR, setRockR] = useState(14);
  const [lightDeg, setLightDeg] = useState(230);
  const [elevation, setElevation] = useState(40);
  const [raining, setRaining] = useState(false);
  const [dripping, setDripping] = useState(false);
  const { infinite, setInfinite, paused, setPaused, viewDeg, setViewDeg } = useSimControls(sim);

  // push scalar params into the engine objects
  useEffect(() => { sim.c = c; }, [sim, c]);
  useEffect(() => { sim.damp = damp; }, [sim, damp]);
  useEffect(() => { renderer.lightDeg = lightDeg; }, [renderer, lightDeg]);
  useEffect(() => { renderer.elevation = elevation; }, [renderer, elevation]);
  useEffect(() => { sim.rockR = rockR; sim.buildRock(); }, [sim, rockR]);

  // seed a first drop so the surface isn't blank
  useEffect(() => { sim.drop(sim.W * 0.25, sim.H * 0.5, 4, 2.4); }, [sim]);

  const canvasRef = useWaterEngine(sim, renderer, {
    getDropSize: () => dropR,
    isPaused: () => paused,
    getViewAngle: () => viewDeg,
    overlay: (cx, w, h) => drawSun(cx, w, h, lightDeg, elevation),
    onFrame: (s, frame) => {
      if (raining && Math.random() < 0.10)
        s.drop(4 + Math.random() * (s.W - 8), 4 + Math.random() * (s.H - 8), 1.5 + Math.random() * 2, 1.6);
      if (dripping && frame % 70 === 0)
        s.drop(s.W * 0.25, s.H * 0.5, dropR, 2.4); // fixed source: rings hit the rock
    },
  });

  return (
    <>
      <div className="stage">
        <canvas
          ref={canvasRef}
          className="water-canvas"
          aria-label="Interactive water surface. Tap to drop; drag the rock."
        />
        <div className="hint">tap water to drop · drag finger for a wake · drag the rock to move it</div>
      </div>

      <div className="panel">
        <div className="controls">
          <Slider label="wave speed c" value={c} display={c.toFixed(2)} min={0.1} max={0.62} step={0.01} onChange={setC} />
          <Slider label="damping" value={damp} display={damp.toFixed(3)} min={0.96} max={0.999} step={0.001} onChange={setDamp} />
        </div>
        <div className="row">
          <ToggleButton label="steady drip" pressed={dripping} onToggle={() => setDripping((v) => !v)} />
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
            ∂²h/∂t² = <b>({c.toFixed(2)})²</b>∇²h − <b>{(1 - damp).toFixed(3)}</b>·∂h/∂t
          </div>
          <div className="controls">
            <Slider label="drop size" value={dropR} display={dropR.toFixed(1)} min={1.5} max={8} step={0.5} onChange={setDropR} />
            <Slider label="rock radius" value={rockR} display={`${rockR} px`} min={6} max={30} step={1} onChange={setRockR} />
            <Slider label="light angle" value={lightDeg} display={`${lightDeg}°`} min={0} max={360} step={5} onChange={setLightDeg} />
            <Slider label="light height" value={elevation} display={`${elevation}°`} min={8} max={90} step={1} onChange={setElevation} />
            <Slider label="view angle" value={viewDeg} display={`${viewDeg}°`} min={0} max={65} step={1} onChange={setViewDeg} />
          </div>
          <div className="row">
            <ToggleButton label="rain" pressed={raining} onToggle={() => setRaining((v) => !v)} />
          </div>
        </Details>
      </div>
    </>
  );
}
