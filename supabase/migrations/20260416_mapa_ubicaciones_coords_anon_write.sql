-- Permite que la app guarde la caché de ubicaciones de seguidores.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mapa_ubicaciones_coords'
      AND policyname = 'anon_write_ubicaciones'
  ) THEN
    CREATE POLICY "anon_write_ubicaciones"
      ON public.mapa_ubicaciones_coords
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
