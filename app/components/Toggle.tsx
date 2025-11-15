'use client';

import styles from './Toggle.module.css';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export default function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <div className={styles.container}>
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`${styles.toggle} ${checked ? styles.checked : ''}`}
      >
        <span className={styles.thumb} />
      </button>
    </div>
  );
}