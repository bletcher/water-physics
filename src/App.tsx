import { useState } from 'react';
import type { ComponentType } from 'react';
import { RippleStudy } from './instruments/RippleStudy';
import { Caustics } from './instruments/Caustics';
import { PaintObstacle } from './instruments/PaintObstacle';
import { ShallowWater } from './instruments/ShallowWater';

type InstrumentId = 'ripple' | 'caustics' | 'paint' | 'shallow';

const INSTRUMENTS: { id: InstrumentId; name: string; blurb: string; component: ComponentType }[] = [
  { id: 'ripple', name: 'Ripple Study', blurb: 'reflection, diffraction & interference on a damped surface', component: RippleStudy },
  { id: 'caustics', name: 'Caustics', blurb: 'sunlight refracted through the surface onto the pool floor', component: Caustics },
  { id: 'paint', name: 'Paint Obstacle', blurb: 'brush any wall shape and see how it steers the waves', component: PaintObstacle },
  { id: 'shallow', name: 'Shallow Water', blurb: 'waves slow, refract & shoal over a shelving bottom toward shore', component: ShallowWater },
];

export default function App() {
  const [active, setActive] = useState<InstrumentId>('ripple');
  const current = INSTRUMENTS.find((i) => i.id === active)!;
  const Instrument = current.component;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Water Physics</h1>
        <p className="sub">{current.blurb}</p>
        <nav className="tabs" aria-label="instruments">
          {INSTRUMENTS.map((i) => (
            <button
              key={i.id}
              className="tab"
              aria-pressed={i.id === active}
              onClick={() => setActive(i.id)}
            >
              {i.name}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <Instrument />
      </main>
    </div>
  );
}
