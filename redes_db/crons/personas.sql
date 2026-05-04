

---- personas
CREATE EXTENSION IF NOT EXISTS ltree;

DROP TABLE IF EXISTS redes_afinidad.personas;
CREATE TABLE redes_afinidad.personas (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  path ltree,
  refiereid INT,
  nombre TEXT,
  codigopostal TEXT,
  colonia TEXT,
  selfie_url TEXT,
  hash_code TEXT UNIQUE,
  twitter_handle TEXT,
  instagram_handle TEXT,
  facebook_handle TEXT,
  tiktok_handle TEXT,
  intereses_voice_note_url TEXT,
  intereses_text TEXT,
  telefono TEXT,
  telefonoformulario TEXT,
  created_at TIMESTAMP DEFAULT now(),
  sexo TEXT,
  fechadenacimiento TEXT,
  tienehijos BOOLEAN,
  numhijos TEXT,
  profesion TEXT,
  niveldeestudios TEXT,
  contenidofavorito TEXT,
  tipodeparticipacionpreferida TEXT,
  rolquebusca TEXT,
  respuestaabierta TEXT,
  redessocialesfavoritas TEXT,
  hobbies TEXT,
  origen TEXT DEFAULT 'chatbot',
  fecha_registro DATE,
  ultimo_mensaje_timestamp TIMESTAMP,
  tiene_permiso_para_modificar_genealogia BOOLEAN DEFAULT false,
  tiene_permiso_para_modificar_genealogia_completa BOOLEAN DEFAULT false,
  tiene_permiso_para_registrar_personas_en_evento BOOLEAN DEFAULT false,
  tiene_permiso_para_registrar_reportes_de_apoyo BOOLEAN DEFAULT false,
  eventoid INT
);
ALTER TABLE redes_afinidad.personas OWNER TO mtonelli;
ALTER TABLE redes_afinidad.personas
ADD COLUMN updated_at TIMESTAMP DEFAULT now();
-- ----------------------------
-- Triggers structure for table personas
-- ----------------------------
CREATE TRIGGER trg_personas_set_hash_code BEFORE INSERT ON redes_afinidad.personas
FOR EACH ROW
EXECUTE PROCEDURE redes_afinidad.personas_set_hash_code();
CREATE TRIGGER trg_personas_set_path AFTER INSERT ON redes_afinidad.personas
FOR EACH ROW
EXECUTE PROCEDURE redes_afinidad.personas_set_path();

-- ----------------------------
-- Uniques structure for table personas
-- ----------------------------
ALTER TABLE redes_afinidad.personas ADD CONSTRAINT personas_hash_code_unique UNIQUE (hash_code);

-- ----------------------------
-- Primary Key structure for table personas
-- ----------------------------
-- ALTER TABLE redes_afinidad.personas ADD CONSTRAINT personas_pkey PRIMARY KEY (id);

-- ----------------------------
-- Foreign Keys structure for table personas
-- ----------------------------
ALTER TABLE redes_afinidad.personas ADD CONSTRAINT personas_eventoid_fkey FOREIGN KEY (eventoid) REFERENCES redes_afinidad.eventos (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE redes_afinidad.personas ADD CONSTRAINT personas_refiereid_fkey FOREIGN KEY (refiereid) REFERENCES redes_afinidad.personas (id) ON DELETE NO ACTION ON UPDATE NO ACTION;



DROP FOREIGN TABLE IF EXISTS redes_afinidad.personas_origen;
CREATE FOREIGN TABLE redes_afinidad.personas_origen (
  id int,
  path text,
  refiereid int,
  nombre text,
  codigopostal text,
  colonia text,
  selfie_url text,
  hash_code text,
  twitter_handle text,
  instagram_handle text,
  facebook_handle text,
  tiktok_handle text,
  intereses_voice_note_url text,
  intereses_text text,
  telefono text,
  telefonoformulario text,
  created_at timestamp,
  sexo text,
  fechadenacimiento text,
  tienehijos boolean,
  numhijos text,
  profesion text,
  niveldeestudios text,
  contenidofavorito text,
  tipodeparticipacionpreferida text,
  rolquebusca text,
  respuestaabierta text,
  redessocialesfavoritas text,
  hobbies text,
  origen text,
  fecha_registro date,
  ultimo_mensaje_timestamp timestamp,
  tiene_permiso_para_modificar_genealogia boolean,
  tiene_permiso_para_modificar_genealogia_completa boolean,
  tiene_permiso_para_registrar_personas_en_evento boolean,
  tiene_permiso_para_registrar_reportes_de_apoyo boolean,
  eventoid int
)
SERVER origen_db
OPTIONS (schema_name 'public', table_name 'personas');

--prueba de path
--SELECT '24.96.124.141.163.169'::ltree;
--SELECT path FROM personas_origen
--- sincronzación

-- funcion para setear path
CREATE OR REPLACE FUNCTION redes_afinidad.personas_set_path()
RETURNS trigger AS $$
BEGIN
  IF NEW.refiereid IS NULL THEN
    NEW.path := NEW.id::text::ltree;
  ELSE
    SELECT path || NEW.id::text::ltree
    INTO NEW.path
    FROM redes_afinidad.personas
    WHERE id = NEW.refiereid;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- cron para sincronizar personas
SELECT cron.schedule(
  'sync_personas',
  '* * * * *',
  $$
  -- UPSERT
  INSERT INTO redes_afinidad.personas (
  id, path, refiereid, nombre, codigopostal, colonia,
  selfie_url, hash_code, twitter_handle, instagram_handle,
  facebook_handle, tiktok_handle,
  intereses_voice_note_url, intereses_text,
  telefono, telefonoformulario,
  created_at, sexo, fechadenacimiento,
  tienehijos, numhijos, profesion, niveldeestudios,
  contenidofavorito, tipodeparticipacionpreferida,
  rolquebusca, respuestaabierta,
  redessocialesfavoritas, hobbies,
  origen, fecha_registro,
  ultimo_mensaje_timestamp,
  tiene_permiso_para_modificar_genealogia,
  tiene_permiso_para_modificar_genealogia_completa,
  tiene_permiso_para_registrar_personas_en_evento,
  tiene_permiso_para_registrar_reportes_de_apoyo,
  eventoid
)
OVERRIDING SYSTEM VALUE
SELECT
  id, path::ltree, refiereid, nombre, codigopostal, colonia,
  selfie_url, hash_code, twitter_handle, instagram_handle,
  facebook_handle, tiktok_handle,
  intereses_voice_note_url, intereses_text,
  telefono, telefonoformulario,
  created_at, sexo, fechadenacimiento,
  tienehijos, numhijos, profesion, niveldeestudios,
  contenidofavorito, tipodeparticipacionpreferida,
  rolquebusca, respuestaabierta,
  redessocialesfavoritas, hobbies,
  origen, fecha_registro,
  ultimo_mensaje_timestamp,
  tiene_permiso_para_modificar_genealogia,
  tiene_permiso_para_modificar_genealogia_completa,
  tiene_permiso_para_registrar_personas_en_evento,
  tiene_permiso_para_registrar_reportes_de_apoyo,
  eventoid
FROM personas_origen
ON CONFLICT (hash_code)
DO UPDATE SET
  nombre = EXCLUDED.nombre,
  telefono = EXCLUDED.telefono,
  colonia = EXCLUDED.colonia,
  codigopostal = EXCLUDED.codigopostal,
  selfie_url = EXCLUDED.selfie_url,
  twitter_handle = EXCLUDED.twitter_handle,
  instagram_handle = EXCLUDED.instagram_handle,
  facebook_handle = EXCLUDED.facebook_handle,
  tiktok_handle = EXCLUDED.tiktok_handle,
  intereses_text = EXCLUDED.intereses_text,
  hobbies = EXCLUDED.hobbies,
  updated_at = now();

  -- DELETE
  DELETE FROM redes_afinidad.personas d
WHERE NOT EXISTS (
  SELECT 1
  FROM personas_origen o
  WHERE o.id = d.id
);
  $$
);