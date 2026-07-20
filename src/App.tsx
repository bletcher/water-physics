import { useState } from 'react';
import type { ComponentType } from 'react';
import { Learn } from './instruments/Learn';
import { RippleStudy } from './instruments/RippleStudy';
import { Caustics } from './instruments/Caustics';
import { PaintObstacle } from './instruments/PaintObstacle';
import { ShallowWater } from './instruments/ShallowWater';
import { Wake } from './instruments/Wake';

type TabId = 'learn' | 'ripple' | 'caustics' | 'paint' | 'shallow' | 'wake';

const INSTRUMENTS: Record<Exclude<TabId, 'learn'>, ComponentType> = {
  ripple: RippleStudy,
  caustics: Caustics,
  paint: PaintObstacle,
  shallow: ShallowWater,
  wake: Wake,
};

const TABS: { id: TabId; name: string; blurb: string }[] = [
  { id: 'learn', name: 'Learn', blurb: 'a guided tour — how water moves, one idea at a time, and how to paint it' },
  { id: 'ripple', name: 'Ripple Study', blurb: 'reflection, diffraction & interference on a damped surface' },
  { id: 'caustics', name: 'Caustics', blurb: 'sunlight refracted through the surface onto the pool floor' },
  { id: 'paint', name: 'Paint Obstacle', blurb: 'brush any wall shape and see how it steers the waves' },
  { id: 'shallow', name: 'Shallow Water', blurb: 'waves slow, refract & shoal over a shelving bottom toward shore' },
  { id: 'wake', name: 'Wake', blurb: 'a moving boat on dispersive deep water — the feathered ~19.5° Kelvin wake' },
];

export default function App() {
  const [active, setActive] = useState<TabId>('learn');
  const current = TABS.find((t) => t.id === active)!;
  const Instrument = active === 'learn' ? null : INSTRUMENTS[active];

  return (
    <div className="app">
      <header className="app-header">
        <h1>Water Physics</h1>
        <p className="sub">{current.blurb}</p>
        <nav className="tabs" aria-label="views">
          {TABS.map((t) => (
            <button
              key={t.id}
              className="tab"
              aria-pressed={t.id === active}
              onClick={() => setActive(t.id)}
            >
              {t.name}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {Instrument ? <Instrument /> : <Learn onDone={() => setActive('ripple')} />}
      </main>
    </div>
  );
}
