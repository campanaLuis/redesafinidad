import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/apiClient";

export interface Peticion {
  id: string;
  nombre: string;
  telefono: string | null;
  ubicacion_coordenadas: string | null;
  peticion: string | null;
  foto_url: string | null;
  creado_en: string;
}

interface PeticionesApi {
  rows: Peticion[];
  total: number;
}

async function fetchPeticiones(): Promise<{ rows: Peticion[]; total: number }> {
  return getJson<PeticionesApi>("/api/peticiones?limit=2000000&offset=0");
}

export function useAtencionCiudadanaData() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["atencion_ciudadana"],
    queryFn: fetchPeticiones,
    staleTime: 60_000,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const thisMonth = (() => {
    const now = new Date();
    return rows.filter((r) => {
      const d = new Date(r.creado_en);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  })();

  const withCoords = rows.filter((r) => r.ubicacion_coordenadas?.trim()).length;
  const withFoto = rows.filter((r) => r.foto_url?.trim()).length;

  return { rows, total, thisMonth, withCoords, withFoto, isLoading, isError };
}
