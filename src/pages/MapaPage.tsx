import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { KpiStatCard } from "@/components/dashboard/KpiStatCard";
import { InlineBadge } from "@/components/dashboard/VisualBadges";
import { useDashboardNetwork } from "@/hooks/useDashboardNetwork";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Users, Home, Search, X, Loader2,
  Route, Plus, Trash2, HeartHandshake, Flag,
  ExternalLink, Navigation2, Clock, Milestone,
  CheckCircle2, UserX, Calendar as CalendarIcon,
} from "lucide-react";
import {
  loadAdminTeam, loadApoyos, getStoredLogin,
  type AdminTeamEntry,
} from "@/lib/brigadaTeamApi";
import type { TeamApoyo } from "@/lib/teamWorkspaceStorage";
import {
  fetchUsuariosDeApoyos,
  fetchEquipoNoRegistrados,
  updateApoyoNoRegCoordinates,
  updateEquipoNoRegistradoCoordinates,
  type UsuarioDeApoyo,
} from "@/lib/excelImport";
import { getJson, sendJson } from "@/lib/apiClient";
import {
  geocodeEquipoNoRegistrado,
  geocodeEventoUbicacion,
  geocodeUsuarioDeApoyo,
  nominatimGeocodeFirst,
  parseLatLngFromUbicacionText,
} from "@/lib/geocoding";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fitScrollClass } from "@/lib/appUi";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const SEARCH_ICON = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/** No registrados de apoyos (coordenadas desde Brigadas). */
const APOYO_NO_REG_ICON = new L.DivIcon({
  className: "",
  html: `<div style="background:#d97706;border:2px solid #fff;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700">★</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const EQUIPO_NO_REG_ICON = new L.DivIcon({
  className: "",
  html: `<div style="background:#7c3aed;border:2px solid #fff;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700">E</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const SEGUIDOR_MEMBER_ICON = new L.DivIcon({
  className: "",
  html: `<div style="background:#2563eb;border:2px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700">S</div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const EVENTO_MAP_ICON = new L.DivIcon({
  className: "",
  html: `<div style="background:#059669;border:2px solid #fff;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700">📅</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

type MapDataTab = "brigadas" | "apoyos" | "seguidores" | "eventos";

interface FollowerLocationCacheRow {
  cp: string;
  colonia: string;
  lat: number | null;
  lng: number | null;
}

interface SeguidoresMapPoint {
  id: number;
  nombre: string;
  telefono: string;
  colonia: string | null;
  cp: string;
  lat: number;
  lng: number;
}

interface EventoMapRow {
  id: string;
  nombre: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  ubicacion: string | null;
  lat: number | null;
  lng: number | null;
}

function escapeHtmlPopup(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const QRO_CENTER: [number, number] = [20.5888, -100.3899];
const QRO_ZOOM = 9;
/** Silueta del estado: borde claro + relleno suave para que se distinga sobre OSM. */
const STATE_STYLE: L.PathOptions = {
  color: "#4f46e5",
  weight: 3,
  opacity: 1,
  lineCap: "round",
  lineJoin: "round",
  fillColor: "#6366f1",
  fillOpacity: 0.18,
  dashArray: "6 5",
};
const ROAD_LINE_STYLE: L.PolylineOptions = { color: "#6366f1", weight: 4, opacity: 0.85 };
const ROAD_OUTLINE_STYLE: L.PolylineOptions = { color: "#fff", weight: 7, opacity: 0.5 };

interface NominatimResult { place_id: number; display_name: string; lat: string; lon: string; }
interface RouteStop { id: number; label: string; lat: number; lon: number; }
interface OsrmResult { coords: [number, number][]; distanceKm: number; durationMin: number; steps: { name: string; maneuver: string; distance: number }[]; }

async function geocodeSearch(query: string): Promise<NominatimResult[]> {
  const q = encodeURIComponent(`${query}, Querétaro, México`);
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=6&countrycodes=mx&accept-language=es`, { headers: { "Accept-Language": "es" } });
  if (!res.ok) throw new Error("Error al buscar.");
  return res.json();
}

async function fetchRoadRoute(stops: RouteStop[]): Promise<OsrmResult | null> {
  if (stops.length < 2) return null;
  const waypoints = stops.map((s) => `${s.lon},${s.lat}`).join(";");
  try {
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&steps=true`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    const r = data.routes[0] as { distance: number; duration: number; geometry: { coordinates: [number, number][] }; legs: { steps: { name: string; distance: number; maneuver: { type: string; modifier?: string } }[] }[]; };
    const MANEUVER_ES: Record<string, string> = { turn: "Girar", depart: "Salir", arrive: "Llegar", merge: "Incorporarse", "on ramp": "Tomar rampa", "off ramp": "Salir rampa", fork: "Bifurcación", rotary: "Glorieta", roundabout: "Glorieta", continue: "Continuar", "new name": "Continuar", "end of road": "Fin de vía" };
    const MOD_ES: Record<string, string> = { left: "izquierda", right: "derecha", "sharp left": "izq. cerrada", "sharp right": "der. cerrada", "slight left": "izq. suave", "slight right": "der. suave", straight: "recto", uturn: "vuelta en U" };
    const steps = r.legs.flatMap((leg) => leg.steps.map((s) => ({ name: s.name || "Sin nombre", maneuver: `${MANEUVER_ES[s.maneuver.type] ?? s.maneuver.type}${s.maneuver.modifier ? ` ${MOD_ES[s.maneuver.modifier] ?? s.maneuver.modifier}` : ""}`, distance: s.distance })));
    return { coords: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]), distanceKm: r.distance / 1000, durationMin: r.duration / 60, steps };
  } catch { return null; }
}

function fmtDist(km: number) { return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`; }
function fmtTime(min: number) { return min < 60 ? `${Math.round(min)} min` : `${Math.floor(min / 60)} h ${Math.round(min % 60)} min`; }

function normalizeLocationValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function cacheColoniaValue(colonia: string | null | undefined) {
  const trimmed = colonia?.trim();
  return trimmed ? trimmed : "Sin colonia";
}

function followerLocationKey(cp: string | number | null | undefined, colonia: string | null | undefined) {
  const normalizedCp = String(cp ?? "").trim();
  return `${normalizedCp}|${normalizeLocationValue(cacheColoniaValue(colonia))}`;
}

function jitterCoordinates(lat: number, lng: number, seed: number) {
  const radius = 0.0016;
  const angle = ((seed * 137.508) % 360) * (Math.PI / 180);
  const offset = radius * (0.55 + ((seed % 7) / 10));
  return {
    lat: lat + Math.sin(angle) * offset,
    lng: lng + Math.cos(angle) * offset,
  };
}

const MAP_MARKER_PANE = "data-markers";
const APOYO_BACKFILL_BATCH = 20;
const TEAM_BACKFILL_BATCH = 10;
const EVENT_BACKFILL_BATCH = 10;

function useGeoKpis(members: ReturnType<typeof useDashboardNetwork>["members"]) {
  return useMemo(() => {
    const coloniaMap = new Map<string, number>(); const cpMap = new Map<number, number>();
    for (const m of members) {
      const c = m.colonia?.trim(); if (c) coloniaMap.set(c, (coloniaMap.get(c) ?? 0) + 1);
      const cp = Number(m.codigopostal); if (cp) cpMap.set(cp, (cpMap.get(cp) ?? 0) + 1);
    }
    let topColonia = "—", topColoniaCount = 0;
    for (const [c, n] of coloniaMap) if (n > topColoniaCount) { topColonia = c; topColoniaCount = n; }
    let topCP = "—", topCPCount = 0;
    for (const [cp, n] of cpMap) if (n > topCPCount) { topCP = String(cp); topCPCount = n; }
    return { uniqueColonias: coloniaMap.size, uniqueCPs: cpMap.size, topColonia, topColoniaCount, topCP, topCPCount };
  }, [members]);
}

export default function MapaPage() {
  const { members, totalUsers, isLoading } = useDashboardNetwork();
  const geo = useGeoKpis(members);
  const ownerLogin = useMemo(() => getStoredLogin(), []);

  const mapRef = useRef<L.Map | null>(null);
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const routeMarkersRef = useRef<L.Marker[]>([]);
  const roadOutlineRef = useRef<L.Polyline | null>(null);
  const roadLineRef = useRef<L.Polyline | null>(null);

  const [query, setQuery] = useState(""); const [results, setResults] = useState<NominatimResult[]>([]); const [searching, setSearching] = useState(false); const [searchError, setSearchError] = useState<string | null>(null); const [showDropdown, setShowDropdown] = useState(false); const [selectedResult, setSelectedResult] = useState<NominatimResult | null>(null);
  const [route, setRoute] = useState<RouteStop[]>([]); const nextIdRef = useRef(1);
  const [osrmResult, setOsrmResult] = useState<OsrmResult | null>(null); const [isRouting, setIsRouting] = useState(false); const [showSteps, setShowSteps] = useState(false);
  const [apoyos, setApoyos] = useState<TeamApoyo[]>([]); const [teamEntries, setTeamEntries] = useState<AdminTeamEntry[]>([]);
  const [mapReady, setMapReady] = useState(false);
  /** Todos los no registrados de apoyos (para conteos por fila). */
  const [apoyoNoRegistradosAll, setApoyoNoRegistradosAll] = useState<UsuarioDeApoyo[]>([]);
  const [equipoNoRegistrados, setEquipoNoRegistrados] = useState<Awaited<ReturnType<typeof fetchEquipoNoRegistrados>>>([]);
  const [mapDataTab, setMapDataTab] = useState<MapDataTab>("brigadas");
  const [seguidoresLocationCache, setSeguidoresLocationCache] = useState<Record<string, { lat: number; lng: number }>>({});
  const [seguidoresLocationLoading, setSeguidoresLocationLoading] = useState(false);
  const [eventosRows, setEventosRows] = useState<EventoMapRow[]>([]);
  const [eventosMapPoints, setEventosMapPoints] = useState<{ id: string; nombre: string; fecha: string; lat: number; lng: number }[]>([]);

  const brigadasLayerRef = useRef<L.LayerGroup | null>(null);
  const apoyosLayerRef = useRef<L.LayerGroup | null>(null);
  const seguidoresLayerRef = useRef<L.LayerGroup | null>(null);
  const eventosLayerRef = useRef<L.LayerGroup | null>(null);
  const failedApoyoGeoIdsRef = useRef(new Set<string>());
  const failedEquipoGeoIdsRef = useRef(new Set<string>());
  const failedEventoGeoIdsRef = useRef(new Set<string>());

  const apoyoNoRegPoints = useMemo(
    () =>
      apoyoNoRegistradosAll.filter(
        (u) =>
          u.lat != null &&
          u.lng != null &&
          Number.isFinite(Number(u.lat)) &&
          Number.isFinite(Number(u.lng)),
      ),
    [apoyoNoRegistradosAll],
  );

  const equipoNoRegPoints = useMemo(
    () =>
      equipoNoRegistrados.filter(
        (u) =>
          u.lat != null &&
          u.lng != null &&
          Number.isFinite(Number(u.lat)) &&
          Number.isFinite(Number(u.lng)),
      ),
    [equipoNoRegistrados],
  );

  const followerLocations = useMemo(() => {
    const seen = new Map<string, { key: string; cp: string; colonia: string; query: string }>();
    for (const member of members) {
      const cp = member.codigopostal != null ? String(member.codigopostal).trim() : "";
      if (!cp) continue;
      const colonia = cacheColoniaValue(member.colonia);
      const key = followerLocationKey(cp, colonia);
      if (seen.has(key)) continue;
      seen.set(key, {
        key,
        cp,
        colonia,
        query: `${colonia}, CP ${cp}, Querétaro, México`,
      });
    }
    return [...seen.values()];
  }, [members]);

  const seguidoresPoints = useMemo(() => {
    return members
      .map((member) => {
        const cp = member.codigopostal != null ? String(member.codigopostal).trim() : "";
        if (!cp) return null;
        const key = followerLocationKey(cp, member.colonia);
        const base = seguidoresLocationCache[key];
        if (!base) return null;
        const jittered = jitterCoordinates(base.lat, base.lng, member.id);
        return {
          id: member.id,
          nombre: member.nombre?.trim() || `Usuario ${member.id}`,
          telefono: String(member.telefono ?? "").trim(),
          colonia: member.colonia,
          cp,
          lat: jittered.lat,
          lng: jittered.lng,
        } satisfies SeguidoresMapPoint;
      })
      .filter((point): point is SeguidoresMapPoint => point != null);
  }, [members, seguidoresLocationCache]);

  const activeMapPoints = useMemo(() => {
    if (mapDataTab === "brigadas") {
      return equipoNoRegPoints
        .map((u) => ({ lat: Number(u.lat), lng: Number(u.lng) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    }
    if (mapDataTab === "apoyos") {
      return apoyoNoRegPoints
        .map((u) => ({ lat: Number(u.lat), lng: Number(u.lng) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    }
    if (mapDataTab === "seguidores") {
      return seguidoresPoints.filter(
        (p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)),
      );
    }
    return eventosMapPoints
      .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }, [apoyoNoRegPoints, equipoNoRegPoints, eventosMapPoints, mapDataTab, seguidoresPoints]);

  useEffect(() => {
    loadAdminTeam(ownerLogin).then(setTeamEntries).catch(() => {});
    loadApoyos(ownerLogin).then(setApoyos).catch(() => {});
  }, [ownerLogin]);

  useEffect(() => {
    fetchUsuariosDeApoyos(ownerLogin)
      .then((rows) => {
        failedApoyoGeoIdsRef.current.clear();
        setApoyoNoRegistradosAll(rows);
      })
      .catch(() => setApoyoNoRegistradosAll([]));
  }, [ownerLogin]);

  useEffect(() => {
    fetchEquipoNoRegistrados()
      .then((rows) => {
        failedEquipoGeoIdsRef.current.clear();
        setEquipoNoRegistrados(rows);
      })
      .catch(() => setEquipoNoRegistrados([]));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await getJson<EventoMapRow[]>(
          "/api/eventos?owner_login=" + encodeURIComponent(ownerLogin),
        );
        failedEventoGeoIdsRef.current.clear();
        setEventosRows(
          (data ?? []).map((r) => ({
            id: r.id,
            nombre: r.nombre,
            fecha: r.fecha,
            hora_inicio: r.hora_inicio,
            hora_fin: r.hora_fin,
            ubicacion: r.ubicacion,
            lat: r.lat,
            lng: r.lng,
          })),
        );
      } catch {
        setEventosRows([]);
      }
    })();
  }, [ownerLogin]);

  /** Carga ubicaciones persistidas para seguidores y completa faltantes en segundo plano. */
  useEffect(() => {
    if (followerLocations.length === 0) {
      setSeguidoresLocationCache({});
      setSeguidoresLocationLoading(false);
      return;
    }
    let cancelled = false;
    setSeguidoresLocationLoading(true);
    (async () => {
      const cps = [...new Set(followerLocations.map((loc) => loc.cp))];
      const nextCache: Record<string, { lat: number; lng: number }> = {};
      try {
        const data = await getJson<FollowerLocationCacheRow[]>(
          "/api/mapa-ubicaciones?cps=" + cps.map((c) => encodeURIComponent(c)).join(","),
        );

        const pairMap = new Map<string, { lat: number; lng: number }>();
        const cpFallbackMap = new Map<string, { lat: number; lng: number }>();
        for (const row of data ?? []) {
          const lat = Number(row.lat);
          const lng = Number(row.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          const key = followerLocationKey(row.cp, row.colonia);
          const coords = { lat, lng };
          pairMap.set(key, coords);
          if (!cpFallbackMap.has(String(row.cp).trim())) cpFallbackMap.set(String(row.cp).trim(), coords);
        }

        for (const loc of followerLocations) {
          const exact = pairMap.get(loc.key);
          if (exact) {
            nextCache[loc.key] = exact;
            continue;
          }
          const fallback = cpFallbackMap.get(loc.cp);
          if (fallback) nextCache[loc.key] = fallback;
        }
        if (!cancelled) {
          setSeguidoresLocationCache(nextCache);
          setSeguidoresLocationLoading(false);
        }

        const missing = followerLocations.filter((loc) => !nextCache[loc.key]);
        for (const loc of missing) {
          if (cancelled) return;
          const coords = await nominatimGeocodeFirst(loc.query);
          if (!coords) continue;
          await sendJson("/api/mapa-ubicaciones", "POST", {
            cp: loc.cp,
            colonia: loc.colonia,
            municipio: "Querétaro",
            estado: "Querétaro",
            lat: coords.lat,
            lng: coords.lng,
          }).catch(() => {});
          if (!cancelled) {
            setSeguidoresLocationCache((prev) => (prev[loc.key] ? prev : { ...prev, [loc.key]: coords }));
          }
          await new Promise((resolve) => setTimeout(resolve, 1100));
        }
      } catch {
        if (!cancelled) setSeguidoresLocationLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      setSeguidoresLocationLoading(false);
    };
  }, [followerLocations]);

  /** Usa coordenadas persistidas de eventos; si la ubicación trae lat/lng embebida, las aprovecha localmente. */
  useEffect(() => {
    if (eventosRows.length === 0) {
      setEventosMapPoints([]);
      return;
    }
    setEventosMapPoints(
      eventosRows
        .map((ev) => {
          const lat = Number(ev.lat);
          const lng = Number(ev.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { id: ev.id, nombre: ev.nombre, fecha: ev.fecha, lat, lng };
          }
          const parsed = parseLatLngFromUbicacionText(ev.ubicacion);
          if (!parsed) return null;
          return { id: ev.id, nombre: ev.nombre, fecha: ev.fecha, lat: parsed.lat, lng: parsed.lng };
        })
        .filter((p): p is { id: string; nombre: string; fecha: string; lat: number; lng: number } => p != null),
    );
  }, [eventosRows]);

  useEffect(() => {
    if (mapDataTab !== "apoyos") return;
    const pending = apoyoNoRegistradosAll
      .filter((row) => row.id && row.lat == null && row.lng == null && !failedApoyoGeoIdsRef.current.has(row.id))
      .slice(0, APOYO_BACKFILL_BATCH);
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const row of pending) {
        if (cancelled || !row.id) return;
        const coords = await geocodeUsuarioDeApoyo(row);
        if (!coords) {
          failedApoyoGeoIdsRef.current.add(row.id);
          continue;
        }
        await updateApoyoNoRegCoordinates(row.id, coords.lat, coords.lng).catch(() => {
          failedApoyoGeoIdsRef.current.add(row.id);
        });
        if (cancelled) return;
        setApoyoNoRegistradosAll((prev) =>
          prev.map((item) => (item.id === row.id ? { ...item, lat: coords.lat, lng: coords.lng } : item)),
        );
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mapDataTab, apoyoNoRegistradosAll]);

  useEffect(() => {
    if (mapDataTab !== "brigadas") return;
    const pending = equipoNoRegistrados
      .filter((row) => row.id && row.lat == null && row.lng == null && !failedEquipoGeoIdsRef.current.has(row.id))
      .slice(0, TEAM_BACKFILL_BATCH);
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const row of pending) {
        if (cancelled || !row.id) return;
        const coords = await geocodeEquipoNoRegistrado(row);
        if (!coords) {
          failedEquipoGeoIdsRef.current.add(row.id);
          continue;
        }
        await updateEquipoNoRegistradoCoordinates(row.id, coords.lat, coords.lng).catch(() => {
          failedEquipoGeoIdsRef.current.add(row.id);
        });
        if (cancelled) return;
        setEquipoNoRegistrados((prev) =>
          prev.map((item) => (item.id === row.id ? { ...item, lat: coords.lat, lng: coords.lng } : item)),
        );
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mapDataTab, equipoNoRegistrados]);

  useEffect(() => {
    if (mapDataTab !== "eventos") return;
    const pending = eventosRows
      .filter((row) => {
        const hasCoords = Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lng));
        return !hasCoords && !failedEventoGeoIdsRef.current.has(row.id);
      })
      .slice(0, EVENT_BACKFILL_BATCH);
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const row of pending) {
        if (cancelled) return;
        const coords = await geocodeEventoUbicacion(row.ubicacion);
        if (!coords) {
          failedEventoGeoIdsRef.current.add(row.id);
          continue;
        }
        try {
          await sendJson(
            "/api/eventos/" + encodeURIComponent(row.id) + "/map-coords",
            "PATCH",
            { lat: coords.lat, lng: coords.lng },
          );
        } catch {
          failedEventoGeoIdsRef.current.add(row.id);
          continue;
        }
        if (cancelled) return;
        setEventosRows((prev) =>
          prev.map((item) => (item.id === row.id ? { ...item, lat: coords.lat, lng: coords.lng } : item)),
        );
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mapDataTab, eventosRows]);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, { center: QRO_CENTER, zoom: QRO_ZOOM });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>', maxZoom: 19 }).addTo(map);
    if (!map.getPane(MAP_MARKER_PANE)) {
      const pane = map.createPane(MAP_MARKER_PANE);
      pane.style.zIndex = "650";
    }
    mapRef.current = map;
    setMapReady(true);
    const base = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    fetch(`${base}queretaro.geojson`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((g) => {
        if (!mapRef.current) return;
        const layer = L.geoJSON(g, {
          style: STATE_STYLE,
          interactive: false,
        }).addTo(mapRef.current);
        layer.eachLayer((ly) => {
          if (ly instanceof L.Path) ly.bringToFront();
        });
      })
      .catch(() => {});
    return () => {
      brigadasLayerRef.current = null;
      apoyosLayerRef.current = null;
      seguidoresLayerRef.current = null;
      eventosLayerRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    if (!brigadasLayerRef.current) brigadasLayerRef.current = L.layerGroup().addTo(map);
    if (!apoyosLayerRef.current) apoyosLayerRef.current = L.layerGroup().addTo(map);
    if (!seguidoresLayerRef.current) seguidoresLayerRef.current = L.layerGroup().addTo(map);
    if (!eventosLayerRef.current) eventosLayerRef.current = L.layerGroup().addTo(map);
    brigadasLayerRef.current.clearLayers();
    apoyosLayerRef.current.clearLayers();
    seguidoresLayerRef.current.clearLayers();
    eventosLayerRef.current.clearLayers();

    if (mapDataTab === "brigadas") {
      for (const u of equipoNoRegPoints) {
        const lat = Number(u.lat);
        const lng = Number(u.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const title = escapeHtmlPopup((u.nombre || u.celular || "Sin nombre").trim());
        const rol = escapeHtmlPopup((u.rol || "Sin rol").trim());
        const tel = escapeHtmlPopup(String(u.celular ?? ""));
        L.marker([lat, lng], { icon: EQUIPO_NO_REG_ICON, pane: MAP_MARKER_PANE })
          .bindPopup(
            `<b>${title}</b><br/><span style="font-size:11px;opacity:.9">Equipo: ${rol}</span>${tel ? `<br/><span style="font-size:10px">${tel}</span>` : ""}`,
          )
          .addTo(brigadasLayerRef.current);
      }
    } else if (mapDataTab === "apoyos") {
      for (const u of apoyoNoRegPoints) {
        const lat = Number(u.lat);
        const lng = Number(u.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const title = escapeHtmlPopup((u.nombre_completo || u.telefono || "Sin nombre").trim());
        const apoyo = escapeHtmlPopup((u.apoyo_nombre || "").trim());
        const tel = escapeHtmlPopup(String(u.telefono ?? ""));
        L.marker([lat, lng], { icon: APOYO_NO_REG_ICON, pane: MAP_MARKER_PANE })
          .bindPopup(
            `<b>${title}</b><br/><span style="font-size:11px;opacity:.9">${apoyo}</span>${tel ? `<br/><span style="font-size:10px">${tel}</span>` : ""}`,
          )
          .addTo(apoyosLayerRef.current);
      }
    } else if (mapDataTab === "seguidores") {
      for (const point of seguidoresPoints) {
        L.marker([point.lat, point.lng], { icon: SEGUIDOR_MEMBER_ICON, pane: MAP_MARKER_PANE })
          .bindPopup(
            `<b>${escapeHtmlPopup(point.nombre)}</b><br/><span style="font-size:11px">${escapeHtmlPopup(point.colonia?.trim() || "Sin colonia")} · CP ${escapeHtmlPopup(point.cp)}</span>${point.telefono ? `<br/><span style="font-size:10px">${escapeHtmlPopup(point.telefono)}</span>` : ""}`,
          )
          .addTo(seguidoresLayerRef.current);
      }
    } else {
      for (const p of eventosMapPoints) {
        L.marker([p.lat, p.lng], { icon: EVENTO_MAP_ICON, pane: MAP_MARKER_PANE })
          .bindPopup(
            `<b>${escapeHtmlPopup(p.nombre)}</b><br/><span style="font-size:11px">${escapeHtmlPopup(p.fecha)}</span>`,
          )
          .addTo(eventosLayerRef.current);
      }
    }
  }, [mapReady, mapDataTab, apoyoNoRegPoints, equipoNoRegPoints, seguidoresPoints, eventosMapPoints]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || route.length > 0) return;
    const map = mapRef.current;
    if (activeMapPoints.length === 0) {
      map.flyTo(QRO_CENTER, QRO_ZOOM, { animate: true, duration: 0.8 });
      return;
    }
    if (activeMapPoints.length === 1) {
      const point = activeMapPoints[0];
      map.flyTo([point.lat, point.lng], 13, { animate: true, duration: 0.8 });
      return;
    }
    const bounds = L.latLngBounds(activeMapPoints.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
  }, [activeMapPoints, mapDataTab, mapReady, route.length]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    routeMarkersRef.current.forEach((m) => m.remove()); routeMarkersRef.current = [];
    roadOutlineRef.current?.remove(); roadOutlineRef.current = null;
    roadLineRef.current?.remove(); roadLineRef.current = null;
    if (route.length === 0) { setOsrmResult(null); return; }
    route.forEach((stop, i) => {
      const icon = L.divIcon({ className: "", html: `<div style="background:#6366f1;border:2px solid #fff;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700">${i + 1}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
      routeMarkersRef.current.push(L.marker([stop.lat, stop.lon], { icon }).addTo(map).bindPopup(`<b>${i + 1}. ${stop.label}</b>`));
    });
    if (route.length < 2) { setOsrmResult(null); return; }
    setIsRouting(true);
    fetchRoadRoute(route).then((result) => {
      setIsRouting(false);
      if (!result || !mapRef.current) return;
      setOsrmResult(result);
      roadOutlineRef.current = L.polyline(result.coords, ROAD_OUTLINE_STYLE).addTo(mapRef.current);
      roadLineRef.current = L.polyline(result.coords, ROAD_LINE_STYLE).addTo(mapRef.current);
      mapRef.current.fitBounds(L.polyline(result.coords).getBounds(), { padding: [40, 40] });
    });
  }, [route]);

  const handleSearch = useCallback(async () => {
    const q = query.trim(); if (!q) return;
    setSearching(true); setSearchError(null); setResults([]); setSelectedResult(null);
    try { const data = await geocodeSearch(q); if (data.length === 0) setSearchError("No se encontraron resultados."); else { setResults(data); setShowDropdown(true); } }
    catch { setSearchError("Error al buscar."); }
    finally { setSearching(false); }
  }, [query]);

  function selectResult(r: NominatimResult) {
    const lat = parseFloat(r.lat); const lon = parseFloat(r.lon);
    if (!mapRef.current) return;
    setShowDropdown(false); setQuery(r.display_name.split(",")[0]); setSelectedResult(r);
    if (searchMarkerRef.current) searchMarkerRef.current.remove();
    searchMarkerRef.current = L.marker([lat, lon], { icon: SEARCH_ICON }).addTo(mapRef.current).bindPopup(`<b>${r.display_name.split(",").slice(0, 2).join(",")}</b>`).openPopup();
    mapRef.current.flyTo([lat, lon], 15, { animate: true, duration: 1.2 });
  }

  function clearSearch() {
    setQuery(""); setResults([]); setShowDropdown(false); setSearchError(null); setSelectedResult(null);
    if (searchMarkerRef.current) { searchMarkerRef.current.remove(); searchMarkerRef.current = null; }
    mapRef.current?.flyTo(QRO_CENTER, QRO_ZOOM, { animate: true, duration: 1 });
  }

  function addToRoute() {
    if (!selectedResult) return;
    setRoute((prev) => [...prev, { id: nextIdRef.current++, label: selectedResult.display_name.split(",")[0], lat: parseFloat(selectedResult.lat), lon: parseFloat(selectedResult.lon) }]);
  }

  const kpis = [
    {
      label: "Seguidores totales",
      icon: Users,
      value: isLoading ? null : <span className="text-blue-700 dark:text-blue-300">{totalUsers.toLocaleString("es-MX")}</span>,
      sub: null,
    },
    {
      label: "Colonias distintas",
      icon: Home,
      value: isLoading ? null : <span className="text-emerald-700 dark:text-emerald-300">{geo.uniqueColonias.toLocaleString("es-MX")}</span>,
      sub: isLoading ? null : <InlineBadge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Top: {geo.topColonia} ({geo.topColoniaCount})</InlineBadge>,
    },
    {
      label: "Códigos postales",
      icon: MapPin,
      value: isLoading ? null : <span className="text-indigo-700 dark:text-indigo-300">{geo.uniqueCPs.toLocaleString("es-MX")}</span>,
      sub: isLoading ? null : <InlineBadge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">Top CP: {geo.topCP} ({geo.topCPCount})</InlineBadge>,
    },
  ];

  return (
    <DashboardShell title="Mapa">
      <div className="shrink-0 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kpis.map(({ label, icon, value, sub }) => (
          <KpiStatCard key={label} label={label} icon={icon} value={value} sub={sub ?? undefined} isLoading={isLoading} />
        ))}
      </div>

      {/* Contenido scroleable: mapa + brigadas/apoyos */}
      <div className={fitScrollClass}>

          {/* Mapa + Ruta */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
            <Card className="overflow-hidden border-border/80 shadow-none">
              <div className="p-3 border-b border-border bg-card space-y-3">
                <Tabs value={mapDataTab} onValueChange={(v) => setMapDataTab(v as MapDataTab)} className="w-full">
                  <TabsList className="grid h-9 w-full grid-cols-4 gap-1 rounded-lg bg-muted/60 p-1">
                    <TabsTrigger value="brigadas" className="text-xs gap-1 data-[state=active]:bg-background">
                      <Flag className="h-3.5 w-3.5 shrink-0" />
                      Brigadas
                    </TabsTrigger>
                    <TabsTrigger value="apoyos" className="text-xs gap-1 data-[state=active]:bg-background">
                      <HeartHandshake className="h-3.5 w-3.5 shrink-0" />
                      Apoyos
                    </TabsTrigger>
                    <TabsTrigger value="seguidores" className="text-xs gap-1 data-[state=active]:bg-background">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      Seguidores
                    </TabsTrigger>
                    <TabsTrigger value="eventos" className="text-xs gap-1 data-[state=active]:bg-background">
                      <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                      Eventos
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex flex-wrap gap-2">
                  {mapDataTab === "brigadas" && (
                    <InlineBadge className="bg-violet-500/10 text-violet-700 dark:text-violet-300">
                      Equipo no registrado con coordenadas guardadas
                    </InlineBadge>
                  )}
                  {mapDataTab === "apoyos" && (
                    <InlineBadge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      Usuarios de apoyos con coordenadas guardadas
                    </InlineBadge>
                  )}
                  {mapDataTab === "seguidores" && (
                    <InlineBadge className="bg-blue-500/10 text-blue-700 dark:text-blue-300">
                      Seguidores visibles desde caché persistida de ubicaciones
                    </InlineBadge>
                  )}
                  {mapDataTab === "eventos" && (
                    <InlineBadge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Eventos con ubicación o enlace de mapas
                    </InlineBadge>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input value={query} onChange={(e) => { setQuery(e.target.value); setShowDropdown(false); setSelectedResult(null); }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="Buscar colonia, calle, CP en Querétaro…" className="pl-8 pr-8 h-9 text-sm" />
                    {query && <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
                  </div>
                  <Button size="sm" onClick={handleSearch} disabled={searching || !query.trim()} className="h-9 px-4 shrink-0">
                    {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Buscar"}
                  </Button>
                </div>
                {showDropdown && results.length > 0 && (
                  <div className="rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                    {results.map((r) => (
                      <button key={r.place_id} onClick={() => selectResult(r)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 border-b border-border/40 last:border-0 truncate">
                        <span className="font-medium">{r.display_name.split(",")[0]}</span>
                        <span className="text-muted-foreground text-xs ml-1.5">{r.display_name.split(",").slice(1, 3).join(",")}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchError && <p className="text-xs text-destructive px-1">{searchError}</p>}
                {selectedResult && (
                  <button onClick={addToRoute} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors">
                    <Plus className="h-4 w-4 shrink-0" />
                    Agregar a ruta: <span className="truncate font-normal">{selectedResult.display_name.split(",")[0]}</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <div ref={mapElRef} className="w-full" style={{ height: "420px" }} />
                {mapDataTab === "brigadas" && equipoNoRegPoints.length > 0 && (
                  <div className="absolute bottom-3 left-3 z-[1000] rounded-md border border-violet-200 dark:border-violet-800 bg-violet-50/95 dark:bg-violet-950/90 px-2.5 py-1.5 text-[11px] text-violet-900 dark:text-violet-100 shadow-md pointer-events-none flex items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                    <span>
                      <span className="font-medium tabular-nums">{equipoNoRegPoints.length}</span> brigadista{equipoNoRegPoints.length !== 1 ? "s" : ""} en mapa
                    </span>
                  </div>
                )}
                {mapDataTab === "apoyos" && apoyoNoRegPoints.length > 0 && (
                  <div className="absolute bottom-3 left-3 z-[1000] rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/95 dark:bg-amber-950/90 px-2.5 py-1.5 text-[11px] text-amber-900 dark:text-amber-100 shadow-md pointer-events-none flex items-center gap-1.5">
                    <HeartHandshake className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      <span className="font-medium tabular-nums">{apoyoNoRegPoints.length}</span> apoyo{apoyoNoRegPoints.length !== 1 ? "s" : ""} en mapa
                    </span>
                  </div>
                )}
                {mapDataTab === "seguidores" && (
                  <div className="absolute bottom-3 left-3 z-[1000] rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/95 dark:bg-blue-950/90 px-2.5 py-1.5 text-[11px] text-blue-900 dark:text-blue-100 shadow-md pointer-events-none flex items-center gap-1.5">
                    {seguidoresLocationLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    ) : (
                      <Users className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                    )}
                    <span>
                      {followerLocations.length === 0
                        ? "Sin ubicación utilizable en seguidores"
                        : seguidoresLocationLoading
                          ? "Cargando ubicaciones guardadas…"
                          : `${seguidoresPoints.length} seguidor${seguidoresPoints.length !== 1 ? "es" : ""} visible${seguidoresPoints.length !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                )}
                {mapDataTab === "eventos" && (
                  <div className="absolute bottom-3 left-3 z-[1000] rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50/95 dark:bg-emerald-950/90 px-2.5 py-1.5 text-[11px] text-emerald-900 dark:text-emerald-100 shadow-md pointer-events-none flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {eventosRows.length === 0
                        ? "Sin eventos"
                        : `${eventosMapPoints.length} evento${eventosMapPoints.length !== 1 ? "s" : ""} en mapa`}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Panel ruta */}
            <Card className="border-border/80 shadow-none flex flex-col">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-indigo-500" />
                    <CardTitle className="text-sm">Mi ruta</CardTitle>
                    {route.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{route.length}</Badge>}
                    {isRouting && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />}
                  </div>
                  {route.length > 0 && <button onClick={() => setRoute([])} className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 className="h-3 w-3" /> Limpiar</button>}
                </div>
                {osrmResult && (
                  <div className="flex gap-3 mt-2">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Milestone className="h-3 w-3 text-indigo-400 shrink-0" /><span className="font-medium text-foreground">{fmtDist(osrmResult.distanceKm)}</span></div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3 text-indigo-400 shrink-0" /><span className="font-medium text-foreground">{fmtTime(osrmResult.durationMin)}</span></div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-4 flex flex-col gap-3">
                {route.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Busca una ubicación y pulsa<br />"Agregar a ruta"</p>
                ) : (
                  <>
                    <ol className="space-y-1.5">
                      {route.map((stop, i) => (
                        <li key={stop.id} className="flex items-center gap-2 group">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <button onClick={() => mapRef.current?.flyTo([stop.lat, stop.lon], 15, { animate: true })} className="flex-1 text-left text-xs text-foreground truncate hover:text-indigo-600 transition-colors">{stop.label}</button>
                          <button onClick={() => setRoute((prev) => prev.filter((s) => s.id !== stop.id))} className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive transition-all"><X className="h-3 w-3" /></button>
                        </li>
                      ))}
                    </ol>
                    {route.length >= 2 && (
                      <div className="flex flex-col gap-2 pt-1 border-t border-border/60">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Navegar con</p>
                        <a href={`https://www.google.com/maps/dir/${route.map((s) => `${s.lat},${s.lon}`).join("/")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border text-sm font-medium bg-card hover:bg-muted/40 transition-colors text-foreground">
                          <img src="https://www.gstatic.com/images/branding/product/1x/maps_24dp.png" alt="" className="h-4 w-4 shrink-0" />Google Maps<ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                        </a>
                        <a href={`https://waze.com/ul?ll=${route[route.length - 1].lat},${route[route.length - 1].lon}&navigate=yes&from=${route[0].lat},${route[0].lon}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 text-sm font-medium bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-blue-700 dark:text-blue-300">
                          <Navigation2 className="h-4 w-4 shrink-0 text-blue-500" />Waze<ExternalLink className="h-3 w-3 ml-auto text-blue-400" />
                        </a>
                      </div>
                    )}
                    {osrmResult && osrmResult.steps.length > 0 && (
                      <div className="border-t border-border/60 pt-2">
                        <button onClick={() => setShowSteps((v) => !v)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground w-full">
                          <Milestone className="h-3 w-3 shrink-0" />{showSteps ? "Ocultar" : "Ver"} indicaciones ({osrmResult.steps.length})
                        </button>
                        {showSteps && (
                          <ol className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                            {osrmResult.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                                <span className="text-[10px] text-indigo-400 shrink-0 w-4 text-right">{i + 1}.</span>
                                <span><span className="text-foreground font-medium">{step.maneuver}</span>{step.name !== "Sin nombre" && <> en <span className="italic">{step.name}</span></>}{step.distance > 0 && <span className="ml-1 text-muted-foreground/70">({fmtDist(step.distance / 1000)})</span>}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Brigada + Apoyos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/80 shadow-none">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Flag className="h-4 w-4 text-indigo-500 shrink-0" />
                  <CardTitle className="text-sm">Mi Brigada</CardTitle>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    {teamEntries.length} reg.
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <UserX className="h-3 w-3 shrink-0" />
                    {equipoNoRegistrados.length} no reg.
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                {teamEntries.length === 0 && equipoNoRegistrados.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No hay nadie en el equipo. Configúralo desde Brigadas.</p>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-4 py-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-semibold tabular-nums text-foreground">{teamEntries.length}</span>
                      {teamEntries.length === 1 ? "registrada" : "registradas"}
                    </span>
                    <span className="text-border hidden sm:inline">|</span>
                    <span className="inline-flex items-center gap-1.5">
                      <UserX className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="font-semibold tabular-nums text-foreground">{equipoNoRegistrados.length}</span>
                      {equipoNoRegistrados.length === 1 ? "no registrada" : "no registradas"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-none">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-indigo-500" />
                  <CardTitle className="text-sm">Mis Apoyos</CardTitle>
                  <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{apoyos.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {apoyos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No hay apoyos. Crea uno desde Brigadas.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {apoyos.map((apoyo) => {
                      const regCount = [...new Set(apoyo.beneficiaryMemberIds)].length;
                      const noRegCount = apoyoNoRegistradosAll.filter((u) => u.apoyo_id === apoyo.id).length;
                      return (
                        <div key={apoyo.id} className="px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground truncate min-w-0 flex-1">{apoyo.name}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-medium tabular-nums">
                              <CheckCircle2 className="h-3 w-3" />
                              {regCount} reg.
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-medium tabular-nums">
                              <UserX className="h-3 w-3" />
                              {noRegCount} no reg.
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
      </div>

    </DashboardShell>
  );
}
