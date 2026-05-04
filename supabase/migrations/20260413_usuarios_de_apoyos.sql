-- Tabla: apoyos_no_registrados
-- Almacena las personas importadas desde Excel en Apoyos
-- que no coincidieron con ningún seguidor ya registrado.
-- Aplicar en: https://supabase.com/dashboard/project/haxeoyehhngacnclqyib/sql/new

CREATE TABLE IF NOT EXISTS public.apoyos_no_registrados (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  apoyo_nombre      text        NOT NULL,
  curp              text,
  nombre_completo   text,
  programa          text,
  municipio         text,
  localidad         text,
  colonia           text,
  calle             text,
  numero_interior   text,
  codigo_postal     text,
  numero_exterior   text,
  telefono          text,
  numero_de_seccion text,
  importado_en      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.apoyos_no_registrados IS
  'Personas importadas desde Excel (Apoyos) que no coincidieron con ningún seguidor registrado.';

-- Índices de consulta frecuente
CREATE INDEX IF NOT EXISTS idx_apoyos_no_reg_telefono
  ON public.apoyos_no_registrados (telefono);

CREATE INDEX IF NOT EXISTS idx_apoyos_no_reg_apoyo
  ON public.apoyos_no_registrados (apoyo_nombre);

-- RLS: el cliente anon puede insertar y leer
ALTER TABLE public.apoyos_no_registrados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert" ON public.apoyos_no_registrados
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_select" ON public.apoyos_no_registrados
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_delete" ON public.apoyos_no_registrados
  FOR DELETE TO anon USING (true);
