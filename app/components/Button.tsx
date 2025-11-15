import styles from './Button.module.css';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'normal' | 'small' | 'icon';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

export default function Button({ 
  onClick, 
  children, 
  variant = 'primary', 
  size = 'normal',
  disabled = false,
  type = 'button',
  className = ''
}: ButtonProps) {
  const classes = [
    styles.button,
    variant === 'secondary' && styles.secondary,
    variant === 'danger' && styles.danger,
    size === 'small' && styles.small,
    size === 'icon' && styles.icon,
    className
  ].filter(Boolean).join(' ');

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
}