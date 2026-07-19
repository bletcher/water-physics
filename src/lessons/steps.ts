import type { WaterSim } from '../sim/WaterSim';
import type { RippleRenderer } from '../sim/RippleRenderer';
import type { CausticsRenderer } from '../sim/CausticsRenderer';
import type { ShallowWaterRenderer } from '../sim/ShallowWaterRenderer';
import { buildShoreFields, injectSwell } from '../sim/shore';

export type RendererKey = 'ripple' | 'caustics' | 'shallow';

/** Which single control (if any) a step surfaces while it's on screen. */
export type LessonControl = 'damping' | 'light' | 'curve' | 'view';

export interface LessonContext {
  sim: WaterSim;
  ripple: RippleRenderer;
  caustics: CausticsRenderer;
  shallow: ShallowWaterRenderer;
  depth: Float32Array;
  c2: Float32Array;
}

export interface LessonStep {
  id: string;
  title: string;
  body: string;
  tryThis: string;
  painting: string;
  renderer: RendererKey;
  controls: LessonControl[];
  /** show the side-view cross-section (light focusing on the floor) */
  crossSection?: boolean;
  /** Set up the scenario when the step opens. */
  configure: (ctx: LessonContext) => void;
  /** Ongoing sources (drips, swells) each frame. */
  source?: (sim: WaterSim, frame: number) => void;
}

/** Return the surface to a clean slate before a step builds its scenario. */
function reset(sim: WaterSim) {
  sim.clear();
  sim.clearMask();
  sim.rockR = 0;
  sim.rock.x = -100;
  sim.rock.y = -100;
  sim.c = 0.42;
  sim.c2Field = null;
  sim.boundary = 'open';
}

function placeRock(sim: WaterSim, fx: number, fy: number, r: number) {
  sim.rockR = r;
  sim.rock.x = sim.W * fx;
  sim.rock.y = sim.H * fy;
  sim.buildRock();
}

export const LESSONS: LessonStep[] = [
  {
    id: 'rings',
    title: 'A disturbance makes rings',
    body: 'Drop something into still water and rings spread out from that point — evenly spaced, all travelling outward at the same speed.',
    tryThis: 'Tap the water a few times and watch the rings expand.',
    painting: 'Real ripples are concentric and regular. Space them evenly and let them grow — the most common mistake is scattering them at random.',
    renderer: 'ripple',
    controls: [],
    configure: (c) => { reset(c.sim); },
    source: (s, f) => { if (f % 95 === 0) s.drop(s.W * 0.5, s.H * 0.5, 3.2, 2.2); },
  },
  {
    id: 'fade',
    title: 'Ripples fade as they travel',
    body: 'Water loses energy as it moves, so older and farther rings sink lower and soften. Deep, still water holds a ripple a long time; shallow or muddy water forgets it fast.',
    tryThis: 'Slide “calm” up and down and watch how long the surface keeps moving.',
    painting: 'Keep your sharpest, highest-contrast ripples near the source, and soften and flatten them as they move outward.',
    renderer: 'ripple',
    controls: ['damping'],
    configure: (c) => { reset(c.sim); },
    source: (s, f) => { if (f % 95 === 0) s.drop(s.W * 0.5, s.H * 0.5, 3.2, 2.2); },
  },
  {
    id: 'reflection',
    title: 'Waves bounce off edges',
    body: 'A rock or a bank reflects waves back the way they came, like a mirror. The returning rings then cross the incoming ones.',
    tryThis: 'Watch the rings hit the rock and travel back out.',
    painting: 'Near rocks and banks you’ll see two sets of ripples overlapping — the incoming ones and their reflections.',
    renderer: 'ripple',
    controls: [],
    configure: (c) => { reset(c.sim); placeRock(c.sim, 0.74, 0.5, 16); },
    source: (s, f) => { if (f % 70 === 0) s.drop(s.W * 0.2, s.H * 0.5, 3.2, 2.4); },
  },
  {
    id: 'interference',
    title: 'Crossing waves interfere',
    body: 'Where two crests meet, the water piles higher; where a crest meets a trough, they cancel to flat. Together they weave a shifting diamond mesh.',
    tryThis: 'Two sources are running — watch the crosshatch of light between them.',
    painting: 'That sparkling net of light-and-dark diamonds is what reads as “water.” Suggest the pattern; don’t draw every diamond.',
    renderer: 'ripple',
    controls: [],
    configure: (c) => { reset(c.sim); },
    source: (s, f) => {
      if (f % 80 === 0) { s.drop(s.W * 0.33, s.H * 0.5, 3, 2.1); s.drop(s.W * 0.67, s.H * 0.5, 3, 2.1); }
    },
  },
  {
    id: 'diffraction',
    title: 'Waves bend around obstacles',
    body: 'Waves curl around the sides of a rock and fill the calm behind it — there is no hard shadow, just gentler water.',
    tryThis: 'Watch the water just behind the rock.',
    painting: 'Water wraps around rocks. Keep the surface continuous behind them — quieter, but never a sharp empty edge.',
    renderer: 'ripple',
    controls: [],
    configure: (c) => { reset(c.sim); placeRock(c.sim, 0.5, 0.5, 15); },
    source: (s, f) => { if (f % 70 === 0) s.drop(s.W * 0.12, s.H * 0.5, 3.2, 2.4); },
  },
  {
    id: 'light',
    title: 'Light rides the slope',
    body: 'You don’t see the height of the water — you see how it tilts. Slopes facing the light catch highlights; slopes facing away fall into shadow.',
    tryThis: 'Sweep the light around and watch the highlights swing to the other side of each ripple.',
    painting: 'Put your brightest marks on the light-facing side of each wavelet and your darks on the shadow side — and move them together when the light moves.',
    renderer: 'ripple',
    controls: ['light'],
    configure: (c) => { reset(c.sim); },
    source: (s, f) => {
      if (f % 80 === 0) { s.drop(s.W * 0.35, s.H * 0.45, 3, 2.0); s.drop(s.W * 0.65, s.H * 0.55, 3, 2.0); }
    },
  },
  {
    id: 'shore',
    title: 'Shallow water turns toward shore',
    body: 'As the bottom rises toward a beach, waves slow down, bunch closer together, swing around to face the shore, and break into foam.',
    tryThis: 'Bend the shoreline and watch the swells curve to follow it.',
    painting: 'Near shore, waves line up parallel to the beach and whiten as they break. The colour warms from deep teal to sandy green.',
    renderer: 'shallow',
    controls: ['curve'],
    configure: (c) => {
      reset(c.sim);
      buildShoreFields(c.sim.W, c.sim.H, c.depth, c.c2, { cMax: 0.5, shoreCurve: 1.4, curve: 0 });
      c.sim.c2Field = c.c2;
      c.sim.c = 0.5;
      c.shallow.depthField = c.depth;
      injectSwell(c.sim, 16);
      injectSwell(c.sim, 60);
    },
    source: (s, f) => { if (f % 90 === 0) injectSwell(s, 8); },
  },
  {
    id: 'caustics',
    title: 'Light focuses on the bottom',
    body: 'In clear shallow water the wavy surface works like a lens, bending sunlight into a bright, dancing net on the floor. It is brightest where the surface bulges.',
    tryThis: 'Watch the moving light on the pool floor.',
    painting: 'Paint caustics as bright, wobbling, uneven lines — brightest where the water curves. Broken lines suggest their constant motion.',
    renderer: 'caustics',
    controls: [],
    crossSection: true,
    configure: (c) => { reset(c.sim); c.caustics.depth = 18; c.caustics.str = 0.85; c.caustics.sunDeg = 62; },
    source: (s, f) => { if (f % 80 === 0) s.drop(s.W * 0.5, s.H * 0.45, 3.2, 2.2); },
  },
  {
    id: 'viewpoint',
    title: 'Choose your viewpoint',
    body: 'The same water looks completely different from straight above versus a low, glancing angle.',
    tryThis: 'Tilt the view from overhead down to an oblique angle.',
    painting: 'From above you read the surface pattern and the caustics; from a low angle you read reflections and the sky. Decide which story your painting tells before you begin.',
    renderer: 'caustics',
    controls: ['view'],
    configure: (c) => { reset(c.sim); c.caustics.depth = 18; c.caustics.str = 0.85; c.caustics.sunDeg = 62; },
    source: (s, f) => { if (f % 80 === 0) s.drop(s.W * 0.5, s.H * 0.45, 3.2, 2.2); },
  },
];
