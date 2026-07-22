interface ToggleButtonProps {
  label: string;
  pressed: boolean;
  onToggle: () => void;
  /** optional hover tooltip explaining what the toggle does */
  hint?: string;
}

/** A button that reflects an on/off state via aria-pressed (styled in CSS). */
export function ToggleButton({ label, pressed, onToggle, hint }: ToggleButtonProps) {
  return (
    <button aria-pressed={pressed} onClick={onToggle} title={hint}>
      {label}
    </button>
  );
}
