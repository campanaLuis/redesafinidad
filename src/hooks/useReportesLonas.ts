import { useQuery } from "@tanstack/react-query";

export interface ReporteLona {
  id: number;
  telefono: string | null;
  nombre: string | null;
  ubicacion_latitud: number | null;
  ubicacion_longitud: number | null;
  foto_url: string | null;
  apoyodescripcion: string | null;
  apoyodescripcionvoz_url: string | null;
  /** Registro de alta; viene de Postgres `created_at` */
  created_at: string | null;
}

async function fetchReportesLonas(): Promise<ReporteLona[]> {
  const res = await fetch("/api/reportes.php?limit=500");
  if (!res.ok) {
    throw new Error(`Error al cargar reportes: ${res.status} ${res.statusText}`);
  }

  const body = await res.json();
  if (Array.isArray(body)) return body as ReporteLona[];
  if (Array.isArray(body?.data)) return body.data as ReporteLona[];
  if (body?.error) throw new Error(body.error);
  throw new Error("Respuesta inesperada del servidor");
}

export function useReportesLonas() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["reportes_lonas"],
    queryFn: fetchReportesLonas,
    staleTime: 1000 * 60 * 3,
  });

  const withCoords = (data ?? []).filter(
    (r) => r.ubicacion_latitud != null && r.ubicacion_longitud != null,
  );

  return { rows: data ?? [], withCoords, isLoading, isError, error, refetch };
}
