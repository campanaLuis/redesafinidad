import { useQuery } from "@tanstack/react-query";
import { getJson, sendJson } from "@/lib/apiClient";

export interface Evento {
  evento_id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estatus: string;
  link_ubicacion: string | null;
}

export interface EventoConRegistro extends Evento {
  registrado_at: string;
}

export function useEventosHistorial(hashCode: string | null) {
  return useQuery({
    queryKey: ["eventos-historial", hashCode],
    queryFn: async (): Promise<EventoConRegistro[]> => {
      if (!hashCode) return [];
      return getJson<EventoConRegistro[]>(
        `/api/eventos/historial?hash_code=${encodeURIComponent(hashCode)}`,
      );
    },
    enabled: !!hashCode,
  });
}

export function useEventosProximos() {
  return useQuery({
    queryKey: ["eventos-proximos"],
    queryFn: (): Promise<Evento[]> => getJson<Evento[]>("/api/eventos/proximos"),
  });
}

export async function buscarEvento(eventoId: string): Promise<Evento | null> {
  const r = await fetch(
    "/api/eventos/lookup?evento_id=" + encodeURIComponent(eventoId),
  );
  if (r.status === 404) return null;
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  return r.json() as Promise<Evento>;
}

export async function verificarRegistro(eventoId: string, hashCode: string): Promise<boolean> {
  const p = new URLSearchParams({ evento_id: eventoId, hash_code: hashCode });
  const d = await getJson<{ registered: boolean }>(`/api/eventos/verificar-registro?${p}`);
  return d.registered;
}

export async function registrarAsistencia(eventoId: string, hashCode: string): Promise<void> {
  await sendJson("/api/eventos/registros", "POST", { evento_id: eventoId, hash_code: hashCode });
}
