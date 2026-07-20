interface ColorPickerProps {
  label: string;
  /** "#rrggbb" */
  value: string;
  onChange: (value: string) => void;
}

/** A labelled colour swatch, laid out like a Slider so it fits the controls grid. */
export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="ctl">
      <label>
        {label} <span className="val">{value}</span>
      </label>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
