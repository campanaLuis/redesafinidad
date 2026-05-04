# Rendimiento y “fórmula” UX (rapidez + responsivo + BD grande)

Este documento explica **por qué** la app se siente rápida al cambiar de sección o filtros, **qué** hace el código hoy, y **cómo** trasladar la idea a otro proyecto cuando la base de datos es **grande**.

## 1. Por qué no “tarda al cambiar de página”

### SPA + React Router

- Al navegar entre `/` y `/red/...` solo cambia el **árbol de componentes** de React; **no** hay recarga completa del HTML ni de todos los assets (Vite ya cargó el bundle).
- Tras la primera carga, las transiciones de ruta son **inmediatas** salvo que el código espere datos (spinners en `NetworkView`).

### “Pestañas” que no son rutas

En `NetworkTree`, los modos **Niveles / Ranking / Redes / Eventos** son **`useState` local** (`viewMode`), no rutas distintas.

**Efecto:** al tocar una pestaña **no** hay nueva petición HTTP para la red (los datos ya están en estado padre); solo React **re-renderiza** la sección visible. Eso se percibe como **cambio instantáneo** — esa es una parte central de la “fórmula”.

### Memoización de listas y filtros

En vistas con tablas pesadas (p. ej. `NetworkRankingView`):

- **`useMemo`** para aplanar el árbol, filtros por texto y nivel, ordenación, y **paginación** (p. ej. 10 ítems por página).
- Tras la primera construcción en memoria, **filtrar y ordenar** es CPU en el cliente — sin latencia de red.

**Fórmula:** *cargar datos una vez (o con caché) → derivar vistas con `useMemo` → cambiar filtros solo recalcula en JS.*

## 2. Qué papel juega React Query aquí

- **`useCommentsData`** y **`usePostsData`** usan **`staleTime: 5 * 60 * 1000`** (5 minutos): mientras la caché sea válida, **no** se relanzan las peticiones al montar/desmontar componentes hijos.
- Claves de query estables (`['social-posts']`, `['social-comments', ...ids]`) evitan duplicar trabajo innecesario.

Eso alinea con UX rápida al **volver** a una pestaña social sin re-descargar todo de inmediato.

## 3. Dónde está el límite con una “base de datos grande”

Este proyecto prioriza **simplicidad** y **fluidez en el cliente** con estos trade-offs:

| Área | Comportamiento actual | Riesgo si la BD crece mucho |
|------|------------------------|-----------------------------|
| Red de miembros | Un solo `invoke` trae **todos** los registros | Payload grande, parse JSON lento, memoria alta |
| Comentarios / posts | Bucles `.range(0,999)` hasta leer **tablas completas** | Muchas peticiones, tiempo de carga inicial largo |
| Filtros de ranking | Todo sobre datos **ya en memoria** | Rápido *si* los datos caben en RAM |

Es decir: la **sensación** de filtros rápidos viene de **no ir al servidor en cada clic**; el costo se paga en la **carga inicial** o en **sincronización** periódica.

## 4. Cómo copiar la fórmula en otro proyecto (recomendaciones)

### Mantener (alto impacto UX)

1. **SPA** (Vite/React o equivalente) + **router** cliente.
2. **Sub-vistas con estado local** o layout persistente para no remontar árboles pesados sin necesidad.
3. **TanStack Query** (o similar) con **`staleTime`** acorde al caso de uso.
4. **`useMemo` / `useCallback`** para listas filtradas, ordenadas y paginadas **sobre conjuntos ya cargados**.
5. **Diseño móvil-first** con layout centrado (`max-w-md`), sticky header, poco scroll chrome (ver doc de diseño).

### Evolucionar si el volumen de datos es realmente grande

- **No** cargar toda la tabla al cliente: endpoints con **paginación servidor**, **filtros en SQL**, **índices** en columnas de búsqueda (`refiereid`, `path`, fechas).
- **Vistas materializadas** o tablas agregadas para rankings globales.
- **Edge Functions** o BFF que devuelvan solo el subárbol del usuario (por `hash_code` o `path`), no el universo completo.
- Para listas muy largas en UI: **virtualización** (`react-window`, TanStack Virtual) además de paginación.
- Comentarios/posts: agregar por **ventana de tiempo**, **top N**, o **pre-agregados** por usuario en lugar de escanear tablas enteras.

La app actual es un buen **referente de patrón de interacción**; el **dimensionamiento** para BD masiva requiere complementar con **estrategia servidor** (lo anterior).

## 5. Checklist rápido “misma sensación que Red Afinidad”

- [ ] Tokens HSL + shadcn + Tailwind (`cn()`).
- [ ] Una carga principal con loading claro; después, **navegación interna sin recargar**.
- [ ] Tabs/secciones como **estado React**, no rutas, cuando no haga falta URL profunda.
- [ ] React Query con **staleTime** para datos sociales o secundarios.
- [ ] Derivados pesados con **useMemo**; paginación en UI donde aplique.
- [ ] Para BD grande: plan explícito de **queries acotadas** + índices; no asumir que “cargar todo” escala igual.
