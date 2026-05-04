# Arquitectura, datos y backend

## Modelo general

La aplicación es una **SPA** (Single Page Application): un solo bundle cargado, navegación con **React Router** sin recargar el documento completo.

```
Usuario → Navegador (React)
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Supabase (proyecto      Supabase “externo”
de la app)              (otro proyecto URL)
    ↓                   ↓
Edge Function           Tablas de posts,
fetch-network-data      comentarios, eventos
    ↓
API HTTP externa
(Ejército Digital /
 registro de red)
```

## Rutas

**Archivo:** `src/App.tsx`

| Ruta | Página | Rol |
|------|--------|-----|
| `/` | `DashboardHome` | Panel escritorio (CRM) — shell principal |
| `*` | `NotFound` | 404 |

*(La entrada por código hash y la vista de red asociada fueron retiradas; no hay flujo de login en la app por ahora.)*

El **código en la URL** es el identificador público del miembro (`hash_code` en el modelo de datos).

## Proveedores globales

- **`QueryClientProvider`** (TanStack React Query): disponible para hooks que usan `useQuery` (p. ej. comentarios y posts sociales).
- **`TooltipProvider`**, **Toaster** (doble sistema: Radix toast + Sonner): feedback al usuario.
- **React Router `BrowserRouter`**: rutas declarativas.

## Datos de la red (miembros, árbol)

### Cliente Supabase del proyecto principal

**Archivo:** `src/integrations/supabase/client.ts`

- URL y clave desde **`import.meta.env`** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
- Uso principal en esta app: invocar **funciones Edge** y posiblemente auth.

### Edge Function `fetch-network-data`

**Ubicación:** `supabase/functions/fetch-network-data/index.ts`

- **No** lee directamente la tabla desde el frontend.
- Hace **GET** a una API externa (`api-ejercitodigital.seguimientoamigos.com/...`) con header **`x-internal-secret`** desde variable de entorno **`EJERCITO_DIGITAL_SECRET`** (solo en el servidor Deno).
- Devuelve un **array JSON** de registros; normaliza nombres de campos de redes sociales (`twitter_handle` → `twitter_username`, etc.).
- CORS habilitado para llamadas desde el navegador.

**Ventaja:** el secreto de la API **no** viaja en el bundle del cliente.

### Hook `useNetworkData` / `useNetworkDataByHash`

**Archivo:** `src/hooks/useNetworkData.ts`

1. **`fetchAllMembers()`** llama `supabase.functions.invoke('fetch-network-data')` y obtiene **todos** los miembros en una sola respuesta.
2. **`useNetworkDataByHash`:** tras cargar el array, busca el usuario por **`hash_code`**, filtra **descendientes** con prefijo de `path` (`m.path.startsWith(\`${user.path}.\`)`), y construye el **árbol** en memoria con `buildTree` (recursivo por `refiereid`).
3. **`useMemo`** para derivar el objeto `NetworkTree` (referente, tú, invitados, hermanos).

**Esquema lógico del miembro:** ver `src/types/network.ts` y migración `supabase/migrations/..._red_afinidad_ciudadana.sql` (campos como `id`, `path`, `refiereid`, `nombre`, `hash_code`, contadores de descendientes, redes sociales, etc.).

## Datos sociales (posts y comentarios) — BD externa

**Archivo:** `src/lib/externalSupabase.ts`

- Cliente `createClient` apuntando a **otro** proyecto Supabase (URL y anon key **incrustadas en código** en este repo).
- **Uso:** lectura de tablas por plataforma, p. ej. `Twitter_posts`, `Instagram_comentarios`, etc.

### Hooks

| Hook | Qué hace |
|------|----------|
| `usePostsData` | `useQuery` con clave `['social-posts']`; por plataforma pagina en bloques de **1000** filas hasta agotar; ordena posts por fecha; `staleTime: 5 min` |
| `useCommentsData` | `useQuery` dependiente de la lista de miembros; trae comentarios de 4 plataformas en **paralelo** (`Promise.all`), mismos bloques de 1000; cruza **username** normalizado con handles de miembros; `staleTime: 5 min` |

Los resultados se agregan en estructuras en memoria (`Map` de resúmenes por `memberId`) para alimentar badges y vistas sociales.

## Eventos (asistencia)

Según `.lovable/plan.md` y componentes (`NetworkEventsView`, `useEventosData`): validación e inserción contra tablas como `eventos` y `eventos_registros` en la **misma BD externa**, usando `hash_code` del usuario.

## Seguridad y despliegue (notas)

- Variables **`VITE_*`** son públicas en el front; no poner secretos ahí.
- El **anon key** del Supabase externo en el código es un riesgo operativo si el repositorio es público; en producción conviene **RLS** estricta y/o **proxificar** lecturas sensibles.
- La Edge Function debe desplegarse con **`EJERCITO_DIGITAL_SECRET`** configurado en el dashboard de Supabase.

## Cómo replicar el backend en otro proyecto

1. **Misma idea de capas:** frontend solo con URLs/claves públicas; secretos solo en **Edge Functions** o backend propio.
2. **Contrato de datos:** definir tipos TypeScript compartidos (como `NetworkMember`) y una función de mapeo si la API externa usa otros nombres de campo.
3. **Dos bases si hace falta:** proyecto “app” para auth/funciones + proyecto “datos masivos” para analítica social, con políticas RLS claras.
4. **React Query** para datos que pueden cachearse y evitar refetch innecesario al cambiar de sub-vista.
