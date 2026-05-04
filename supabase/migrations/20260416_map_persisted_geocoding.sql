-- Persistencia de geocodificación para mapa:
-- - equipo_no_registrados: permite guardar datos base de ubicación y coordenadas.
-- - apoyos_no_registrados / usuarios_de_apoyos: coordenadas persistidas para usuarios de apoyos.
-- - eventos: guarda coordenadas resueltas al crear/editar.

ALTER TABLE IF EXISTS public.apoyos_no_registrados
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

COMMENT ON COLUMN public.apoyos_no_registrados.lat IS 'Latitud WGS84 persistida para visualización en mapa';
COMMENT ON COLUMN public.apoyos_no_registrados.lng IS 'Longitud WGS84 persistida para visualización en mapa';

ALTER TABLE IF EXISTS public.usuarios_de_apoyos
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

COMMENT ON COLUMN public.usuarios_de_apoyos.lat IS 'Latitud WGS84 persistida para visualización en mapa';
COMMENT ON COLUMN public.usuarios_de_apoyos.lng IS 'Longitud WGS84 persistida para visualización en mapa';

ALTER TABLE IF EXISTS public.equipo_no_registrados
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS localidad text,
  ADD COLUMN IF NOT EXISTS colonia text,
  ADD COLUMN IF NOT EXISTS calle text,
  ADD COLUMN IF NOT EXISTS numero_exterior text,
  ADD COLUMN IF NOT EXISTS codigo_postal text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

COMMENT ON COLUMN public.equipo_no_registrados.municipio IS 'Municipio usado para geocodificación opcional en mapa';
COMMENT ON COLUMN public.equipo_no_registrados.localidad IS 'Localidad usada para geocodificación opcional en mapa';
COMMENT ON COLUMN public.equipo_no_registrados.colonia IS 'Colonia usada para geocodificación opcional en mapa';
COMMENT ON COLUMN public.equipo_no_registrados.calle IS 'Calle usada para geocodificación opcional en mapa';
COMMENT ON COLUMN public.equipo_no_registrados.numero_exterior IS 'Número exterior usado para geocodificación opcional en mapa';
COMMENT ON COLUMN public.equipo_no_registrados.codigo_postal IS 'Código postal usado para geocodificación opcional en mapa';
COMMENT ON COLUMN public.equipo_no_registrados.lat IS 'Latitud WGS84 persistida para visualización en mapa';
COMMENT ON COLUMN public.equipo_no_registrados.lng IS 'Longitud WGS84 persistida para visualización en mapa';

ALTER TABLE IF EXISTS public.eventos
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

COMMENT ON COLUMN public.eventos.lat IS 'Latitud WGS84 persistida para visualización en mapa';
COMMENT ON COLUMN public.eventos.lng IS 'Longitud WGS84 persistida para visualización en mapa';
