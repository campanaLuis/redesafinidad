CREATE EXTENSION postgres_fdw;

CREATE SERVER origen_db
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
  dbname 'ejercitodigital-chatbot',
  host 'localhost',
  port '5432'
);

CREATE USER MAPPING FOR mtonelli
SERVER origen_db
OPTIONS (user 'mtonelli', password 'jC0p5g8J');

-- revisar funcion para parsear fechas falla
CREATE OR REPLACE FUNCTION redes_afinidad.parse_fecha(txt TEXT)
RETURNS DATE AS $$
BEGIN
  IF txt IS NULL THEN
    RETURN NULL;
  END IF;

  IF txt ~ '^\d{2}/\d{2}/\d{4}$' THEN
    RETURN to_date(txt, 'DD/MM/YYYY');
  END IF;

  IF txt ~ '^\d{8}$' THEN
    RETURN to_date(txt, 'DDMMYYYY');
  END IF;

  IF txt ~ 'de' THEN
    RETURN to_date(txt, 'DD "de" Month YYYY');
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;