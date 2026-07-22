import { Slider } from './Slider';

interface WindControlsProps {
  speed: number;
  onSpeed: (v: number) => void;
  deg: number;
  onDeg: (v: number) => void;
}

/** Wind speed + direction sliders, dropped into a `.controls` grid. */
export function WindControls({ speed, onSpeed, deg, onDeg }: WindControlsProps) {
  return (
    <>
      <Slider label="wind" value={speed} display={`${Math.round(speed * 100)}%`} min={0} max={1} step={0.02} onChange={onSpeed} hint="How hard the wind blows — ruffles the surface into small waves and pushes them downwind." />
      <Slider label="wind direction" value={deg} display={`${deg}°`} min={0} max={360} step={5} onChange={onDeg} hint="Which way the wind blows, as a compass angle." />
    </>
  );
}
