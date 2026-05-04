-- Create the network members table
CREATE TABLE public.red_afinidad_ciudadana (
  id BIGINT PRIMARY KEY,
  path TEXT NOT NULL,
  refiereid TEXT,
  nombre TEXT NOT NULL,
  codigopostal INTEGER,
  colonia TEXT,
  selfie_url TEXT,
  hash_code TEXT UNIQUE,
  twitter_username TEXT,
  instagram_username TEXT,
  facebook_username TEXT,
  temas_mas_interesantes TEXT,
  tiktok_username TEXT,
  telefono BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  direct_descendants_count INTEGER DEFAULT 0,
  total_descendants_count INTEGER DEFAULT 0,
  wa_message TEXT
);

-- Enable Row Level Security
ALTER TABLE public.red_afinidad_ciudadana ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (network data is public)
CREATE POLICY "Anyone can read network data"
ON public.red_afinidad_ciudadana
FOR SELECT
USING (true);

-- Create index on refiereid for faster lookups
CREATE INDEX idx_red_afinidad_refiereid ON public.red_afinidad_ciudadana(refiereid);

-- Create index on path for tree queries
CREATE INDEX idx_red_afinidad_path ON public.red_afinidad_ciudadana(path);