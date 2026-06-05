# 🩺 Movimiento Koray — Sistema de Gestión Clínica

Sistema web **Mobile-First** para el **Centro de Terapia Física Movimiento Koray**
(Lic. Diego Miguel Espinoza Guerrero). Gestiona agenda, pacientes, historias clínicas,
paquetes de sesiones e ingresos desde el celular, tablet o escritorio.

**Stack:** React 18 + Vite · Tailwind CSS · Supabase (PostgreSQL + Auth) · React Router · lucide-react

---

## 🚀 Puesta en marcha (5 pasos)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear el proyecto en Supabase
1. Entra a https://supabase.com y crea un proyecto gratuito.
2. Ve a **SQL Editor → New query**, pega TODO el contenido de
   `supabase/schema.sql` y presiona **Run**. Esto crea las tablas,
   la seguridad (RLS) y carga el catálogo de servicios.

### 3. Configurar credenciales
Copia el archivo de ejemplo y rellénalo:
```bash
cp .env.example .env
```
En **Supabase → Project Settings → API** copia:
- `Project URL`  →  `VITE_SUPABASE_URL`
- `anon public`  →  `VITE_SUPABASE_ANON_KEY`

### 4. Crear el usuario de Diego (login)
En **Supabase → Authentication → Users → Add user**, crea el correo y
contraseña con los que Diego iniciará sesión. (El perfil se crea solo.)

### 5. Ejecutar
```bash
npm run dev
```
Abre la URL que aparece (ej. `http://localhost:5173`).
Para probar **desde el celular** en la misma red Wi-Fi, usa la URL
"Network" que muestra Vite (ej. `http://192.168.x.x:5173`).

---

## 🖼️ Tu logo
Coloca tu imagen como `img/logo.jpeg`. Si no la pones, se muestra un
monograma "MK" automáticamente.

## 📦 Compilar para producción
```bash
npm run build      # genera /dist
npm run preview    # prueba el build localmente
```
Puedes desplegar la carpeta `dist` en Vercel, Netlify o cualquier hosting estático.

---

## 📁 Módulos
- **Inicio:** resumen del día, ingresos del mes, cupos y pacientes activos.
- **Agenda:** vista diaria/semanal táctil; agendar, confirmar, cancelar.
- **Pacientes:** buscador, ficha, paquetes y línea de tiempo clínica.
- **Paquetes:** contador de sesiones con botón −1 / +1 por toque.
- **Caja:** registro de ingresos (Efectivo, Yape, Plin, etc.).
- **Servicios:** catálogo oficial con precios y agendamiento por WhatsApp.

Hecho con buenas prácticas de clean code, accesibilidad táctil (áreas ≥ 48px) y diseño responsivo.
