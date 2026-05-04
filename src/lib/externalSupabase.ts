import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://ejrgdoiilyhthbwfxxxk.supabase.co';
const EXTERNAL_PUBLISHABLE_KEY = 'sb_publishable_XYoXtkLrs0dxPHexJVIkLQ_T0zYOPU4';

export const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_PUBLISHABLE_KEY
);
