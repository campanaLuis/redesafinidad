import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchAllMembers } from "@/hooks/useNetworkData";
import { buildUserGrowthSeries, countJoinedInCurrentMonth } from "@/lib/networkGrowth";

export function useDashboardNetwork() {
  const query = useQuery({
    queryKey: ["dashboard-network-members"],
    queryFn: fetchAllMembers,
    staleTime: 2 * 60 * 1000,
  });

  const members = query.data ?? [];

  const growthDaily = useMemo(() => buildUserGrowthSeries(members, "day"), [members]);
  const growthMonthly = useMemo(() => buildUserGrowthSeries(members, "month"), [members]);

  const sumadosEsteMes = useMemo(() => countJoinedInCurrentMonth(members), [members]);

  return {
    ...query,
    members,
    totalUsers: members.length,
    sumadosEsteMes,
    growthPoints: growthDaily.points,
    growthPointsMonthly: growthMonthly.points,
    firstJoin: growthDaily.firstJoin,
    lastJoin: growthDaily.lastJoin,
  };
}
