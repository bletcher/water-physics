import { useEffect, useMemo, useState } from 'react';
import { WaterSim } from '../sim/WaterSim';
import { RippleRenderer } from '../sim/RippleRenderer';
import { CausticsRenderer } from '../sim/CausticsRenderer';
import { ShallowWaterRenderer } from '../sim/ShallowWaterRenderer';
import { buildShoreFields } from '../sim/shore';
import { useWaterEngine } from '../hooks/useWaterEngine';
import { Slider } from '../components/Slider';
import { CausticsCrossSection } from '../components/CausticsCrossSection';
import { drawSun } from '../overlays';
import { LESSONS } from '../lessons/steps';
import type { LessonContext } from '../lessons/steps';

interface LearnProps {
  /** called from the final step's button to hand off to free play */
  onDone: () => void;
}

/**
 * Learn — a guided path that reveals one idea about water at a time: a concept, a
 * thing to try on the live surface, and a painting takeaway. Reuses the same sim
 * and renderers as the free-play instruments; each step reconfigures the scene.
 */
export function Learn({ onDone }: LearnProps) {
  const sim = useMemo(() => new WaterSim(), []);
  const ripple = useMemo(() => new RippleRenderer(), []);
  const caustics = useMemo(() => new CausticsRenderer(), []);
  const shallow = useMemo(() => new ShallowWaterRenderer(), []);
  const depth = useMemo(() => new Float32Array(sim.N), [sim]);
  const c2 = useMemo(() => new Float32Array(sim.N), [sim]);
  const ctx: LessonContext = useMemo(
    () => ({ sim, ripple, caustics, shallow, depth, c2 }),
    [sim, ripple, caustics, shallow, depth, c2],
  );

  const [i, setI] = useState(0);
  const step = LESSONS[i];
  const renderer = step.renderer === 'ripple' ? ripple : step.renderer === 'caustics' ? caustics : shallow;

  // exposed-control state (only the ones the current step surfaces are shown)
  const [damping, setDamping] = useState(0.994);
  const [lightDeg, setLightDeg] = useState(230);
  const [curve, setCurve] = useState(0);
  const [viewDeg, setViewDeg] = useState(0);

  // On step change: reset the exposed controls to defaults, then build the scene.
  useEffect(() => {
    setDamping(0.994);
    setLightDeg(step.renderer === 'shallow' ? 210 : 230);
    setCurve(0);
    setViewDeg(0);
    step.configure(ctx);
  }, [i, step, ctx]);

  // Keep the exposed controls wired to the sim / renderers.
  useEffect(() => { sim.damp = damping; }, [sim, damping]);
  useEffect(() => {
    ripple.lightDeg = lightDeg;
    caustics.lightDeg = lightDeg;
    shallow.lightDeg = lightDeg;
  }, [ripple, caustics, shallow, lightDeg]);
  useEffect(() => {
    if (step.renderer !== 'shallow') return;
    buildShoreFields(sim.W, sim.H, depth, c2, { cMax: 0.5, shoreCurve: 1.4, curve });
    sim.c2Field = c2;
    shallow.depthField = depth;
  }, [i, curve, step.renderer, sim, depth, c2, shallow]);

  // show the sun where the light matters: the light lesson and the lit 3-D scenes
  const showSun = step.controls.includes('light') || step.renderer !== 'ripple';

  const canvasRef = useWaterEngine(sim, renderer, {
    getDropSize: () => 3.2,
    getViewAngle: () => viewDeg,
    onFrame: (s, frame) => { step.source?.(s, frame); },
    overlay: (c, w, h) => { if (showSun) drawSun(c, w, h, lightDeg); },
  });

  const last = i === LESSONS.length - 1;

  return (
    <>
      <div className="stage">
        <canvas ref={canvasRef} className="water-canvas" aria-label={step.title} />
        <div className="hint">tap the water to make waves</div>
        {step.crossSection && <CausticsCrossSection sim={sim} depth={caustics.depth} />}
      </div>

      <div className="panel lesson">
        <div className="lesson-top">
          <span className="lesson-count">{i + 1} / {LESSONS.length}</span>
          <div className="lesson-dots" role="tablist" aria-label="lesson steps">
            {LESSONS.map((s, k) => (
              <button
                key={s.id}
                className={'dot' + (k === i ? ' on' : '')}
                role="tab"
                aria-selected={k === i}
                aria-label={`Step ${k + 1}: ${s.title}`}
                onClick={() => setI(k)}
              />
            ))}
          </div>
        </div>

        <h2 className="lesson-title">{step.title}</h2>
        <p className="lesson-body">{step.body}</p>
        <p className="lesson-try"><span>Try</span>{step.tryThis}</p>

        {step.controls.length > 0 && (
          <div className="controls lesson-controls">
            {step.controls.includes('damping') && (
              <Slider label="calm" value={damping} display={damping.toFixed(3)} min={0.96} max={0.999} step={0.001} onChange={setDamping} />
            )}
            {step.controls.includes('light') && (
              <Slider label="light angle" value={lightDeg} display={`${lightDeg}°`} min={0} max={360} step={5} onChange={setLightDeg} />
            )}
            {step.controls.includes('curve') && (
              <Slider label="shore curvature" value={curve} display={curve.toFixed(2)} min={-0.4} max={0.4} step={0.02} onChange={setCurve} />
            )}
            {step.controls.includes('view') && (
              <Slider label="view angle" value={viewDeg} display={`${viewDeg}°`} min={0} max={65} step={1} onChange={setViewDeg} />
            )}
          </div>
        )}

        <div className="lesson-paint"><span>For painting</span>{step.painting}</div>

        <div className="lesson-nav">
          <button disabled={i === 0} onClick={() => setI((v) => Math.max(0, v - 1))}>← Back</button>
          {last
            ? <button className="lesson-next" onClick={onDone}>Start exploring →</button>
            : <button className="lesson-next" onClick={() => setI((v) => Math.min(LESSONS.length - 1, v + 1))}>Next →</button>}
        </div>
      </div>
    </>
  );
}
