import { useState, useEffect, useMemo } from "react";
import { getJson } from "@/lib/apiClient";
import { NetworkMember, NetworkMemberWithChildren, NetworkTree, NetworkSibling } from "@/types/network";

interface UseNetworkDataResult {
  tree: NetworkTree | null;
  globalTotal: number;
  latestJoinDate: string | null;
  allMembers: NetworkMember[];
  isLoading: boolean;
  error: string | null;
}

/** Árbol de descendientes bajo un `parentId` (para modales, ranking, etc.) */
export function buildTree(
  members: NetworkMember[],
  parentId: number
): NetworkMemberWithChildren[] {
  return members
    .filter((m) => {
      const refId = m.refiereid ? parseInt(String(m.refiereid), 10) : null;
      return refId === parentId;
    })
    .map((member) => ({
      ...member,
      children: buildTree(members, member.id),
    }));
}

export async function fetchAllMembers(): Promise<NetworkMember[]> {
  return getJson<NetworkMember[]>("/api/personas.php");
}

// Hook for searching by user ID (used in admin/search page)
export function useNetworkData(userId: number | null): UseNetworkDataResult {
  const [members, setMembers] = useState<NetworkMember[]>([]);
  const [globalTotal, setGlobalTotal] = useState(0);
  const [latestJoinDate, setLatestJoinDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNetworkData() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await fetchAllMembers();

        setMembers(data);
        setGlobalTotal(data.length);
        
        if (data.length > 0) {
          const sorted = [...data].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setLatestJoinDate(sorted[0].created_at);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos");
      } finally {
        setIsLoading(false);
      }
    }

    fetchNetworkData();
  }, []);

  const tree = useMemo(() => {
    if (!userId || members.length === 0) return null;

    const you = members.find((m) => m.id === userId);
    if (!you) return null;

    const referrer = you.refiereid
      ? members.find((m) => m.id === parseInt(you.refiereid!, 10)) || null
      : null;

    const invited = buildTree(members, userId);

    const siblings: NetworkSibling[] = you.refiereid
      ? members
          .filter((m) => m.refiereid === you.refiereid && m.id !== userId)
          .map((m) => ({
            id: m.id,
            direct_count: parseInt(String(m.direct_descendants_count || 0), 10),
            total_count: parseInt(String(m.total_descendants_count || 0), 10),
            created_at: m.created_at,
          }))
      : [];

    return { referrer, you, invited, siblings };
  }, [members, userId]);

  return { tree, globalTotal, latestJoinDate, allMembers: members, isLoading, error };
}

// Hook for searching by hash_code (used in personal URL view)
export function useNetworkDataByHash(hashCode: string | null): UseNetworkDataResult {
  const [tree, setTree] = useState<NetworkTree | null>(null);
  const [globalTotal, setGlobalTotal] = useState(0);
  const [latestJoinDate, setLatestJoinDate] = useState<string | null>(null);
  const [allMembers, setAllMembers] = useState<NetworkMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchByHashCode() {
      if (!hashCode) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const allMembers = await fetchAllMembers();
        const user = allMembers.find((m) => m.hash_code === hashCode);

        if (!user) {
          setTree(null);
          setIsLoading(false);
          return;
        }

        let referrer: NetworkMember | null = null;
        if (user.refiereid) {
          referrer = allMembers.find((m) => m.id === parseInt(user.refiereid!, 10)) || null;
        }

        const descendants = allMembers.filter((m) => 
          m.path.startsWith(`${user.path}.`)
        );
        
        setAllMembers(allMembers);
        setGlobalTotal(allMembers.length);
        
        const networkMembers = [user, ...descendants];
        if (networkMembers.length > 0) {
          const sorted = [...networkMembers].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setLatestJoinDate(sorted[0].created_at);
        }
        
        const invitedTree = buildTree(descendants, user.id);

        const siblings: NetworkSibling[] = user.refiereid
          ? allMembers
              .filter((m) => m.refiereid === user.refiereid && m.id !== user.id)
              .map((m) => ({
                id: m.id,
                direct_count: parseInt(String(m.direct_descendants_count || 0), 10),
                total_count: parseInt(String(m.total_descendants_count || 0), 10),
                created_at: m.created_at,
              }))
          : [];

        setTree({
          referrer,
          you: user,
          invited: invitedTree,
          siblings,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos");
      } finally {
        setIsLoading(false);
      }
    }

    fetchByHashCode();
  }, [hashCode]);

  return { tree, globalTotal, latestJoinDate, allMembers, isLoading, error };
}
