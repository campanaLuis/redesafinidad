import type { EquipoNoRegistrado, UsuarioDeApoyo } from "@/lib/excelImport";

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function extractPostalCode(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = normalizeText(value);
    if (!trimmed) continue;
    const exact = trimmed.match(/\b\d{5}\b/);
    if (exact) return exact[0];
    if (/^\d{5}$/.test(trimmed)) return trimmed;
  }
  return null;
}

/** Construye una consulta legible para Nominatim a partir de los campos del Excel. */
export function buildUsuarioApoyoGeocodeQuery(u: UsuarioDeApoyo): string {
  const parts: string[] = [];
  const postalCode = extractPostalCode(u.codigo_postal, u.numero_exterior);
  const streetNumber = normalizeText(u.numero_exterior);
  const includeStreetNumber = streetNumber && streetNumber !== postalCode;
  const calle = [u.calle, includeStreetNumber ? streetNumber : null].filter(Boolean).join(" ").trim();
  if (calle) parts.push(calle);
  if (u.colonia?.trim()) parts.push(u.colonia.trim());
  if (u.localidad?.trim()) parts.push(u.localidad.trim());
  if (u.municipio?.trim()) parts.push(u.municipio.trim());
  if (postalCode) parts.push(`CP ${postalCode}`);
  parts.push("Querétaro", "México");
  return parts.filter(Boolean).join(", ");
}

/** Construye una consulta legible para filas del equipo no registrado si traen datos de ubicación. */
export function buildEquipoNoRegistradoGeocodeQuery(u: EquipoNoRegistrado): string {
  const parts: string[] = [];
  const postalCode = extractPostalCode(u.codigo_postal, u.numero_exterior);
  const streetNumber = normalizeText(u.numero_exterior);
  const includeStreetNumber = streetNumber && streetNumber !== postalCode;
  const calle = [u.calle, includeStreetNumber ? streetNumber : null].filter(Boolean).join(" ").trim();
  if (calle) parts.push(calle);
  if (u.colonia?.trim()) parts.push(u.colonia.trim());
  if (u.localidad?.trim()) parts.push(u.localidad.trim());
  if (u.municipio?.trim()) parts.push(u.municipio.trim());
  if (postalCode) parts.push(`CP ${postalCode}`);
  parts.push("Querétaro", "México");
  return parts.filter(Boolean).join(", ");
}

interface NominatimHit {
  lat: string;
  lon: string;
}

interface PhotonHitCollection {
  features?: Array<{
    geometry?: {
      coordinates?: [number, number];
    };
  }>;
}

async function photonGeocodeFirst(addressQuery: string): Promise<{ lat: number; lng: number } | null> {
  const q = addressQuery.trim();
  if (!q) return null;
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "RedAfinidad/1.0 (geocodificación photon)",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as PhotonHitCollection;
  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Primera coincidencia de Nominatim (OSM). Respeta la política de uso: identificar la app.
 */
export async function nominatimGeocodeFirst(addressQuery: string): Promise<{ lat: number; lng: number } | null> {
  const q = addressQuery.trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=mx&accept-language=es`;
  const res = await fetch(url, {
    headers: {
      "Accept-Language": "es",
      "User-Agent": "RedAfinidad/1.0 (geocodificación apoyos)",
    },
  });
  if (!res.ok) return photonGeocodeFirst(q);
  const data = (await res.json()) as NominatimHit[];
  if (!data?.length) return photonGeocodeFirst(q);
  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return photonGeocodeFirst(q);
  return { lat, lng };
}

export async function geocodeUsuarioDeApoyo(u: UsuarioDeApoyo): Promise<{ lat: number; lng: number } | null> {
  const query = buildUsuarioApoyoGeocodeQuery(u);
  return nominatimGeocodeFirst(query);
}

export async function geocodeEquipoNoRegistrado(u: EquipoNoRegistrado): Promise<{ lat: number; lng: number } | null> {
  const query = buildEquipoNoRegistradoGeocodeQuery(u);
  if (!query.trim() || query === "Querétaro, México") return null;
  return nominatimGeocodeFirst(query);
}

/** Intenta extraer lat/lng de un enlace de Google Maps, Waze u otra URL con coordenadas. */
export function parseLatLngFromUbicacionText(s: string | null | undefined): { lat: number; lng: number } | null {
  if (!s?.trim()) return null;
  const t = s.trim();
  const at = t.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)(?:\b|,|\s)/);
  if (at) {
    const lat = parseFloat(at[1]);
    const lng = parseFloat(at[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const qm = t.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qm) {
    const lat = parseFloat(qm[1]);
    const lng = parseFloat(qm[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const ll = t.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/i);
  if (ll) {
    const lat = parseFloat(ll[1]);
    const lng = parseFloat(ll[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

export async function geocodeEventoUbicacion(ubicacion: string | null | undefined): Promise<{ lat: number; lng: number } | null> {
  const parsed = parseLatLngFromUbicacionText(ubicacion);
  if (parsed) return parsed;
  const q = ubicacion?.trim();
  if (!q) return null;
  const direct = await nominatimGeocodeFirst(q);
  if (direct) return direct;
  const postalCode = extractPostalCode(q);
  if (postalCode) {
    const postalLookup = await nominatimGeocodeFirst(`CP ${postalCode}, Querétaro, México`);
    if (postalLookup) return postalLookup;
  }
  return nominatimGeocodeFirst(`${q}, Querétaro, México`);
}
