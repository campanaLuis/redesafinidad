-- Aplicar en el PostgreSQL del chatbot (redes-afinidad_db-chatbot / redes-afinidad)
-- Crea las tablas que usan los módulos Beneficiarios y Atención Ciudadana.

-- ── Beneficiarios ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beneficiarios (
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

CREATE INDEX IF NOT EXISTS idx_beneficiarios_programa  ON beneficiarios (programa);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_municipio ON beneficiarios (municipio);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_telefono  ON beneficiarios (telefono);

-- ── Peticiones (Atención Ciudadana) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS peticiones (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                text        NOT NULL,
  telefono              text,
  ubicacion_coordenadas text,
  peticion              text,
  foto_url              text,
  creado_en             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peticiones_creado_en ON peticiones (creado_en DESC);
