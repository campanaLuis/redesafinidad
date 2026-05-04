-- Coordenadas para mostrar no registrados de apoyos en el mapa (geocodificación).
ALTER TABLE public.apoyos_no_registrados
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

COMMENT ON COLUMN public.apoyos_no_registrados.lat IS 'Latitud WGS84 (opcional, p. ej. vía geocodificación)';
COMMENT ON COLUMN public.apoyos_no_registrados.lng IS 'Longitud WGS84 (opcional)';
