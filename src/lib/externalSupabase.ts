import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const EXTERNAL_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_PUBLISHABLE_KEY
);
