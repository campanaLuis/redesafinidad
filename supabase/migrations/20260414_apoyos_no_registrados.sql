-- No registrados por apoyo (Brigadas > Apoyos), por dueño y apoyo.
CREATE TABLE IF NOT EXISTS public.apoyos_no_registrados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_login text NOT NULL,
  apoyo_id text NOT NULL,
  apoyo_nombre text NOT NULL,
  curp text,
  nombre_completo text,
  programa text,
  municipio text,
  localidad text,
  colonia text,
  calle text,
  numero_interior text,
  codigo_postal text,
  numero_exterior text,
  telefono text NOT NULL,
  numero_de_seccion text,
  importado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apoyos_no_reg_owner_apoyo
  ON public.apoyos_no_registrados (owner_login, apoyo_id);

ALTER TABLE public.apoyos_no_registrados ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'apoyos_no_registrados' AND policyname = 'anon_all'
  ) THEN
    CREATE POLICY "anon_all" ON public.apoyos_no_registrados
      FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
