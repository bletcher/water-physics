import { useEffect, useMemo, useState } from 'react';
import { WaterSim } from '../sim/WaterSim';
import { RippleRenderer } from '../sim/RippleRenderer';
import { CausticsRenderer } from '../sim/CausticsRenderer';
import { ShallowWaterRenderer } from '../sim/ShallowWaterRenderer';
import { buildShoreFields } from '../sim/shore';
import { WindField, whitecapFromWind } from '../sim/wind';
import { useWaterEngine } from '../hooks/useWaterEngine';
import { Slider } from '../components/Slider';
import { ToggleButton } from '../components/ToggleButton';
import { WindControls } from '../components/WindControls';
import { SunDial } from '../components/SunDial';
import { CausticsCrossSection } from '../components/CausticsCrossSection';
import { drawSun, drawWindArrow } from '../overlays';
import { hexToRgb } from '../color';
import { useGuide } from '../shell/GuideContext';
import { usePalette, floorFromWater } from '../shell/PaletteContext';
import { LESSONS } from '../lessons/steps';
import type { LessonContext } from '../lessons/steps';

/**
 * Learn — a guided path that reveals one idea about water at a time. The concept,
 * the thing to try, and the painting takeaway live in the Guide panel; the Adjust
 * sheet holds only the one or two controls the current step surfaces.
 */
export function Learn() {
  const sim = useMemo(() => new WaterSim(320, 180), []);
  const ripple = useMemo(() => new RippleRenderer(), []);
  const caustics = useMemo(() => new CausticsRenderer(), []);
  const shallow = useMemo(() => new ShallowWaterRenderer(), []);
  const depth = useMemo(() => new Float32Array(sim.N), [sim]);
  const c2 = useMemo(() => new Float32Array(sim.N), [sim]);
  const wind = useMemo(() => new WindField(), []);
  const ctx: LessonContext = useMemo(
    () => ({ sim, ripple, caustics, shallow, depth, c2 }),
    [sim, ripple, caustics, shallow, depth, c2],
  );

  const [i, setI] = useState(0);
  const step = LESSONS[i];
  const renderer = step.renderer === 'ripple' ? ripple : step.renderer === 'caustics' ? caustics : shallow;
  const { setGuide } = useGuide();
  const { palette, valueStudy } = usePalette();

  const [damping, setDamping] = useState(0.994);
  const [lightDeg, setLightDeg] = useState(230);
  const [elevation, setElevation] = useState(40);
  const [curve, setCurve] = useState(0);
  const [viewDeg, setViewDeg] = useState(0);
  const [windSpeed, setWindSpeed] = useState(0);
  const [windDeg, setWindDeg] = useState(40);
  const [isolate, setIsolate] = useState(false);

  // On step change: reset the exposed controls to defaults, then build the scene.
  useEffect(() => {
    setDamping(0.994);
    setLightDeg(step.renderer === 'shallow' ? 210 : 230);
    setElevation(step.renderer === 'caustics' ? 62 : 40);
    setCurve(0);
    setViewDeg(0);
    setWindSpeed(step.controls.includes('wind') ? 0.5 : 0);
    setWindDeg(40);
    setIsolate(false);
    step.configure(ctx);
  }, [i, step, ctx]);

  // publish the lesson to the Guide panel, with in-guide step navigation
  useEffect(() => {
    setGuide({
      eyebrow: `Step ${i + 1} of ${LESSONS.length}`,
      title: step.title,
      seeing: `${step.body} ${step.tryThis}`,
      painting: step.painting,
      deeper: step.deeper,
      formula: step.formula,
      onPrev: () => setI((v) => Math.max(0, v - 1)),
      onNext: () => setI((v) => Math.min(LESSONS.length - 1, v + 1)),
      onStep: (n) => setI(n),
      progress: { i, n: LESSONS.length },
      stepLabels: LESSONS.map((s) => s.title),
      adjustable: step.controls.length > 0,
    });
    return () => setGuide(null);
  }, [i, step, setGuide]);

  useEffect(() => { sim.damp = damping; }, [sim, damping]);
  useEffect(() => {
    ripple.lightDeg = lightDeg;
    caustics.lightDeg = lightDeg;
    shallow.lightDeg = lightDeg;
  }, [ripple, caustics, shallow, lightDeg]);
  useEffect(() => {
    ripple.elevation = elevation;
    caustics.elevation = elevation;
    shallow.elevation = elevation;
  }, [ripple, caustics, shallow, elevation]);
  useEffect(() => {
    const wc = whitecapFromWind(windSpeed);
    ripple.whitecap = wc;
    caustics.whitecap = wc;
    shallow.whitecap = wc;
  }, [ripple, caustics, shallow, windSpeed]);
  useEffect(() => { caustics.isolate = isolate; }, [caustics, isolate]);
  useEffect(() => {
    const p = hexToRgb(palette.primary);
    ripple.primary = p;
    ripple.crest = hexToRgb(palette.crest);
    caustics.floor = floorFromWater(p);
  }, [ripple, caustics, palette]);
  useEffect(() => {
    if (step.renderer !== 'shallow') return;
    buildShoreFields(sim.W, sim.H, depth, c2, { cMax: 0.5, shoreCurve: 1.4, curve });
    sim.c2Field = c2;
    shallow.depthField = depth;
  }, [i, curve, step.renderer, sim, depth, c2, shallow]);

  const showSun = step.controls.includes('light') || step.renderer !== 'ripple';

  const canvasRef = useWaterEngine(sim, renderer, {
    getDropSize: () => 3.2,
    getViewAngle: () => viewDeg,
    valueStudy: () => valueStudy,
    // gate wind by the current step so leaving the wind step never leaves ripples behind
    onFrame: (s, frame) => {
      wind.update(s, step.controls.includes('wind') ? windSpeed : 0, windDeg);
      step.source?.(s, frame);
    },
    overlay: (c, w, h) => { if (showSun) drawSun(c, w, h, lightDeg, elevation); drawWindArrow(c, w, h, windDeg, windSpeed); },
  });

  const hasControls = step.controls.length > 0;

  return (
    <>
      <div className="stage">
        <canvas ref={canvasRef} className="water-canvas" aria-label={step.title} />
        {step.crossSection && (
          <CausticsCrossSection sim={sim} depth={caustics.depth} elevation={elevation} lightDeg={lightDeg} />
        )}
      </div>

      <div className="panel">
        {hasControls && (
          <>
            <div className="controls">
              {step.controls.includes('damping') && (
                <Slider label="calm" value={damping} display={damping.toFixed(3)} min={0.96} max={0.999} step={0.001} onChange={setDamping} />
              )}
              {step.controls.includes('light') && (
                <SunDial deg={lightDeg} elevation={elevation} onChange={(d, el) => { setLightDeg(d); setElevation(el); }} />
              )}
              {step.controls.includes('curve') && (
                <Slider label="shore curvature" value={curve} display={curve.toFixed(2)} min={-0.4} max={0.4} step={0.02} onChange={setCurve} />
              )}
              {step.controls.includes('view') && (
                <Slider label="view angle" value={viewDeg} display={`${viewDeg}°`} min={0} max={65} step={1} onChange={setViewDeg} />
              )}
              {step.controls.includes('wind') && (
                <WindControls speed={windSpeed} onSpeed={setWindSpeed} deg={windDeg} onDeg={setWindDeg} />
              )}
            </div>
            {step.controls.includes('isolate') && (
              <div className="row">
                <ToggleButton label="light only" pressed={isolate} onToggle={() => setIsolate((v) => !v)} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
