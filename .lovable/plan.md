

## Pestaña "Eventos" -- Registro de asistencia por codigo

### Resumen
Nueva pestaña "Eventos" en la barra de navegacion (al lado de "Redes"). El usuario ingresa un codigo de evento (el `evento_id`) que se le da fisicamente. Se valida contra la tabla `eventos` en la base de datos externa, y si es valido se registra la asistencia en `eventos_registros` usando el `hash_code` del usuario actual.

### Arquitectura de datos
Las tablas `eventos` y `eventos_registros` viven en la **base de datos externa** (`externalSupabase`), igual que posts y comentarios. Tu las creas por fuera y nos das acceso de lectura/insercion.

- **eventos**: `evento_id`, `nombre`, `fecha_inicio`, `fecha_fin`, `estatus`, `link_ubicacion`
- **eventos_registros**: `evento_id`, `hash_code`, `created_at`

### Cambios en el codigo

**1. `NetworkTree.tsx`** -- Agregar pestaña
- Agregar `'eventos'` al tipo del estado `viewMode`
- Nuevo boton con icono `CalendarCheck` y texto "Eventos"
- Renderizar `NetworkEventsView` cuando este activo

**2. Nuevo: `src/components/network/NetworkEventsView.tsx`**
- Recibe `rootMember` (para obtener su `hash_code`)
- **Input de codigo**: campo de texto donde el usuario escribe el `evento_id`
- **Validacion**: consulta `externalSupabase.from('eventos').select('*').eq('evento_id', codigo).single()`
  - Si no existe: mensaje de error
  - Si existe pero `estatus` no es activo o fuera de rango de fechas: mensaje informativo
  - Si ya registro asistencia (busca en `eventos_registros` por `evento_id` + `hash_code`): muestra "Ya registraste tu asistencia"
- **Registro**: inserta en `eventos_registros` con `evento_id`, `hash_code` del usuario, y `created_at`
- **Confirmacion**: animacion/toast de exito
- **Historial**: lista de eventos a los que ha asistido el usuario (query por `hash_code`)

**3. Nuevo: `src/hooks/useEventosData.ts`**
- Hook para consultar historial de asistencias del usuario
- Usa `externalSupabase` para queries

### Flujo del usuario
1. Toca pestaña "Eventos"
2. Ve campo de texto "Ingresa el codigo del evento"
3. Escribe el codigo y toca "Registrar asistencia"
4. Se valida el evento y se registra
5. Ve confirmacion y su historial de asistencias

### Sin dependencias nuevas
No se necesita `html5-qrcode` ni ninguna libreria adicional. Solo un input de texto.

