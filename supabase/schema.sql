-- ============================================================================
--  CENTRO DE TERAPIA FISICA "MOVIMIENTO KORAY"
--  Esquema de base de datos para Supabase (PostgreSQL)
--  Especialista: Diego Miguel Espinoza Guerrero
--
--  COMO USAR:
--  1. Entra a tu proyecto en https://supabase.com
--  2. Menu lateral -> SQL Editor -> New query
--  3. Pega TODO este archivo y presiona "Run"
--  4. Listo: tablas, indices, seguridad (RLS) y catalogo quedan creados.
-- ============================================================================

-- Extension para generar UUIDs
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PERFILES  (vinculado a Supabase Auth -> auth.users)
--    Aqui se guardan los datos del especialista (Diego).
-- ----------------------------------------------------------------------------
create table if not exists public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null default 'Diego Miguel Espinoza Guerrero',
  rol         text not null default 'fisioterapeuta',
  telefono    text default '996113188',
  creado_en   timestamptz not null default now()
);

-- Crea automaticamente el perfil cuando se registra un usuario en Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', 'Especialista'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. PACIENTES
-- ----------------------------------------------------------------------------
create table if not exists public.pacientes (
  id                        uuid primary key default gen_random_uuid(),
  nombres                   text not null,
  apellidos                 text not null,
  telefono                  text,
  celular                   text,
  fecha_nacimiento          date,
  historial_medico_general  text,
  creado_en                 timestamptz not null default now()
);

create index if not exists idx_pacientes_apellidos on public.pacientes (apellidos);
create index if not exists idx_pacientes_nombres   on public.pacientes (nombres);

-- ----------------------------------------------------------------------------
-- 3. SERVICIOS / PRECIOS  (catalogo oficial)
-- ----------------------------------------------------------------------------
create table if not exists public.servicios_precios (
  id              uuid primary key default gen_random_uuid(),
  nombre_servicio text not null,
  categoria       text not null,
  precio          numeric(10,2) not null check (precio >= 0),
  -- metadatos opcionales para paquetes
  es_paquete      boolean not null default false,
  sesiones        integer,          -- nro de sesiones que incluye el paquete
  activo          boolean not null default true,
  creado_en       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. HISTORIALES CLINICOS  (linea de tiempo de evolucion por paciente)
-- ----------------------------------------------------------------------------
create table if not exists public.historiales_clinicos (
  id                          uuid primary key default gen_random_uuid(),
  paciente_id                 uuid not null references public.pacientes(id) on delete cascade,
  fecha_atencion              date not null default current_date,
  motivo_consulta             text,
  evaluacion_fisioterapeutica text,
  diagnostico                 text,
  evolucion                   text,
  notas_sesion                text,
  creado_en                   timestamptz not null default now()
);

create index if not exists idx_historiales_paciente on public.historiales_clinicos (paciente_id, fecha_atencion desc);

-- ----------------------------------------------------------------------------
-- 5. PAQUETES ADQUIRIDOS  (control de sesiones del paciente)
-- ----------------------------------------------------------------------------
create table if not exists public.paquetes_adquiridos (
  id                  uuid primary key default gen_random_uuid(),
  paciente_id         uuid not null references public.pacientes(id) on delete cascade,
  servicio_id         uuid references public.servicios_precios(id) on delete set null,
  tipo_paquete        text not null,
  sesiones_totales    integer not null check (sesiones_totales > 0),
  sesiones_consumidas integer not null default 0 check (sesiones_consumidas >= 0),
  monto_pagado        numeric(10,2) not null default 0,
  estado_pago         text not null default 'Pendiente'
                      check (estado_pago in ('Pendiente','Parcial','Pagado')),
  creado_en           timestamptz not null default now(),
  constraint chk_consumidas_no_exceden check (sesiones_consumidas <= sesiones_totales)
);

create index if not exists idx_paquetes_paciente on public.paquetes_adquiridos (paciente_id);

-- ----------------------------------------------------------------------------
-- 6. CITAS
-- ----------------------------------------------------------------------------
create table if not exists public.citas (
  id            uuid primary key default gen_random_uuid(),
  paciente_id   uuid not null references public.pacientes(id) on delete cascade,
  servicio_id   uuid references public.servicios_precios(id) on delete set null,
  paquete_id    uuid references public.paquetes_adquiridos(id) on delete set null,
  fecha         date not null,
  hora          time not null,
  estado        text not null default 'Pendiente'
                check (estado in ('Pendiente','Confirmada','Cancelada','Asistida')),
  notas         text,
  creado_en     timestamptz not null default now()
);

create index if not exists idx_citas_fecha     on public.citas (fecha, hora);
create index if not exists idx_citas_paciente  on public.citas (paciente_id);

-- ----------------------------------------------------------------------------
-- 7. INGRESOS / CAJA
-- ----------------------------------------------------------------------------
create table if not exists public.ingresos_caja (
  id            uuid primary key default gen_random_uuid(),
  cita_id       uuid references public.citas(id) on delete set null,
  paquete_id    uuid references public.paquetes_adquiridos(id) on delete set null,
  paciente_id   uuid references public.pacientes(id) on delete set null,
  concepto      text,
  monto         numeric(10,2) not null check (monto >= 0),
  metodo_pago   text not null default 'Efectivo'
                check (metodo_pago in ('Efectivo','Yape','Plin','Transferencia','Tarjeta')),
  fecha_pago    timestamptz not null default now()
);

create index if not exists idx_ingresos_fecha on public.ingresos_caja (fecha_pago desc);

-- ----------------------------------------------------------------------------
-- 8. EGRESOS / CAJA
-- ----------------------------------------------------------------------------
create table if not exists public.egresos_caja (
  id            uuid primary key default gen_random_uuid(),
  concepto      text not null,
  monto         numeric(10,2) not null check (monto > 0),
  categoria     text not null default 'Gastos operativos'
                check (categoria in ('Materiales','Gastos operativos','Equipos','Otros')),
  fecha_egreso  timestamptz not null default now()
);

create index if not exists idx_egresos_fecha on public.egresos_caja (fecha_egreso desc);

-- ============================================================================
--  SEGURIDAD: ROW LEVEL SECURITY (RLS)
--  Modelo single-tenant (una sola clinica). Solo usuarios autenticados
--  (Diego, tras iniciar sesion) pueden leer y escribir. El publico anonimo
--  no tiene acceso a ningun dato clinico.
-- ============================================================================
alter table public.perfiles             enable row level security;
alter table public.pacientes            enable row level security;
alter table public.servicios_precios    enable row level security;
alter table public.historiales_clinicos enable row level security;
alter table public.paquetes_adquiridos  enable row level security;
alter table public.citas                enable row level security;
alter table public.ingresos_caja        enable row level security;
alter table public.egresos_caja         enable row level security;

-- Perfiles: cada usuario ve/edita unicamente su propio perfil
create policy "perfil_propio_select" on public.perfiles
  for select using (auth.uid() = id);
create policy "perfil_propio_update" on public.perfiles
  for update using (auth.uid() = id);

-- Resto de tablas: acceso completo para cualquier usuario autenticado.
-- (Patron de clinica de un solo dueno. Para multi-especialista, agregar una
--  columna owner_id y filtrar por auth.uid() en cada policy.)
do $$
declare t text;
begin
  foreach t in array array[
    'pacientes','servicios_precios','historiales_clinicos',
    'paquetes_adquiridos','citas','ingresos_caja','egresos_caja'
  ]
  loop
    execute format($f$
      create policy "%1$s_auth_all" on public.%1$s
      for all to authenticated using (true) with check (true);
    $f$, t);
  end loop;
end $$;

-- ============================================================================
--  SEED: CATALOGO OFICIAL DE SERVICIOS Y PROMOCIONES
-- ============================================================================
insert into public.servicios_precios (nombre_servicio, categoria, precio, es_paquete, sesiones) values
  ('Evaluacion Fisioterapeutica',                 'Terapia Fisica',        50.00,  false, null),
  ('Terapia Individual',                          'Terapia Fisica',        40.00,  false, null),
  ('Paquete 15 sesiones + 1 evaluacion',          'Paquetes Ahorro',       500.00, true,  15),
  ('Paquete 30 sesiones + 2 evaluaciones',        'Paquetes Ahorro',       1000.00,true,  30),
  ('Masaje Relajante',                            'Masajes Terapeuticos',  60.00,  false, null),
  ('Masaje Descontracturante',                    'Masajes Terapeuticos',  60.00,  false, null),
  ('Masaje Reductor',                             'Masajes Terapeuticos',  80.00,  false, null),
  ('Promo 4 sesiones de masaje reductor',         'Promo Especial',        280.00, true,  4),
  ('Prevencion de Lesiones & Entrenamiento (15 ses.)', 'Deportiva',        600.00, true,  15)
on conflict do nothing;

-- ============================================================================
--  FIN DEL ESQUEMA
-- ============================================================================
