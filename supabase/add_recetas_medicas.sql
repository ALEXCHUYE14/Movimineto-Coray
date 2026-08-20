-- ============================================================================
--  MIGRACIÓN: Agregar tabla recetas_medicas (indicaciones terapéuticas)
--  Ejecutar en Supabase → SQL Editor → New query
-- ============================================================================

create table if not exists public.recetas_medicas (
  id               uuid primary key default gen_random_uuid(),
  paciente_id      uuid not null references public.pacientes(id) on delete cascade,
  fecha_emision    date not null default current_date,
  diagnostico      text,
  indicaciones     jsonb not null default '[]'::jsonb,
  recomendaciones  text,
  proximo_control  date,
  creado_en        timestamptz not null default now()
);

create index if not exists idx_recetas_paciente on public.recetas_medicas (paciente_id, fecha_emision desc);

alter table public.recetas_medicas enable row level security;

create policy "recetas_medicas_auth_all" on public.recetas_medicas
  for all to authenticated using (true) with check (true);
