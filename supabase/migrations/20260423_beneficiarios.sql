-- Tabla: beneficiarios
-- Almacena el padrón de beneficiarios de programas sociales.
-- Aplicar en: https://supabase.com/dashboard/project/haxeoyehhngacnclqyib/sql/new

CREATE TABLE IF NOT EXISTS public.beneficiarios (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  curp              text        UNIQUE NOT NULL,
  nombre_completo   text,
  programa          text,
  municipio         text,
  localidad         text,
  colonia           text,
  calle             text,
  numero_interior   text,
  numero_exterior   text,
  codigo_postal     text,
  telefono          text,
  numero_de_seccion text,
  creado_en         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.beneficiarios IS
  'Padrón de beneficiarios de programas sociales con datos de contacto y ubicación.';

-- Índices de búsqueda frecuente
CREATE INDEX IF NOT EXISTS idx_beneficiarios_curp
  ON public.beneficiarios (curp);

CREATE INDEX IF NOT EXISTS idx_beneficiarios_programa
  ON public.beneficiarios (programa);

CREATE INDEX IF NOT EXISTS idx_beneficiarios_municipio
  ON public.beneficiarios (municipio);

CREATE INDEX IF NOT EXISTS idx_beneficiarios_telefono
  ON public.beneficiarios (telefono);

-- RLS: el cliente anon puede leer e insertar
ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select" ON public.beneficiarios
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert" ON public.beneficiarios
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update" ON public.beneficiarios
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete" ON public.beneficiarios
  FOR DELETE TO anon USING (true);
