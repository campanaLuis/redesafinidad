# Diseño y sistema visual

## Base tecnológica de UI

- **shadcn/ui** en modo “default”, con **variables CSS** (`components.json`: `baseColor: slate`, `cssVariables: true`). Los componentes viven en `src/components/ui/` y se componen con **Tailwind**.
- **Utilidad `cn()`** (`src/lib/utils.ts`): combina `clsx` + `tailwind-merge` para clases condicionales sin conflictos.
- **Iconos:** `lucide-react` de forma consistente en navegación, cabeceras y acciones.
- **Fuentes:** no hay `@font-face` personalizado en el repo; se usan las **fuentes del sistema** vía Tailwind/shadcn (aspecto limpio y carga rápida).

## Tokens de color (fuente de verdad)

**Archivo:** `src/index.css`

- Todos los colores semánticos se definen en **HSL** como variables CSS (`--background`, `--primary`, etc.), no como hex fijos en componentes.
- **Tema claro** (`:root`) y **tema oscuro** (`.dark`) están definidos; `tailwind.config.ts` mapea esos tokens a clases (`bg-background`, `text-primary`, `border-border`, etc.).
- **Paleta dominante:** tonos **azul/hue 214** para primario, fondos y bordes; sensación de producto “dashboard” coherente y profesional.

### Variables clave (claro)

| Token | Uso típico |
|-------|------------|
| `--background` / `--foreground` | Fondo de página y texto principal |
| `--primary` / `--primary-foreground` | CTAs, iconos destacados, pestaña activa |
| `--muted` / `--muted-foreground` | Fondos suaves, texto secundario |
| `--border` / `--input` / `--ring` | Bordes, inputs, foco |
| `--destructive` | Errores y estados críticos |
| `--radius` (`1rem`) | Esquinas redondeadas globales (cards, botones) |

### Tokens específicos del árbol de red

Definidos en el mismo `index.css` y expuestos en Tailwind como `tree.line`, `tree.you`, `tree.referrer`, `tree.invited`, `tree.glow` para el grafo/jerarquía visual.

## Tailwind

**Archivo:** `tailwind.config.ts`

- `darkMode: ["class"]` — el tema oscuro se activa con clase en un ancestro (compatible con `next-themes` si se usara).
- `container` centrado con padding y breakpoint `2xl: 1400px`.
- **Plugins:** `tailwindcss-animate` (animaciones de acordeón Radix, etc.).
- Animaciones custom en `theme.extend`: `marquee`, acordeón.

## Patrones de layout y sensación “app móvil”

1. **Viewport:** `index.html` incluye `width=device-width, initial-scale=1.0` — base para comportamiento responsive.
2. **Ancho de contenido:** muchas vistas usan **`max-w-md mx-auto`** (p. ej. cabecera, landing) — columna única centrada, típica de apps móviles.
3. **Cabecera sticky:** `NetworkHeader` usa `sticky top-0 z-20`, `bg-background/80`, **`backdrop-blur-lg`**, `border-b` — contenido bajo scroll sin perder contexto; sensación de app nativa.
4. **Scrollbars ocultos:** en `index.css` y utilidad `.scrollbar-hide` — menos ruido visual en móvil (scroll sigue funcionando).
5. **Controles compactos:** pestañas en `NetworkTree` con botones `size="sm"`, texto ~`11px`, iconos pequeños — alta densidad de información sin sentirse “desktop pesado”.

## Componentes de dominio (red)

- **`levelColors.ts`:** colores **por nivel** de profundidad en el árbol (emerald, amber, sky, etc.) con variantes `dark:` para modo oscuro.
- **Animaciones locales:** `animate-fade-up`, `animate-pulse-soft`, `animate-invite-glow` (pulso en botón compartir) en `index.css`.
- **Gráficos:** `recharts` donde haga falta visualización de datos en vistas de red.

## Cómo replicar el estilo en otro proyecto

1. Crear proyecto **Vite + React + TS** e instalar **Tailwind** con la misma estrategia de **variables HSL** en un solo `index.css` (o copiar/adaptar tokens).
2. Inicializar **shadcn/ui** con `cssVariables: true` y `baseColor: slate` (o el más cercano al look deseado).
3. Mantener **una sola fuente de verdad** para colores (`:root` / `.dark`) y usar solo clases semánticas (`bg-primary`, `text-muted-foreground`) en componentes.
4. Para sensación móvil: **`max-w-md`**, **sticky header** con blur, **botones y tabs compactos**, **Lucide** para iconografía uniforme.
5. Copiar/adaptar tokens `tree.*` solo si el nuevo producto también muestra jerarquías similares.
