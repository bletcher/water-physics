# Water Physics — surface instruments

Web-based interactive tools for exploring the physics of water surfaces, built
for painterly study. The goal is to expose the *input conditions* — drop size,
wave speed, damping, obstacles, depth, light — that decide where highlights and
dark bands fall, so what happens on screen maps directly onto painting decisions.

Built with **React + TypeScript + Vite**. The physics is framework-free (plain
`Float32Array` math), so each new instrument is just a component that reuses the
same simulation core.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build` (typecheck + production bundle), `npm run preview`
(serve the build), `npm run lint` (oxlint).

## Instruments

Switch between them with the tabs in the header.

### Ripple Study
Shades the surface directly from its normal — fake diffuse light, a sharp
specular sun-glint, crest lift over a deep-teal base. Watch **reflection** off
the rock's front face, **diffraction** bending around its sides, and
**interference** fringes behind it. The **steady drip** button (a fixed source
firing rings at the rock) is the one to show first.

### Caustics
Sunlight refracted through the moving surface, focused onto the pool floor — the
dancing light-net. See [How caustics work](#how-caustics-work) below.

### Paint Obstacle
Same damped-wave physics, but you **brush an arbitrary wall shape** (paint /
erase, adjustable brush) instead of a single circular rock — watch how a jagged
edge scatters differently from a smooth one. The obstacle is just cells clamped
to zero, so any shape works.

### Shallow Water
Open water on the **left** shoals to a beach on the **right**. Wave speed follows
`c ∝ √depth`, so swells rolling in from the left **slow, shorten, and break into
foam (shoaling)**. The **shore curvature** knob bends the coastline, and the
waves **refract** — bend to wrap around it. Depth is shaded in.

**Every instrument leads with a simple face** — a couple of primary knobs and the
main actions. A **"details"** disclosure holds the rest: the live equation,
secondary sliders, and the shared toggles. **Reset** calms the surface back to
still. **Shared interactions:** tap the water to drop · drag a finger for a wake ·
drag the rock to move it.

**Shared options on every instrument:**

- **infinite space** — switches the edges to a non-reflecting (open) boundary so
  waves leave as if the water were unbounded, with no border reflections. Turn it
  off for reflecting **walls** (a tank / pool). On by default.
- **freeze** — pauses time so you can study a frozen surface; lighting and other
  render sliders still update live while frozen.
- **view angle** (in details) — camera pitch from straight-down (0°) to oblique,
  so you can look across the surface instead of only from above. Taps still land
  correctly because the pointer is un-projected through the same perspective.

## The physics

The surface is a **height field** `h(x, y, t)` evolved with the **damped 2D wave
equation**:

```
∂²h/∂t² = c²∇²h − k·∂h/∂t
```

On the grid this is a finite-difference update — each cell's next height depends
on its four current neighbours:

```
h_next = ( 2·h − h_prev + c²·∇²h ) · damp
∇²h    = h[x-1] + h[x+1] + h[y-1] + h[y+1] − 4·h[x]      (5-point Laplacian)
```

- The **rock / walls** are cells clamped to zero (a Dirichlet boundary) —
  reflection, diffraction, and interference emerge for free.
- **Edges** are switchable: reflecting **walls** (Neumann, zero-gradient) or
  **open / infinite** — a Mur first-order absorbing boundary that lets outgoing
  waves leave with almost no reflection.
- **Shallow water** uses a per-cell `c²` field (`c ∝ √depth`) instead of one
  global speed, so waves refract and shoal.

**Stability (CFL):** the explicit scheme is only stable while `c` stays below a
limit set by grid/timestep. Above ~0.62 energy grows instead of propagating — the
visible "shimmer" at high `c` is that numerical instability, not physical water.

**The honest caveat — dispersion.** Real water is *dispersive*: wave speed
depends on wavelength, so a splash sorts into rings with long swells leading and
fine ripples trailing (deep-water gravity waves `ω² = gk`; with surface tension
`ω² = gk + (σ/ρ)k³`, flipping order below ~1.7 cm). The plain wave equation sends
everything at one speed. The physically-correct fix is a spectral / Fourier
(Tessendorf) simulation, which handles obstacles less naturally — a future
instrument.

### How caustics work

For each surface cell we refract a downward sun ray *through* the surface via
**Snell's law** (`η = 1/1.33`) and **splat its light energy** where it lands on
the floor `depth` below. Where rays converge → bright caustic lines; where they
diverge → dark. This forward light-splatting is the physically real method (it is
*scatter*, which is why the sim lives in JS/TS rather than a fragment shader,
which only *gathers*).

- **Sun height** tilts the incident ray; the horizontal offset per unit depth is
  `tan(refracted angle)` from Snell — a low sun streaks the caustics.
- **Beer–Lambert absorption** tints the water: red is lost first, then green,
  then blue, so deeper water reads teal → blue → dark.
- The rock **casts a soft shadow** (its blocked rays never reach the floor).

## Architecture

```
src/
  sim/                       framework-free physics + rendering (no DOM, no React)
    WaterSim.ts              height field, step(), drop(), rock/paint mask,
                             open|walls boundary, per-cell speed field
    types.ts                 Renderer interface
    shade.ts                 shared stone shading for any mask shape
    RippleRenderer.ts        normal-shaded surface
    CausticsRenderer.ts      refracted light on the pool floor
    ShallowWaterRenderer.ts  depth-shaded water with shoreline foam
  hooks/
    useWaterEngine.ts        canvas + RAF loop + pointer interaction; reads live
                             params through a ref so sliders never re-mount the loop
    useSimControls.ts        shared infinite-space + freeze state
  components/
    Slider.tsx               labelled range input
    ToggleButton.tsx         aria-pressed toggle
    SimToggles.tsx           the infinite-space + freeze buttons
  instruments/
    RippleStudy.tsx          normal-shaded surface + a draggable rock
    Caustics.tsx             refracted light on the pool floor
    PaintObstacle.tsx        brush an arbitrary wall shape
    ShallowWater.tsx         shoaling / refraction over a shelving bottom
  App.tsx                    shell + tab nav between instruments
```

**Adding an instrument:** write a `Renderer` in `src/sim/`, then a component in
`src/instruments/` that news up a `WaterSim`, your renderer, and `useWaterEngine`;
register it in `App.tsx`. The physics core is shared and untouched.

## Roadmap

- [x] **Paint-your-own obstacle** — brush an arbitrary wall mask (Paint Obstacle).
- [x] **Shoreline / shallow water** — `c ∝ √depth` refraction + shoaling (Shallow Water).
- [x] **Open / infinite boundary** and **freeze** — on every instrument.
- [ ] **Dispersive (spectral)** — evolve modes in Fourier space by `ω(k)` so splash
      rings sort by wavelength.
- [ ] **WebGL** — move the sim/shading onto the GPU for much larger grids.
- [ ] **Amplitude shoaling** — the linear model bends and slows waves but only
      partly grows their height near shore; a shallow-water energy term would make
      breakers pile up more convincingly.

## Prototypes

The original single-file HTML sketches this project grew from live in
[`prototypes/`](prototypes/) — open either `.html` directly in a browser. They're
kept as a reference for the ported physics.
