// Muestra el logo del especialista desde img/logo.jpeg.
// Si el archivo aun no existe, cae a un monograma elegante "MK".
import { useState } from 'react'

export default function Logo({ size = 44, className = '' }) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div
        className={`grid place-items-center rounded-2xl bg-gradient-to-br from-clinic-500 to-mint-500 text-white font-display font-bold shadow-soft ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        aria-label="Movimiento Koray"
      >
        MK
      </div>
    )
  }

  return (
    <img
      src="/img/logo.jpeg"
      alt="Movimiento Koray"
      onError={() => setError(true)}
      className={`rounded-2xl object-cover shadow-soft ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
