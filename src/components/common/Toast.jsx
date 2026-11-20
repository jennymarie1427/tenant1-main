import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import './toast.css';

export default function Toast({ message, variant = 'success', duration = 5000 }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);
  if (!visible) return null;
  const Icon = variant === 'error' ? CircleAlert : CheckCircle2;
  return <div className={`admin-toast admin-toast--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
    <Icon size={20} aria-hidden="true" /><span>{message}</span>
    <button type="button" aria-label="Dismiss notification" onClick={() => setVisible(false)}><X size={16} /></button>
  </div>;
}
