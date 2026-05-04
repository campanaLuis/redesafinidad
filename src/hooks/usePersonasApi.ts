import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { NetworkMember } from "@/types/network";
import { buildUserGrowthSeries, countJoinedInCurrentMonth } from "@/lib/networkGrowth";

async function fetchPersonas(): Promise<NetworkMember[]> {
  const res = await fetch("/api/personas.php");
  if (!res.ok) {
    throw new Error(`Error al cargar personas: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    if (data?.error) throw new Error(data.error);
    throw new Error("Respuesta inesperada del servidor");
  }
  return data as NetworkMember[];
}

export function usePersonasApi() {
  const query = useQuery({
    queryKey: ["personas-api"],
    queryFn: fetchPersonas,
    staleTime: 2 * 60 * 1000,
  });

  const members = query.data ?? [];

  const growthDaily = useMemo(() => buildUserGrowthSeries(members, "day"), [members]);

  const sumadosEsteMes = useMemo(() => countJoinedInCurrentMonth(members), [members]);

  return {
    ...query,
    members,
    totalUsers: members.length,
    sumadosEsteMes,
    growthPoints: growthDaily.points,
    firstJoin: growthDaily.firstJoin,
    lastJoin: growthDaily.lastJoin,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  };
}
