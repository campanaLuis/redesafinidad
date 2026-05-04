import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/apiClient";

export interface Beneficiario {
  id: string;
  curp: string;
  nombre_completo: string | null;
  programa: string | null;
  municipio: string | null;
  localidad: string | null;
  colonia: string | null;
  calle: string | null;
  numero_interior: string | null;
  numero_exterior: string | null;
  codigo_postal: string | null;
  telefono: string | null;
  numero_de_seccion: string | null;
  creado_en: string;
}

async function fetchBeneficiarios(): Promise<Beneficiario[]> {
  return getJson<Beneficiario[]>("/api/beneficiarios?limit=2000000&offset=0");
}

export function useBeneficiariosData() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["beneficiarios"],
    queryFn: fetchBeneficiarios,
    staleTime: 5 * 60 * 1000,
  });

  const beneficiarios = data ?? [];
  const total = beneficiarios.length;

  const programas = useMemo(() => {
    const s = new Set<string>();
    for (const b of beneficiarios) {
      const p = b.programa?.trim();
      if (p) s.add(p);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "es"));
  }, [beneficiarios]);

  const municipios = useMemo(() => {
    const s = new Set<string>();
    for (const b of beneficiarios) {
      const m = b.municipio?.trim();
      if (m) s.add(m);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "es"));
  }, [beneficiarios]);

  return {
    beneficiarios,
    total,
    programas,
    municipios,
    isLoading,
    isError,
    error: error instanceof Error ? error : null,
    refetch,
  };
}
