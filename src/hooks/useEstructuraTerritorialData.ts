import { useQuery } from "@tanstack/react-query";

export type TipoUsuario = "promotor" | "vocal" | "enlace" | "regional" | "estatal";

export interface MiembroET {
  id: string;
  nombre: string;
  celular: string | null;
  tipo_usuario: TipoUsuario | null;
  /** CSV de programas, ej: "COINVERSIÓN SOCIAL, CONTIGO ESTAMOS MEJOR" */
  programa: string | null;
  municipio: string | null;
  localidad: string | null;
  superior_id: string | null;
  activo: boolean | null;
  creado_en: string;
}

async function fetchEstructura(): Promise<MiembroET[]> {
  const res = await fetch("/api/usuarios-territoriales.php");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<MiembroET[]>;
}

export function useEstructuraTerritorialData() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["estructura_territorial"],
    queryFn: fetchEstructura,
    staleTime: 60_000,
  });

  const rows = data ?? [];
  const total = rows.length;

  const byTipo = (tipo: TipoUsuario) =>
    rows.filter((r) => r.tipo_usuario === tipo).length;

  /* Programas únicos extraídos del campo CSV */
  const programaSet = new Set<string>();
  for (const r of rows) {
    if (r.programa?.trim()) {
      r.programa.split(",").forEach((p) => {
        const clean = p.trim();
        if (clean) programaSet.add(clean);
      });
    }
  }
  const programasUnicos = [...programaSet].sort();

  const programaCounts = programasUnicos.map((prog) => ({
    label: prog,
    count: rows.filter((r) =>
      r.programa?.split(",").map((p) => p.trim()).includes(prog),
    ).length,
  }));

  return {
    rows,
    total,
    promotores: byTipo("promotor"),
    vocales:    byTipo("vocal"),
    enlaces:    byTipo("enlace"),
    regionales: byTipo("regional"),
    estatales:  byTipo("estatal"),
    programasUnicos,
    programaCounts,
    isLoading,
    isError,
  };
}
