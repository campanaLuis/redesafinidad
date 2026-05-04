-- Elimina comentarios duplicados en TikTok_comentarios.
-- Criterio: misma combinación post_id + username + comentario (texto exacto).
-- Se conserva una fila por grupo (la de menor ctid, orden estable en Postgres).
--
-- Ejecutar antes en el SQL Editor (solo lectura) para revisar cuántos grupos hay:
--   SELECT COUNT(*) FROM (
--     SELECT post_id, COALESCE(username, ''), COALESCE(comentario, ''), COUNT(*) AS c
--     FROM "TikTok_comentarios"
--     GROUP BY 1, 2, 3
--     HAVING COUNT(*) > 1
--   ) t;

DELETE FROM "TikTok_comentarios" t
WHERE t.ctid IN (
  SELECT ctid
  FROM (
    SELECT
      ctid,
      ROW_NUMBER() OVER (
        PARTITION BY
          post_id,
          COALESCE(username, ''),
          COALESCE(comentario, '')
        ORDER BY ctid
      ) AS rn
    FROM "TikTok_comentarios"
  ) sub
  WHERE rn > 1
);
