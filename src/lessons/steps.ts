import type { WaterSim } from '../sim/WaterSim';
import type { RippleRenderer } from '../sim/RippleRenderer';
import type { CausticsRenderer } from '../sim/CausticsRenderer';
import type { ShallowWaterRenderer } from '../sim/ShallowWaterRenderer';
import type { Formula } from '../shell/GuideContext';
import { buildShoreFields, injectSwell } from '../sim/shore';

export type RendererKey = 'ripple' | 'caustics' | 'shallow';

/** Which control(s) a step surfaces while it's on screen. */
export type LessonControl = 'damping' | 'light' | 'height' | 'curve' | 'view' | 'wind' | 'isolate';

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
  /** optional "Dig deeper" — how the physics actually works */
  deeper?: string;
  /** optional key equation + its variables, shown inside "Dig deeper" */
  formula?: Formula;
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
    deeper: 'Every point on the surface is pulled toward the average height of its neighbours, so a local dip or bump can’t sit still — it spreads outward as a ring. All the rings travel at the same wave speed, which is why they stay concentric and evenly spaced.',
    formula: {
      expr: '∂²h/∂t² = c²∇²h',
      terms: [
        { sym: 'h', desc: 'the surface height at a point' },
        { sym: '∂ …', desc: 'the “∂” just means “a tiny change in”. So ∂h/∂t is how fast the height is moving up or down.' },
        { sym: '∂²h/∂t²', desc: 'the change of that change — the surface’s up-and-down acceleration (how fast its motion speeds up or slows). This is the left side of the equation.' },
        { sym: 'c', desc: 'the wave speed' },
        { sym: '∇²h', desc: 'curvature — how far the point sits above or below the average of its neighbours. The surface is always pulled toward that average, which is what makes rings spread.' },
      ],
    },
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
    deeper: 'Real water has drag, so a little energy is lost every cycle. Each ripple’s height decays by roughly the same fraction per unit time — an exponential fade — so the oldest, farthest rings are always the faintest.',
    formula: {
      expr: 'A = A₀·e^(−t/τ)',
      terms: [
        { sym: 'A', desc: 'the ripple’s height now' },
        { sym: 'A₀', desc: 'its starting height' },
        { sym: 't', desc: 'time' },
        { sym: 'τ', desc: 'how long it takes to fade — bigger in calm, deep water' },
      ],
    },
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
    deeper: 'A rock or bank is a wall the water can’t cross, so a wave hitting it bounces straight back like light off a mirror — leaving at the same angle it arrived. The returning rings then ride back out over the incoming ones.',
    formula: {
      expr: 'θᵢ = θᵣ',
      terms: [
        { sym: 'θᵢ', desc: 'angle the wave comes in at (from the wall’s perpendicular)' },
        { sym: 'θᵣ', desc: 'angle it leaves at — equal, so it mirrors' },
      ],
    },
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
    deeper: 'When two ripples overlap, their heights simply add. Crest on crest piles up higher and brighter; crest on trough cancels to flat. That running sum, shifting as the waves move, is the diamond mesh.',
    formula: {
      expr: 'h = h₁ + h₂',
      terms: [
        { sym: 'h', desc: 'the combined surface height' },
        { sym: 'h₁, h₂', desc: 'the two overlapping waves at that point' },
      ],
    },
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
    deeper: 'Waves don’t stop dead at an edge — they bend around it and spill into the calm behind. How far they wrap depends on wavelength versus the obstacle’s size: long waves curl right around, short ones leave a sharper shadow.',
    formula: {
      expr: 'wrap ∝ λ / d',
      terms: [
        { sym: 'λ', desc: 'wavelength — the spacing between crests' },
        { sym: 'd', desc: 'width of the obstacle' },
        { sym: 'λ / d', desc: 'big when waves are long vs. the rock — then they wrap right around' },
      ],
    },
    configure: (c) => { reset(c.sim); placeRock(c.sim, 0.5, 0.5, 15); },
    source: (s, f) => { if (f % 70 === 0) s.drop(s.W * 0.12, s.H * 0.5, 3.2, 2.4); },
  },
  {
    id: 'light',
    title: 'The sun: angle and height',
    body: 'Highlights sit on the slopes facing the sun. Its compass angle sets which side they land on; its height sets their shape — a high midday sun makes small tight sparkles, a low sun stretches them into long grazing reflections.',
    tryThis: 'Swing the light angle, then drop the light height and watch the highlights stretch into a low-sun glare. The sun marker shows where the light is.',
    painting: 'Match the highlight shape to the sun: crisp dots under a high sun, long streaks under a low one — always on the sun-facing side, and move them together when the light moves.',
    renderer: 'ripple',
    controls: ['light', 'height'],
    deeper: 'A highlight appears wherever the surface tilts so that it mirrors the sun straight to your eye — angle in equals angle out. The sun’s compass direction picks which slopes catch it; its height sets the shape, because a low sun grazes the water and smears each glint into a long streak.',
    formula: {
      expr: 'θ_in = θ_out',
      terms: [
        { sym: 'θ_in', desc: 'the sun’s angle onto the surface' },
        { sym: 'θ_out', desc: 'the mirrored angle toward your eye — a highlight lands where they match' },
      ],
    },
    configure: (c) => { reset(c.sim); },
    source: (s, f) => {
      if (f % 80 === 0) { s.drop(s.W * 0.35, s.H * 0.45, 3, 2.0); s.drop(s.W * 0.65, s.H * 0.55, 3, 2.0); }
    },
  },
  {
    id: 'wind',
    title: 'Wind ruffles the water',
    body: 'Wind rakes the surface into countless small waves that travel with it, their crests lined up across the wind. Gusts scud through as darker ruffled patches — “cat’s paws” — and a hard wind tears the crests into whitecaps and flattens the mirror.',
    tryThis: 'Raise the wind and swing its direction. Watch the ripples line up and drift downwind, the gusts race across, and the reflections break up.',
    painting: 'Let one wind direction organise the whole surface — crests across the wind, texture drifting one way. Drop in a few darker cat’s-paw patches, and add white flecks only where it blows hard.',
    renderer: 'ripple',
    controls: ['wind'],
    deeper: 'Wind drags on the surface and piles the water into small waves that run with it, their crests lined up across the wind. The stronger it blows, the longer it blows, and the more open water it crosses, the bigger those waves grow — until the crests steepen past breaking and tear into whitecaps.',
    configure: (c) => { reset(c.sim); },
  },
  {
    id: 'shore',
    title: 'Shallow water turns toward shore',
    body: 'As the bottom rises toward a beach, waves slow down, bunch closer together, swing around to face the shore, and break into foam.',
    tryThis: 'Bend the shoreline and watch the swells curve to follow it.',
    painting: 'Near shore, waves line up parallel to the beach and whiten as they break. The colour warms from deep teal to sandy green.',
    renderer: 'shallow',
    controls: ['curve'],
    deeper: 'In shallow water the wave speed drops with depth (c ∝ √depth). The part of a crest still in deep water outruns the part in the shallows, so the whole wavefront swings around to line up with the shore — refraction — while it also bunches up, steepens, and finally breaks.',
    formula: {
      expr: 'c = √(g·d)',
      terms: [
        { sym: 'c', desc: 'wave speed' },
        { sym: 'g', desc: 'gravity' },
        { sym: 'd', desc: 'water depth — so shallower water means slower waves' },
      ],
    },
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
    tryThis: 'Watch the moving light on the pool floor, then flip “light only” to see just the net the surface casts.',
    painting: 'Paint them as bright, wobbling, uneven lines — brightest where the water curves. Broken lines suggest their constant motion.',
    renderer: 'caustics',
    controls: ['isolate'],
    crossSection: true,
    deeper: 'Sunlight bends as it crosses from air into water (Snell’s law). The wavy surface acts like a moving lens: where it bulges it spreads light out, where it dips it concentrates it into bright lines on the floor — the caustics — which dance because the lens keeps shifting.',
    formula: {
      expr: 'n₁ sinθ₁ = n₂ sinθ₂',
      terms: [
        { sym: 'n₁, n₂', desc: 'refractive index of air (1.0) and water (1.33)' },
        { sym: 'θ₁', desc: 'ray angle in the air, from straight down' },
        { sym: 'θ₂', desc: 'ray angle once it is in the water' },
      ],
    },
    configure: (c) => { reset(c.sim); c.caustics.depth = 18; c.caustics.str = 0.85; c.caustics.elevation = 62; },
    source: (s, f) => { if (f % 80 === 0) s.drop(s.W * 0.5, s.H * 0.45, 3.2, 2.2); },
  },
  {
    id: 'viewpoint',
    title: 'Choose your viewpoint',
    body: 'The same water looks completely different from straight above versus a low, glancing angle.',
    tryThis: 'Tilt the view from overhead down to an oblique angle.',
    painting: 'From above you read the surface pattern and the caustics; from a low angle you read reflections and the sky. Decide which story your painting tells before you begin.',
    renderer: 'caustics',
    controls: ['view', 'isolate'],
    deeper: 'Looking straight down, most of the light reaching you comes up from the lit floor, so you read the surface pattern and the caustics. Tilt to a low angle and the surface turns mirror-like, bouncing the sky and reflections toward you instead — the shallower your line of sight, the more it reflects (the Fresnel effect).',
    configure: (c) => { reset(c.sim); c.caustics.depth = 18; c.caustics.str = 0.85; c.caustics.elevation = 62; },
    source: (s, f) => { if (f % 80 === 0) s.drop(s.W * 0.5, s.H * 0.45, 3.2, 2.2); },
  },
];
