interface SliderProps {
  label: string;
  /** the numeric value bound to the range input */
  value: number;
  /** formatted value shown in the label (e.g. "0.42", "14 px", "230°") */
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

/** A labelled range input with a live monospace value readout. */
export function Slider({ label, value, display, min, max, step, onChange }: SliderProps) {
  return (
    <div className="ctl">
      <label>
        {label} <span className="val">{display}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
