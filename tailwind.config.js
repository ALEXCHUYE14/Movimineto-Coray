/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Paleta clinica: azul confianza, turquesa/menta de bienestar, neutros limpios
        clinic: {
          50:  '#eef6fb',
          100: '#d6e9f4',
          200: '#aed3e9',
          300: '#79b6d9',
          400: '#4593c2',
          500: '#2b78ab',   // azul medico corporativo (principal)
          600: '#215f8c',
          700: '#1d4d72',
          800: '#1c405e',
          900: '#1b3650'
        },
        mint: {
          50:  '#edfbf6',
          100: '#d2f5e9',
          200: '#a8ead4',
          300: '#70d8ba',
          400: '#39bf9b',
          500: '#1aa384',   // turquesa / verde menta (acento)
          600: '#0f836c',
          700: '#0e6857',
          800: '#0f5347',
          900: '#0e453c'
        },
        slatebg: {
          50:  '#f8fafc',
          100: '#f1f5f9'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Sora"', '"Plus Jakarta Sans"', 'sans-serif']
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,40,64,0.04), 0 8px 24px -12px rgba(16,40,64,0.12)',
        card: '0 1px 3px rgba(16,40,64,0.05), 0 12px 32px -16px rgba(16,40,64,0.15)',
        float: '0 8px 28px -6px rgba(43,120,171,0.45)'
      },
      borderRadius: {
        xl2: '1.1rem'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'slide-in': 'slide-in 0.25s ease-out both'
      }
    }
  },
  plugins: []
}
