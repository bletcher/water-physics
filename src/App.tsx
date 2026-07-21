import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { GuideProvider } from './shell/GuideProvider';
import { useGuide } from './shell/GuideContext';
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
  { id: 'caustics', name: 'Caustics', blurb: 'Sunlight refracts through the surface and focuses on the pool floor.', component: Caustics },
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

  // guide content: what the room registered, or a fallback while it mounts
  const g = guide ?? { eyebrow: room.name, title: room.name, seeing: room.blurb, painting: '' };
  const caption = g.title;

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
            <button onClick={g.onPrev}>‹ Prev</button>
            <span>{g.progress ? `${g.progress.i + 1} / ${g.progress.n}` : ''}</span>
            <button onClick={g.onNext}>Next ›</button>
          </div>
        )}
        <button className="g-explore" onClick={() => { setGuideOpen(false); setRoomsOpen(true); }}>
          Explore the tools →
        </button>
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
        <button className="g-close" onClick={() => setRoomsOpen(false)}>close</button>
      </aside>

      <div className="bar fade">
        <button className="b-rooms" aria-pressed={roomsOpen} onClick={() => setRoomsOpen((v) => !v)}>
          <span className="b-grid" aria-hidden="true" />Explore
        </button>
        <span className="caption">{caption}</span>
        <div className="b-sep" />
        <button className="b-act" aria-pressed={guideOpen} onClick={() => setGuideOpen((v) => !v)}>
          <span className="d" />Guide
        </button>
        <button className="b-act" aria-pressed={adjustOpen} onClick={() => setAdjustOpen((v) => !v)}>
          <span className="d" />Adjust
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GuideProvider>
      <Shell />
    </GuideProvider>
  );
}
