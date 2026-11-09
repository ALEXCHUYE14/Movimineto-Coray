-- ============================================================================
--  MIGRACION: seguridad por personal autorizado + escala EVA + sesiones restantes
--  Movimiento Koray · Noviembre 2026
--
--  COMO USAR: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
--  Es segura de ejecutar más de una vez y NO borra datos.
--
--  QUÉ HACE:
--  1. Solo las cuentas registradas en "personal_autorizado" pueden ver o
--     modificar datos. Las cuentas que existen hoy quedan autorizadas.
--     Si alguien crea una cuenta nueva por su cuenta, NO verá nada.
--  2. Bloquea la función interna handle_new_user desde la API pública.
--  3. Agrega la escala de dolor EVA (0-10) a cada atención clínica.
--  4. Agrega "sesiones_restantes" (calculada) a los paquetes.
--
--  PARA AUTORIZAR A UN NUEVO MIEMBRO DEL PERSONAL (después de crear su cuenta
--  en Authentication -> Users):
--    insert into public.personal_autorizado (user_id)
--    select id from auth.users where email = 'correo@ejemplo.com';
-- ============================================================================

-- 0) Tabla de tratamientos (ya existe en producción; se incluye para instalaciones nuevas)
create table if not exists public.tratamientos (
  id                   uuid primary key default gen_random_uuid(),
  paciente_id          uuid not null references public.pacientes(id) on delete cascade,
  nombre_tratamiento   text not null,
  diagnostico          text,
  objetivos            text,
  plan_sesiones        text,
  sesiones_previstas   integer default 10 check (sesiones_previstas > 0),
  sesiones_completadas integer default 0 check (sesiones_completadas >= 0),
  estado               text default 'Activo' check (estado in ('Activo','Pausado','Finalizado')),
  fecha_inicio         date default current_date,
  fecha_fin_estimada   date,
  observaciones        text,
  creado_en            timestamptz default now()
);
alter table public.tratamientos enable row level security;
create index if not exists idx_tratamientos_paciente on public.tratamientos (paciente_id);

-- 1) Lista de personal autorizado (sin acceso directo desde la API)
create table if not exists public.personal_autorizado (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  creado_en timestamptz not null default now()
);
alter table public.personal_autorizado enable row level security;
revoke all on public.personal_autorizado from anon, authenticated;

-- Las cuentas existentes son el personal actual de la clínica
insert into public.personal_autorizado (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.es_personal_autorizado()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.personal_autorizado where user_id = auth.uid())
$$;
revoke execute on function public.es_personal_autorizado() from public, anon;
grant execute on function public.es_personal_autorizado() to authenticated;

-- 2) Reemplazar las políticas "cualquier usuario autenticado" por "personal autorizado"
do $$
declare t text;
begin
  foreach t in array array[
    'pacientes','servicios_precios','historiales_clinicos','paquetes_adquiridos',
    'citas','ingresos_caja','egresos_caja','recetas_medicas','tratamientos'
  ]
  loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop policy if exists %I on public.%I', t || '_auth_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_personal', t);
    execute format($f$
      create policy %I on public.%I
      for all to authenticated
      using ((select public.es_personal_autorizado()))
      with check ((select public.es_personal_autorizado()))
    $f$, t || '_personal', t);
  end loop;
end $$;

do $$
begin
  if to_regclass('public.tratamientos') is not null then
    drop policy if exists "Tratamientos acceso autenticado" on public.tratamientos;
  end if;
end $$;

-- 3) La función del trigger de registro no debe poder llamarse desde la API
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 4) Escala de dolor EVA (0 = sin dolor, 10 = dolor máximo) por atención
alter table public.historiales_clinicos
  add column if not exists eva_dolor smallint
  check (eva_dolor is null or (eva_dolor between 0 and 10));

-- 5) Sesiones restantes calculadas por la base (permite filtrar en el servidor)
alter table public.paquetes_adquiridos
  add column if not exists sesiones_restantes integer
  generated always as (sesiones_totales - sesiones_consumidas) stored;

-- Verificación: debe mostrar tu correo en la lista de personal autorizado
select u.email as personal_autorizado
from public.personal_autorizado pa join auth.users u on u.id = pa.user_id;
