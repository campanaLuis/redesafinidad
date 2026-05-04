import type { NetworkMember } from "@/types/network";

import type { SocialPlatformStat } from "@/hooks/useSocialPlatformStats";

export type DirectInviteDistribution = {
  total: number;
  /** `direct_descendants_count === 0` */
  countZero: number;
  /** exactamente 1 invitado directo */
  countExactlyOne: number;
  /** 1 o más invitados directos (`>= 1`) */
  countOneOrMore: number;
};

function directCount(m: NetworkMember): number {
  return parseInt(String(m.direct_descendants_count ?? 0), 10);
}

/**
 * Conteos para: 0 directos, exactamente 1, y 1 o más (este último incluye a los que tienen 1).
 */
export function directInviteDistribution(members: NetworkMember[]): DirectInviteDistribution | null {
  if (members.length === 0) return null;
  let countZero = 0;
  let countExactlyOne = 0;
  let countOneOrMore = 0;
  for (const m of members) {
    const d = directCount(m);
    if (d === 0) countZero++;
    if (d === 1) countExactlyOne++;
    if (d >= 1) countOneOrMore++;
  }
  return {
    total: members.length,
    countZero,
    countExactlyOne,
    countOneOrMore,
  };
}

export function pctPart(n: number, total: number): number {
  if (total <= 0) return 0;
  return (n / total) * 100;
}

/**
 * Promedio de altas (miembros nuevos) por día natural desde la fecha del registro más antiguo hasta hoy.
 */
export function avgRegistrationsPerDay(members: NetworkMember[]): number | null {
  if (members.length === 0) return null;
  const times = members.map((m) => new Date(m.created_at).getTime()).filter((t) => !Number.isNaN(t));
  if (times.length === 0) return null;
  const minT = Math.min(...times);
  const days = Math.max(1, Math.ceil((Date.now() - minT) / 86_400_000));
  return members.length / days;
}

/**
 * % de comentarios cuyo usuario coincide con un miembro de la red (sobre el total de comentarios en todas las redes).
 */
export function registeredCommentsPercentOfTotal(stats: SocialPlatformStat[] | null): number | null {
  if (!stats || stats.length === 0) return null;
  let total = 0;
  let registered = 0;
  for (const s of stats) {
    total += s.totalComments;
    registered += s.registeredComments;
  }
  if (total === 0) return 0;
  return (registered / total) * 100;
}
