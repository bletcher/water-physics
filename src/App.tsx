import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { GuideProvider } from './shell/GuideProvider';
import { useGuide } from './shell/GuideContext';
import { PaletteProvider } from './shell/PaletteProvider';
import { usePalette } from './shell/PaletteContext';
import { TooltipProvider } from './shell/TooltipProvider';
import { useTooltip } from './shell/TooltipContext';
import { ColorPicker } from './components/ColorPicker';
import { ToggleButton } from './components/ToggleButton';
import { useChrome } from './hooks/useChrome';
import { Learn } from './instruments/Learn';
import { RippleStudy } from './instruments/RippleStudy';
import { Caustics } from './instruments/Caustics';
import { PaintObstacle } from './instruments/PaintObstacle';
import { ShallowWater } from './instruments/ShallowWater';
import { Wake } from './instruments/Wake';

type RoomId = 'learn' | 'ripple' | 'caustics' | 'paint' | 'shallow' | 'wake';

const ROOMS: { id: RoomId; name: string; blurb: string; component: ComponentType }[] = [
  { id: 'learn', name: 'Learn', blurb: 'A guided path through how water moves — one idea at a time.', component: Learn },
  { id: 'ripple', name: 'Ripple Study', blurb: 'Rings spread, reflect off the rock, and cross into an interference mesh.', component: RippleStudy },
  { id: 'caustics', name: 'Light on the Floor', blurb: 'Sunlight refracts through the surface and focuses on the pool floor.', component: Caustics },
  { id: 'paint', name: 'Paint Obstacle', blurb: 'Brush a wall and watch the waves reflect and bend around it.', component: PaintObstacle },
  { id: 'shallow', name: 'Shallow Water', blurb: 'Waves roll in, slow, and break on the beach; a curved shore refracts them.', component: ShallowWater },
  { id: 'wake', name: 'Wake', blurb: 'A moving boat throws a feathered V — the ~19.5° Kelvin wake.', component: Wake },
];

function Shell() {
  const [active, setActive] = useState<RoomId>('learn');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [hintGone, setHintGone] = useState(false);
  const awake = useChrome();
  const { guide } = useGuide();
  const { palette, setPalette, valueStudy, setValueStudy, resetColours } = usePalette();
  const { show: showTip, hide: hideTip } = useTooltip();

  const idx = ROOMS.findIndex((r) => r.id === active);
  const room = ROOMS[idx];
  const Room = room.component;

  const pick = (id: RoomId) => { setActive(id); setRoomsOpen(false); };
  const course = ROOMS.filter((r) => r.id === 'learn');
  const explorations = ROOMS.filter((r) => r.id !== 'learn');

  useEffect(() => {
    const t = window.setTimeout(() => setHintGone(true), 5600);
    return () => clearTimeout(t);
  }, []);

  // Learn is the course — open the guide when you step into it
  useEffect(() => { if (active === 'learn') setGuideOpen(true); }, [active]);

  // some rooms (or Learn steps) expose no controls — hide Adjust entirely
  const canAdjust = guide ? guide.adjustable !== false : true;
  useEffect(() => { if (!canAdjust) setAdjustOpen(false); }, [canAdjust]);

  // guide content: what the room registered, or a fallback while it mounts
  const g = guide ?? { eyebrow: room.name, title: room.name, seeing: room.blurb, painting: '' };

  const cls = ['app', awake ? 'awake' : '', adjustOpen ? 'adjust-open' : '', roomsOpen ? 'rooms-open' : '']
    .filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <main className="room" key={active}>
        <Room />
      </main>

      <div className="brand fade">
        <h1>{room.name}</h1>
        <small>Water Physics</small>
      </div>

      {!hintGone && (
        <div className="run-hint">
          Watch the water — <b>Guide</b> and <b>Adjust</b> fade as you do. Move to bring them back.
        </div>
      )}

      <aside className={'guide fade' + (guideOpen ? '' : ' closed')} aria-label="guide">
        <div className="g-eyebrow">{g.eyebrow}</div>
        <h2>{g.title}</h2>
        <p className="g-seeing">{g.seeing}</p>
        {g.painting && (
          <div className="g-paint"><b>For painting</b>{g.painting}</div>
        )}
        {g.onPrev && g.onNext && (
          <div className="g-steps">
            <button className="g-arrow" onClick={g.onPrev} aria-label="Previous step">‹</button>
            {g.progress && g.onStep ? (
              <div className="g-dots" role="tablist" aria-label="lesson steps">
                {Array.from({ length: g.progress.n }, (_, k) => {
                  const go = g.onStep!;
                  const on = k === g.progress!.i;
                  const label = g.stepLabels?.[k] ?? `Step ${k + 1}`;
                  const tip = `${k + 1}. ${label}`;
                  return (
                    <button
                      key={k}
                      className={'g-dot' + (on ? ' on' : '')}
                      aria-label={`Go to step ${k + 1}: ${label}`}
                      aria-current={on}
                      onClick={() => go(k)}
                      onMouseEnter={(e) => showTip(tip, e.currentTarget.getBoundingClientRect())}
                      onMouseLeave={hideTip}
                      onFocus={(e) => showTip(tip, e.currentTarget.getBoundingClientRect())}
                      onBlur={hideTip}
                    />
                  );
                })}
              </div>
            ) : (
              <span>{g.progress ? `${g.progress.i + 1} / ${g.progress.n}` : ''}</span>
            )}
            <button className="g-arrow" onClick={g.onNext} aria-label="Next step">›</button>
          </div>
        )}
        {active !== 'learn' && (
          <button className="g-explore" onClick={() => { setGuideOpen(false); setRoomsOpen(true); }}>
            Explore the tools →
          </button>
        )}
        {g.deeper && (
          <details className="g-deeper">
            <summary>Dig deeper — the physics</summary>
            <p>{g.deeper}</p>
            {g.formula && (
              <details className="g-eqn">
                <summary>The equation</summary>
                <span className="g-formula">{g.formula.expr}</span>
                <dl className="g-terms">
                  {g.formula.terms.map((t) => (
                    <div key={t.sym}>
                      <dt>{t.sym}</dt>
                      <dd>{t.desc}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </details>
        )}
      </aside>

      <aside className={'rooms fade' + (roomsOpen ? '' : ' closed')} aria-label="rooms">
        <div className="r-eyebrow">Rooms</div>
        <div className="r-group">
          <div className="r-label">Guided</div>
          {course.map((r) => (
            <button key={r.id} className={'r-room' + (r.id === active ? ' on' : '')} onClick={() => pick(r.id)}>
              <span className="r-name">{r.name}</span>
              <span className="r-desc">{r.blurb}</span>
            </button>
          ))}
        </div>
        <div className="r-group">
          <div className="r-label">Explorations</div>
          {explorations.map((r) => (
            <button key={r.id} className={'r-room' + (r.id === active ? ' on' : '')} onClick={() => pick(r.id)}>
              <span className="r-name">{r.name}</span>
              <span className="r-desc">{r.blurb}</span>
            </button>
          ))}
        </div>
        <div className="r-group r-settings">
          <div className="r-label">
            <span>Settings — colour</span>
            <button className="r-reset" onClick={resetColours}>reset colours</button>
          </div>
          <div className="controls">
            <ColorPicker label="water" value={palette.primary} onChange={(v) => setPalette({ primary: v })} />
            <ColorPicker label="crest" value={palette.crest} onChange={(v) => setPalette({ crest: v })} />
          </div>
          <p className="r-note">Applies to every tool — ripples, wake and the light on the floor.</p>
        </div>
        <div className="r-group r-settings">
          <div className="r-label">Settings — value study</div>
          <ToggleButton label={valueStudy ? 'value study on' : 'value study off'} pressed={valueStudy} onToggle={() => setValueStudy(!valueStudy)} />
          <p className="r-note">
            Flattens whatever you’re watching into a few flat tones of light and dark —
            no colour, no detail. It’s how painters block in the big shapes first, before
            any colour goes down. Turn it on in any tool to check your values.
          </p>
        </div>
        <button className="g-close" onClick={() => setRoomsOpen(false)}>close</button>
      </aside>

      <div className="bar fade">
        <button className="b-rooms" aria-pressed={roomsOpen} onClick={() => setRoomsOpen((v) => !v)}>
          <span className="b-grid" aria-hidden="true" />Explore
        </button>
        <div className="b-sep" />
        <button className="b-act" aria-pressed={guideOpen} onClick={() => setGuideOpen((v) => !v)}>
          <span className="d" />Guide
        </button>
        {canAdjust && (
          <button className="b-act" aria-pressed={adjustOpen} onClick={() => setAdjustOpen((v) => !v)}>
            <span className="d" />Adjust
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <PaletteProvider>
      <GuideProvider>
        <TooltipProvider>
          <Shell />
        </TooltipProvider>
      </GuideProvider>
    </PaletteProvider>
  );
}
