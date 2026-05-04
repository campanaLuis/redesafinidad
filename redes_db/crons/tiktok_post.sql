-- crear tabla para tiktok posts
DROP TABLE IF EXISTS redes_sociales.tiktok_posts;
CREATE TABLE redes_sociales.tiktok_posts (
  post_id TEXT PRIMARY KEY,
  username TEXT,
  posted_date TIMESTAMPTZ,
  url TEXT,
  caption TEXT,
  likes BIGINT DEFAULT 0,
  comentarios BIGINT DEFAULT 0,
  scrap_realizado TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE redes_sociales.tiktok_posts OWNER TO mtonelli;

-- crear tabla temporal para sincronizar tiktok posts
DROP FOREIGN TABLE IF EXISTS redes_sociales.tiktok_posts_origen;
CREATE FOREIGN TABLE redes_sociales.tiktok_posts_origen (
  post_id text,
  username text,
  posted_date timestamptz,
  url text,
  caption text,
  likes bigint,
  comentarios bigint,
  scrap_realizado text,
  created_at timestamptz,
  updated_at timestamptz
)
SERVER origen_db
OPTIONS (schema_name 'public', table_name 'TikTok_posts');

-- insertar tiktok posts en la tabla temporal
INSERT INTO redes_sociales.tiktok_posts (
  post_id,
  username,
  posted_date,
  url,
  caption,
  likes,
  comentarios,
  scrap_realizado,
  created_at,
  updated_at
)
SELECT
  post_id,
  username,
  posted_date,
  url,
  caption,
  likes,
  comentarios,
  scrap_realizado,
  created_at,
  updated_at
FROM tiktok_posts_origen
ON CONFLICT (post_id)
DO UPDATE SET
  username = EXCLUDED.username,
  posted_date = EXCLUDED.posted_date,
  url = EXCLUDED.url,
  caption = EXCLUDED.caption,
  likes = EXCLUDED.likes,
  comentarios = EXCLUDED.comentarios,
  scrap_realizado = EXCLUDED.scrap_realizado,
  updated_at = EXCLUDED.updated_at;

  DELETE FROM redes_sociales.tiktok_posts d
WHERE NOT EXISTS (
  SELECT 1
  FROM tiktok_posts_origen o
  WHERE o.post_id = d.post_id
);