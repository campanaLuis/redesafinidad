import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map API response fields to our expected format
function mapMember(member: Record<string, unknown>): Record<string, unknown> {
  return {
    ...member,
    twitter_username: member.twitter_handle ?? member.twitter_username ?? null,
    instagram_username: member.instagram_handle ?? member.instagram_username ?? null,
    facebook_username: member.facebook_handle ?? member.facebook_username ?? null,
    tiktok_username: member.tiktok_handle ?? member.tiktok_username ?? null,
    fecha_nacimiento: member.fecha_nacimiento ?? member.fechadenacimiento ?? null,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EJERCITO_DIGITAL_SECRET = Deno.env.get('EJERCITO_DIGITAL_SECRET');
    
    if (!EJERCITO_DIGITAL_SECRET) {
      throw new Error('EJERCITO_DIGITAL_SECRET is not configured');
    }

    const API_URL = 'https://api-ejercitodigital.seguimientoamigos.com/registros?origen=chatbot';

    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'x-internal-secret': EJERCITO_DIGITAL_SECRET,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed [${response.status}]: ${errorText}`);
    }

    const rawData = await response.json();
    
    // Map the data to our expected format
    const data = Array.isArray(rawData) 
      ? rawData.map(mapMember) 
      : rawData;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error fetching network data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
