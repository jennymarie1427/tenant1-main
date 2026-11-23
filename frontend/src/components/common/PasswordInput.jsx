import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordInput({ id, className = 'login-input', ...props }) {
  const generatedId = useId()
  const inputId = id || generatedId
  const [visible, setVisible] = useState(false)
  const label = props['aria-label'] || props.placeholder || 'Password'

  return (
    <div className="login-password-field">
      <input {...props} id={inputId} className={className}
        aria-label={label} type={visible ? 'text' : 'password'} />
      <button type="button" className="login-password-toggle"
        aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        aria-controls={inputId} aria-pressed={visible}
        disabled={props.disabled} onClick={() => setVisible(value => !value)}>
        {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
    </div>
  )
}
