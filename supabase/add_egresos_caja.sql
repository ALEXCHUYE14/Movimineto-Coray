-- ============================================================================
--  MIGRACIÓN: Agregar tabla egresos_caja
--  Ejecutar en Supabase → SQL Editor → New query
-- ============================================================================

create table if not exists public.egresos_caja (
  id            uuid primary key default gen_random_uuid(),
  concepto      text not null,
  monto         numeric(10,2) not null check (monto > 0),
  categoria     text not null default 'Gastos operativos'
                check (categoria in ('Materiales','Gastos operativos','Equipos','Otros')),
  fecha_egreso  timestamptz not null default now()
);

create index if not exists idx_egresos_fecha on public.egresos_caja (fecha_egreso desc);

alter table public.egresos_caja enable row level security;

create policy "egresos_caja_auth_all" on public.egresos_caja
  for all to authenticated using (true) with check (true);
