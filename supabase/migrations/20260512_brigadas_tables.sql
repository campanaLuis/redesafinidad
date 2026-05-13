-- Aplicar en el PostgreSQL del chatbot (redes-afinidad_db-chatbot)
-- Tablas para el módulo Brigadas: equipo, apoyos y no-registrados.

-- ── Equipo administrativo ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_team (
  id           BIGSERIAL    PRIMARY KEY,
  owner_login  TEXT         NOT NULL,
  member_id    INTEGER      NOT NULL,
  role         TEXT         NOT NULL DEFAULT 'vocal',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (owner_login, member_id)
);
CREATE INDEX IF NOT EXISTS idx_admin_team_owner ON admin_team (owner_login);

-- ── Apoyos (proyectos con beneficiarios y tareas en JSONB) ────────────────
CREATE TABLE IF NOT EXISTS team_apoyos (
  id                     TEXT         PRIMARY KEY,
  owner_login            TEXT         NOT NULL,
  name                   TEXT         NOT NULL,
  tasks                  JSONB        NOT NULL DEFAULT '[]',
  beneficiary_member_ids JSONB        NOT NULL DEFAULT '[]',
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_team_apoyos_owner ON team_apoyos (owner_login);

-- ── Personas de apoyos no registradas en el directorio ───────────────────
-- Columnas apoyo_id y owner_login son requeridas por el frontend.
CREATE TABLE IF NOT EXISTS apoyos_no_registrados (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_login       TEXT         NOT NULL,
  apoyo_id          TEXT         NOT NULL,
  apoyo_nombre      TEXT         NOT NULL,
  curp              TEXT,
  nombre_completo   TEXT,
  programa          TEXT,
  municipio         TEXT,
  localidad         TEXT,
  colonia           TEXT,
  calle             TEXT,
  numero_interior   TEXT,
  numero_exterior   TEXT,
  codigo_postal     TEXT,
  telefono          TEXT,
  numero_de_seccion TEXT,
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  importado_en      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apoyos_noreg_owner  ON apoyos_no_registrados (owner_login);
CREATE INDEX IF NOT EXISTS idx_apoyos_noreg_apoyo  ON apoyos_no_registrados (apoyo_id);
CREATE INDEX IF NOT EXISTS idx_apoyos_noreg_tel    ON apoyos_no_registrados (telefono);

-- ── Personas del equipo no registradas en el directorio ──────────────────
CREATE TABLE IF NOT EXISTS equipo_no_registrados (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT,
  celular         TEXT         NOT NULL,
  rol             TEXT         NOT NULL DEFAULT 'vocal',
  municipio       TEXT,
  localidad       TEXT,
  colonia         TEXT,
  calle           TEXT,
  numero_exterior TEXT,
  codigo_postal   TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  importado_en    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_equipo_noreg_celular ON equipo_no_registrados (celular);
