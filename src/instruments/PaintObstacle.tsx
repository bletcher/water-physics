import { useEffect, useMemo, useState } from 'react';
import { WaterSim } from '../sim/WaterSim';
import { RippleRenderer } from '../sim/RippleRenderer';
import { WindField, whitecapFromWind } from '../sim/wind';
import { useWaterEngine } from '../hooks/useWaterEngine';
import { useSimControls } from '../hooks/useSimControls';
import { Slider } from '../components/Slider';
import { ToggleButton } from '../components/ToggleButton';
import { SimToggles } from '../components/SimToggles';
import { WindControls } from '../components/WindControls';
import { Details } from '../components/Details';
import { drawWindArrow } from '../overlays';

type Tool = 'drop' | 'wall' | 'erase';

/**
 * Paint-your-own obstacle — brush an arbitrary wall mask and watch how its shape
 * steers reflection and diffraction. Same damped-wave physics as Ripple Study;
 * the obstacle is just cells clamped to zero, so any shape works.
 */
export function PaintObstacle() {
  const sim = useMemo(() => new WaterSim(), []);
  const renderer = useMemo(() => new RippleRenderer(), []);
  const wind = useMemo(() => new WindField(), []);

  const [c, setC] = useState(0.42);
  const [damp, setDamp] = useState(0.996);
  const [dropR, setDropR] = useState(3.5);
  const [brush, setBrush] = useState(7);
  const [lightDeg, setLightDeg] = useState(230);
  const [tool, setTool] = useState<Tool>('wall');
  const [dripping, setDripping] = useState(false);
  const { infinite, setInfinite, paused, setPaused, viewDeg, setViewDeg, windSpeed, setWindSpeed, windDeg, setWindDeg } = useSimControls(sim);

  useEffect(() => { sim.c = c; }, [sim, c]);
  useEffect(() => { sim.damp = damp; }, [sim, damp]);
  useEffect(() => { renderer.lightDeg = lightDeg; }, [renderer, lightDeg]);
  useEffect(() => { renderer.whitecap = whitecapFromWind(windSpeed); }, [renderer, windSpeed]);

  // no circular rock here: park it offscreen so pointer-drag never grabs it,
  // then seed a small starter wall + a drop so the canvas isn't empty.
  useEffect(() => {
    sim.rockR = 0;
    sim.rock.x = -100;
    sim.rock.y = -100;
    sim.clearMask();
    sim.paintMask(sim.W * 0.6, sim.H * 0.5, 10, 1);
    sim.paintMask(sim.W * 0.6, sim.H * 0.32, 6, 1);
    sim.drop(sim.W * 0.2, sim.H * 0.5, 4, 2.4);
  }, [sim]);

  const canvasRef = useWaterEngine(sim, renderer, {
    getDropSize: () => dropR,
    isPaused: () => paused,
    getViewAngle: () => viewDeg,
    overlay: (cx, w, h) => drawWindArrow(cx, w, h, windDeg, windSpeed),
    onPointer: (s, p) => {
      if (tool === 'drop') return false; // fall through to default drop / wake
      s.paintMask(p.x, p.y, brush, tool === 'wall' ? 1 : 0);
      return true;
    },
    onFrame: (s, frame) => {
      wind.update(s, windSpeed, windDeg);
      if (dripping && frame % 70 === 0) s.drop(s.W * 0.2, s.H * 0.5, dropR, 2.4);
    },
  });

  const hint =
    tool === 'drop'
      ? 'tap or drag the water to make waves'
      : tool === 'wall'
        ? 'drag to paint a wall'
        : 'drag to erase the wall';

  return (
    <>
      <div className="stage">
        <canvas
          ref={canvasRef}
          className="water-canvas"
          aria-label="Interactive water surface with a paintable obstacle."
        />
        <div className="hint">{hint}</div>
      </div>

      <div className="panel">
        <div className="row" role="group" aria-label="tool">
          <ToggleButton label="paint wall" pressed={tool === 'wall'} onToggle={() => setTool('wall')} />
          <ToggleButton label="erase" pressed={tool === 'erase'} onToggle={() => setTool('erase')} />
          <ToggleButton label="drop water" pressed={tool === 'drop'} onToggle={() => setTool('drop')} />
        </div>
        <div className="controls">
          <Slider label="brush size" value={brush} display={`${brush} px`} min={2} max={22} step={1} onChange={setBrush} />
        </div>
        <div className="row">
          <button onClick={() => sim.clearMask()}>clear walls</button>
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
            ∂²h/∂t² = <b>({c.toFixed(2)})²</b>∇²h − <b>{(1 - damp).toFixed(3)}</b>·∂h/∂t · wall: <b>h = 0</b>
          </div>
          <div className="controls">
            <Slider label="wave speed c" value={c} display={c.toFixed(2)} min={0.1} max={0.62} step={0.01} onChange={setC} />
            <Slider label="damping" value={damp} display={damp.toFixed(3)} min={0.96} max={0.999} step={0.001} onChange={setDamp} />
            <Slider label="drop size" value={dropR} display={dropR.toFixed(1)} min={1.5} max={8} step={0.5} onChange={setDropR} />
            <Slider label="light angle" value={lightDeg} display={`${lightDeg}°`} min={0} max={360} step={5} onChange={setLightDeg} />
            <Slider label="view angle" value={viewDeg} display={`${viewDeg}°`} min={0} max={65} step={1} onChange={setViewDeg} />
            <WindControls speed={windSpeed} onSpeed={setWindSpeed} deg={windDeg} onDeg={setWindDeg} />
          </div>
          <div className="row">
            <ToggleButton label="steady drip" pressed={dripping} onToggle={() => setDripping((v) => !v)} />
          </div>
        </Details>
      </div>
    </>
  );
}
