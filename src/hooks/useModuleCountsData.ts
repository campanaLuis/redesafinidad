import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/apiClient";

interface ModuleCounts {
  beneficiarios: number;
  ejercitoDigital: number;
  atencionCiudadana: number;
}

interface StatsModulesResponse {
  beneficiarios: number;
  ejercitoDigital: number;
  atencionCiudadana: number;
}

async function fetchModuleCounts(): Promise<ModuleCounts> {
  return getJson<StatsModulesResponse>("/api/stats/modules");
}

export function useModuleCountsData() {
  return useQuery({
    queryKey: ["module_counts"],
    queryFn: fetchModuleCounts,
    staleTime: 120_000,
  });
}
