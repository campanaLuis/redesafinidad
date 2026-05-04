import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/apiClient";

export interface EjercitoMember {
  id: string;
  path: string | null;
  refiereid: string | null;
  nombre: string | null;
  codigopostal: string | null;
  colonia: string | null;
  selfie_url: string | null;
  hash_code: string | null;
  twitter_handle: string | null;
  instagram_handle: string | null;
  facebook_handle: string | null;
  tiktok_handle: string | null;
  intereses_text: string | null;
  telefono: string | null;
  created_at: string;
  sexo: string | null;
  fechadenacimiento: string | null;
  tienehijos: boolean | null;
  numhijos: number | null;
  profesion: string | null;
  niveldeestudios: string | null;
  contenidofavorito: string | null;
  tipodeparticipacionpreferida: string | null;
  rolquebusca: string | null;
  respuestaabierta: string | null;
  redessocialesfavoritas: string | null;
  hobbies: string | null;
  telefonoformulario: string | null;
  origen: string | null;
  fecha_registro: string;
}

async function fetchEjercito(): Promise<EjercitoMember[]> {
  return getJson<EjercitoMember[]>("/api/ejercito-digital?limit=2000000&offset=0");
}

function parseDateMX(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const ddmmyyyy = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return new Date(`${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}T12:00:00`);
  }
  const t = new Date(raw);
  return Number.isNaN(t.getTime()) ? null : t;
}

function ageFromFechaNac(fecha: string | null | undefined, ref: Date): number | null {
  const b = parseDateMX(fecha);
  if (!b) return null;
  let a = ref.getFullYear() - b.getFullYear();
  const md = ref.getMonth() * 40 + ref.getDate() - (b.getMonth() * 40 + b.getDate());
  if (md < 0) a--;
  return a >= 0 && a < 150 ? a : null;
}

export function useEjercitoDigitalData() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["ejercito-digital"],
    queryFn: fetchEjercito,
    staleTime: 5 * 60 * 1000,
  });

  const members = data ?? [];
  const total = members.length;

  const newThisMonth = useMemo(() => {
    const now = new Date();
    return members.filter((m) => {
      const d = new Date(m.fecha_registro);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [members]);

  return {
    members,
    total,
    newThisMonth,
    isLoading,
    isError,
    error: error instanceof Error ? error : null,
    refetch,
  };
}

export { ageFromFechaNac, parseDateMX };
