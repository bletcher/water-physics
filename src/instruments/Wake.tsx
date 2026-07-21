import { useEffect, useMemo, useRef, useState } from 'react';
import { WaterSim } from '../sim/WaterSim';
import { RippleRenderer } from '../sim/RippleRenderer';
import { WindField, whitecapFromWind } from '../sim/wind';
import { makeIWaveKernel } from '../sim/iwave';
import { useWaterEngine } from '../hooks/useWaterEngine';
import { Slider } from '../components/Slider';
import { ToggleButton } from '../components/ToggleButton';
import { WindControls } from '../components/WindControls';
import { SunDial } from '../components/SunDial';
import { Details } from '../components/Details';
import { drawSun, drawBoat, drawWindArrow } from '../overlays';
import { hexToRgb } from '../color';
import { useGuide } from '../shell/GuideContext';
import { usePalette } from '../shell/PaletteContext';

/**
 * Wake — a moving source on the dispersive (iWave) surface. Deep-water dispersion
 * is what gives a boat, duck, or swan its feathered V-wake: the trailing waves
 * always open in the ~19.5° Kelvin wedge, whatever the speed. The boat sails on
 * its own; drag to steer it and curve the wake.
 */
export function Wake() {
  const sim = useMemo(() => new WaterSim(240, 135), []);
  const renderer = useMemo(() => new RippleRenderer(), []);
  const kernel = useMemo(() => makeIWaveKernel(5, 2.0), []);
  const wind = useMemo(() => new WindField(), []);
  const { setGuide } = useGuide();
  const { palette, valueStudy } = usePalette();
  useEffect(() => {
    setGuide({
      eyebrow: 'Wake',
      title: 'A boat and its wake',
      seeing: 'The boat wanders on its own — drag to steer it. Its trailing waves fill the ~19.5° Kelvin wedge.',
      painting: 'A boat, duck, or swan wake always opens at that same angle, whatever the speed.',
      deeper: 'A boat is a moving source of ripples on deep water, where long waves travel faster than short ones (dispersion, ω = √(g·k)). Add up all the wavelets it leaves behind and — by a stationary-phase argument — they always reinforce along a wedge of the same half-angle, about 19.5° (the Kelvin angle), no matter how fast the boat goes. That fixed angle is why every boat, duck, and swan wake shares the same signature shape.',
      formula: {
        expr: 'ω = √(g·k)',
        terms: [
          { sym: 'ω', desc: 'how fast the wave oscillates (frequency)' },
          { sym: 'g', desc: 'gravity' },
          { sym: 'k', desc: 'wavenumber — 2π ÷ wavelength, so big k means short waves' },
        ],
      },
    });
    return () => setGuide(null);
  }, [setGuide]);
  const boat = useRef({ x: 40, y: 80, vx: 1.3, vy: 0, heading: 0 });
  const steer = useRef({ x: 0, y: 0, t: -1 });

  const [boatSpeed, setBoatSpeed] = useState(2);
  const [gravity, setGravity] = useState(0.75);
  const [damp, setDamp] = useState(0.997);
  const [lightDeg, setLightDeg] = useState(230);
  const [elevation, setElevation] = useState(45);
  const [corner, setCorner] = useState(0);
  const [windSpeed, setWindSpeed] = useState(0);
  const [windDeg, setWindDeg] = useState(40);
  const [wedge, setWedge] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    sim.iwaveKernel = kernel;
    sim.rockR = 0;
    sim.rock.x = -100;
    sim.rock.y = -100;
    boat.current.x = sim.W * 0.15;
    boat.current.y = sim.H * 0.5;
  }, [sim, kernel]);
  useEffect(() => { sim.gravity = gravity; }, [sim, gravity]);
  useEffect(() => { sim.damp = damp; }, [sim, damp]);
  useEffect(() => { sim.setCornerRadius(corner); }, [sim, corner]);
  useEffect(() => { renderer.lightDeg = lightDeg; }, [renderer, lightDeg]);
  useEffect(() => { renderer.elevation = elevation; }, [renderer, elevation]);
  useEffect(() => { renderer.whitecap = whitecapFromWind(windSpeed); }, [renderer, windSpeed]);
  useEffect(() => {
    renderer.primary = hexToRgb(palette.primary);
    renderer.crest = hexToRgb(palette.crest);
  }, [renderer, palette]);

  const canvasRef = useWaterEngine(sim, renderer, {
    getDropSize: () => 2,
    substeps: 1,
    isPaused: () => paused,
    valueStudy: () => valueStudy,
    overlay: (cx, w, h, cover) => {
      drawSun(cx, w, h, lightDeg, elevation);
      drawWindArrow(cx, w, h, windDeg, windSpeed);
      const b = boat.current;
      drawBoat(cx, w, h, cover.x + b.x * cover.scale, cover.y + b.y * cover.scale, Math.atan2(b.vy, b.vx), wedge);
    },
    onPointer: (_s, p) => {
      steer.current.x = p.x;
      steer.current.y = p.y;
      steer.current.t = performance.now();
      return true; // steering — don't drop
    },
    onFrame: (s) => {
      wind.update(s, windSpeed, windDeg);
      const b = boat.current, st = steer.current;
      const W = s.W, H = s.H;
      if (performance.now() - st.t < 130) {
        // steering: follow the pointer, take heading from the movement
        const dx = st.x - b.x, dy = st.y - b.y;
        if (dx * dx + dy * dy > 0.2) { b.vx = dx; b.vy = dy; b.heading = Math.atan2(dy, dx); }
        b.x = st.x;
        b.y = st.y;
      } else {
        // random walk: wander the heading, steering softly away from the edges
        b.heading += (Math.random() - 0.5) * 0.14;
        const m = 26;
        let sx = 0, sy = 0;
        if (b.x < m) sx += (m - b.x) / m; else if (b.x > W - m) sx -= (b.x - (W - m)) / m;
        if (b.y < m) sy += (m - b.y) / m; else if (b.y > H - m) sy -= (b.y - (H - m)) / m;
        if (sx !== 0 || sy !== 0) {
          const d = Math.atan2(sy, sx) - b.heading;
          b.heading += Math.atan2(Math.sin(d), Math.cos(d)) * 0.16; // turn toward open water
        }
        b.vx = Math.cos(b.heading) * boatSpeed;
        b.vy = Math.sin(b.heading) * boatSpeed;
        b.x += b.vx;
        b.y += b.vy;
        b.x = b.x < 3 ? 3 : b.x > W - 3 ? W - 3 : b.x;
        b.y = b.y < 3 ? 3 : b.y > H - 3 ? H - 3 : b.y;
      }
      // the boat's disturbance — a small sharp source
      if (b.x > 2 && b.x < W - 2 && b.y > 2 && b.y < H - 2) s.drop(b.x, b.y, 1.5, 0.5);
    },
  });

  const reset = () => {
    sim.clear();
    boat.current.x = sim.W * 0.5;
    boat.current.y = sim.H * 0.5;
    boat.current.heading = Math.random() * Math.PI * 2;
  };

  return (
    <>
      <div className="stage">
        <canvas
          ref={canvasRef}
          className="water-canvas"
          aria-label="A boat leaving a dispersive V-wake. Drag to steer."
        />
        <div className="hint">the boat wanders on its own · drag to steer it and curve the wake</div>
      </div>

      <div className="panel">
        <div className="controls">
          <Slider label="boat speed" value={boatSpeed} display={boatSpeed.toFixed(1)} min={0.4} max={3} step={0.1} onChange={setBoatSpeed} />
          <Slider label="gravity" value={gravity} display={gravity.toFixed(2)} min={0.2} max={1.8} step={0.05} onChange={setGravity} />
        </div>
        <div className="row">
          <ToggleButton label="wedge guide" pressed={wedge} onToggle={() => setWedge((v) => !v)} />
          <button onClick={() => sim.drop(sim.W * 0.5, sim.H * 0.5, 2, 3.2)}>splash</button>
          <button onClick={reset}>reset</button>
          <ToggleButton label={paused ? 'frozen' : 'freeze'} pressed={paused} onToggle={() => setPaused((v) => !v)} />
        </div>

        <Details>
          <div className="eq">
            moving source on deep water · dispersion sets the <b>Kelvin wedge ≈ 19.5°</b>, whatever the speed
          </div>
          <div className="controls">
            <Slider label="damping" value={damp} display={damp.toFixed(3)} min={0.98} max={0.999} step={0.001} onChange={setDamp} />
            <Slider label="corner shape" value={corner} display={corner === 0 ? 'square' : corner >= 1 ? 'round' : corner.toFixed(2)} min={0} max={1} step={0.02} onChange={setCorner} />
            <SunDial deg={lightDeg} elevation={elevation} onChange={(d, el) => { setLightDeg(d); setElevation(el); }} />
            <WindControls speed={windSpeed} onSpeed={setWindSpeed} deg={windDeg} onDeg={setWindDeg} />
          </div>
        </Details>
      </div>
    </>
  );
}
