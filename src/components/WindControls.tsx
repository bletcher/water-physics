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
      <Slider label="wind" value={speed} display={`${Math.round(speed * 100)}%`} min={0} max={1} step={0.02} onChange={onSpeed} />
      <Slider label="wind direction" value={deg} display={`${deg}°`} min={0} max={360} step={5} onChange={onDeg} />
    </>
  );
}
