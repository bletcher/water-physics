import { useRef } from 'react';
import type { PointerEvent as RPointerEvent, KeyboardEvent as RKeyboardEvent } from 'react';
import { useTip } from '../shell/TooltipContext';

interface Props {
  /** azimuth, degrees around the pool (matches the on-canvas sun marker) */
  deg: number;
  /** sun height above the horizon, degrees */
  elevation: number;
  minEl?: number;
  maxEl?: number;
  onChange: (deg: number, elevation: number) => void;
}

/**
 * One draggable sun instead of two sliders: angle around the dial is the compass
 * direction, distance from the centre is the height — centre is straight overhead
 * (midday), the rim is a low sun on the horizon. Artists think "where's the sun,"
 * not "230° at 40°," so this reads at a glance.
 */
export function SunDial({ deg, elevation, minEl = 8, maxEl = 90, onChange }: Props) {
  const padRef = useRef<HTMLDivElement>(null);
  const tip = useTip('Drag the sun. Around the dial sets its compass direction; in and out sets its height — centre is straight overhead (midday), the rim is a low sun on the horizon.');

  const rFrac = Math.max(0, Math.min(1, (maxEl - elevation) / (maxEl - minEl)));
  const az = (deg * Math.PI) / 180;
  const sunX = 50 + Math.cos(az) * rFrac * 50;   // % within the pad
  const sunY = 50 + Math.sin(az) * rFrac * 50;

  const apply = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const r = pad.getBoundingClientRect();
    let dx = (clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (clientY - (r.top + r.height / 2)) / (r.height / 2);
    let mag = Math.hypot(dx, dy);
    if (mag > 1) { dx /= mag; dy /= mag; mag = 1; }
    const newDeg = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360);
    const newEl = Math.round(maxEl - mag * (maxEl - minEl));
    onChange(newDeg, newEl);
  };

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    apply(e.clientX, e.clientY);
  };
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0) return;
    apply(e.clientX, e.clientY);
  };
  const onKeyDown = (e: RKeyboardEvent<HTMLDivElement>) => {
    let d = deg, el = elevation;
    if (e.key === 'ArrowLeft') d = (d - 5 + 360) % 360;
    else if (e.key === 'ArrowRight') d = (d + 5) % 360;
    else if (e.key === 'ArrowUp') el = Math.min(maxEl, el + 3);
    else if (e.key === 'ArrowDown') el = Math.max(minEl, el - 3);
    else return;
    e.preventDefault();
    onChange(d, el);
  };

  return (
    <div className="ctl sundial" {...tip}>
      <label>sun position <span className="val">{deg}° · {elevation}°</span></label>
      <div
        ref={padRef}
        className="sundial-pad"
        role="slider"
        tabIndex={0}
        aria-label="Sun position — drag to set its compass direction and height"
        aria-valuetext={`compass ${deg} degrees, height ${elevation} degrees`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      >
        <span className="sundial-noon" aria-hidden="true" />
        <span className="sundial-sun" style={{ left: `${sunX}%`, top: `${sunY}%` }} aria-hidden="true" />
      </div>
    </div>
  );
}
