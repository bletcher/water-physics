interface ToggleButtonProps {
  label: string;
  pressed: boolean;
  onToggle: () => void;
}

/** A button that reflects an on/off state via aria-pressed (styled in CSS). */
export function ToggleButton({ label, pressed, onToggle }: ToggleButtonProps) {
  return (
    <button aria-pressed={pressed} onClick={onToggle}>
      {label}
    </button>
  );
}
