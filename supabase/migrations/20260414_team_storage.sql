-- Equipo administrativo de Brigadas
-- Aplicar en: https://supabase.com/dashboard/project/haxeoyehhngacnclqyib/sql/new

CREATE TABLE IF NOT EXISTS public.admin_team (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_login  text NOT NULL,
  member_id    integer NOT NULL,
  role         text NOT NULL DEFAULT 'enlace',
  created_at   timestamptz DEFAULT now(),
  UNIQUE (owner_login, member_id)
);

ALTER TABLE public.admin_team ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON public.admin_team FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_admin_team_owner ON public.admin_team (owner_login);

-- Apoyos (proyectos) con tareas y beneficiarios embebidos en JSONB
CREATE TABLE IF NOT EXISTS public.team_apoyos (
  id                    text PRIMARY KEY,
  owner_login           text NOT NULL,
  name                  text NOT NULL,
  tasks                 jsonb NOT NULL DEFAULT '[]',
  beneficiary_member_ids jsonb NOT NULL DEFAULT '[]',
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE public.team_apoyos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON public.team_apoyos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_team_apoyos_owner ON public.team_apoyos (owner_login);
