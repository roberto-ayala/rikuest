# Plan de Mejoras — Rikuest

Basado en el análisis del código en la rama `feature/ra-vars` (julio 2026): backend Go (~2.900 LOC) y frontend React (~8.400 LOC). Las fases están ordenadas por prioridad; cada paso indica los archivos afectados y el criterio de "hecho".

---

## Fase 0 — Higiene urgente (seguridad y repo) ✅ COMPLETADA

1. **Rotar y eliminar el webhook de Discord hardcodeado.** ✅ Hecho en código: `DiscordWebhookURL()` ahora lee `RIKUEST_DISCORD_WEBHOOK`; sin la variable → telemetría desactivada.
   ⚠️ **Pendiente manual**: rotar/invalidar el webhook antiguo en Discord — sigue expuesto en el historial de git.

2. **Telemetría opt-in, no opt-out.** ✅ Default `enabled = 0` en el schema y en la fila inicial de `telemetry_config`; el usuario la activa desde `TelemetrySettings`.
   Nota: instalaciones existentes conservan su fila con `enabled = 1`, pero sin webhook (env var o BD) no se envía nada.

3. **Sacar `rikuest.db` del repo.** ✅ Ya estaba resuelto: el archivo nunca estuvo trackeado y `.gitignore` ya lo cubre (el análisis inicial era incorrecto en este punto).

4. **Limpieza rápida de frontend.** ✅ Eliminada la dependencia `axios` (nunca importada) y los ~23 `console.log`/`console.debug` de producción (se conservan los `console.error`).

---

## Fase 1 — Corrección y robustez del backend

Bugs reales que hoy producen comportamiento silenciosamente incorrecto.

5. **Activar claves foráneas en SQLite.**
   `PRAGMA foreign_keys = ON` nunca se ejecuta, así que todos los `ON DELETE CASCADE` del esquema se ignoran: borrar un proyecto deja requests/folders/environments huérfanos. Añadir el pragma al DSN o tras `sql.Open` en `internal/database/database.go`.

6. **Configurar el pool para SQLite.**
   `SetMaxOpenConns(1)` + `_busy_timeout` (o modo WAL). Hoy la goroutine de telemetría escribe en paralelo con `request_history` → errores `database is locked`.

7. **Transaccionar `MAX(position)+1`.**
   `CreateRequest` y `CreateFolder` (database.go ~300-320, ~454-470) hacen read-then-write sin transacción — carrera de posiciones.

8. **Limitar el tamaño de respuesta.**
   `executeHTTPRequest` hace `io.ReadAll` sin límite (request_service.go:216); una descarga grande tumba la app y engorda la BD. Usar `io.LimitReader` (p. ej. 10 MB configurable) e indicar truncamiento en la respuesta.

9. **Apagado limpio en modo servidor.**
   `cmd/server/main.go:92` usa `log.Fatal(r.Run(...))` — el `defer db.Close()` nunca corre. Cambiar a `http.Server` + manejo de señales + `Shutdown(ctx)`. Añadir `gin.SetMode(gin.ReleaseMode)`.

10. **Arreglar CORS.**
    `AllowOrigins: ["*"]` + `AllowCredentials: true` es una combinación inválida e insegura; en modo servidor la app es un proxy SSRF abierto. Restringir a `localhost` (5173/8080) por defecto.

11. **Índices en claves foráneas.**
    No existe ningún índice más allá de PK/UNIQUE. Añadir índices sobre `project_id`, `folder_id`, `request_id`, `environment_id`.

12. **Migraciones versionadas.**
    `migrateRequestsTable()` compara nombres de columna hardcodeados para tragarse errores de "duplicate column". Sustituir por una tabla `schema_version` con migraciones numeradas.

---

## Fase 2 — Tests (base para todo lo demás)

Hoy hay **cero tests**. Empezar por las funciones puras (máximo valor / mínimo esfuerzo):

13. `internal/services/variable_resolver.go` — tests de tabla: precedencia env < folder, variables desconocidas quedan literales.
14. `internal/services/response_capture_service.go` (`extractDotPath`) — hoy silencia todos los errores; los tests documentan el comportamiento.
15. `internal/services/format_service.go` — los 4 generadores; hay bugs conocidos de escapado (cuerpos con comillas simples rompen el cURL generado, línea ~211).
16. `internal/services/config_service.go` — clamping del timeout.
17. `executeHTTPRequest` con `httptest.Server` — timeout, form encoding, mapeo de errores.
18. **CI mínimo**: GitHub Actions con `go test ./...`, `go vet` y `cd frontend && npm run lint`.

---

## Fase 3 — Refactor arquitectónico

### Backend

19. **Deduplicar código triplicado/duplicado:**
    - `buildRawRequest` (request_service.go:250-348) ≈ `FormatService.BuildRawRequest` (format_service.go:55-154) → una sola implementación.
    - `getErrorStatusText` existe 3 veces (request_service.go:351, handlers.go:19 —código muerto—, y el propio servicio).
    - `sendEventSync`/`sendEvent` en telemetry_service.go (498 LOC, ~90% idénticas) → extraer `buildDiscordPayload`.

20. **Introducir `context.Context` de extremo a extremo.**
    Ningún método de servicios/BD lo acepta; no hay cancelación ni deadlines. Empezar por `ExecuteRequest` (cancelar peticiones en curso) y propagar hacia abajo.

21. **Dividir `database.go` (809 LOC)** en repositorios por agregado (`project_repo.go`, `request_repo.go`, `environment_repo.go`, `telemetry_repo.go`). De paso, arreglar el N+1 de `GetEnvironments` (carga variables en bucle).

22. **Resolver la cadena de carpetas padre en variables.**
    `variable_resolver.go` solo consulta la carpeta inmediata pese a que las carpetas son un árbol (`parent_id`): las variables de carpetas ancestras se ignoran silenciosamente. Definir y documentar la precedencia: env < carpetas ancestras < carpeta inmediata.

23. **Eliminar el wiring `SetCollaborators`** (services.go:23): reordenar la construcción para inyectar dependencias por constructor y quitar los nil-guards.

24. **Paridad HTTP/Wails:** la telemetría solo se emite en modo Wails y las respuestas de create difieren (Wails re-consulta, HTTP no). Definir una interfaz-fachada común que ambos entrypoints consuman para que no puedan divergir.

### Frontend

25. **Descomponer `RequestBuilder.jsx` (1.357 LOC)** en: editor de params/headers/body/auth, panel de respuesta, drawer de historial, modal de borrado. Extraer hooks compartidos:
    - `useResizablePanel` (3 resizers duplicados en Project.jsx y RequestBuilder.jsx),
    - `useIsDark` (2 MutationObserver idénticos en RequestBuilder y JsonEditor),
    - `useAutosave` (la lógica de debounce+diff de RequestBuilder.jsx:291-365 es frágil y pertenece al store).
    Después, mismo tratamiento para `FolderTree.jsx` (742 LOC).

26. **Factory de stores Zustand.** Los 6 stores repiten el boilerplate `loading/try/catch/finally`; `projectStore` y `requestStore` son casi idénticos. Un `createResourceStore` elimina ~40% del código y unifica el manejo de errores (hoy 3 stores lo tragan y 2 lo guardan sin que nadie lo pinte).

27. **Contrato de adapters.** Corregir el **bug de orden de argumentos** en `wailsAdapter.setActiveEnvironment` (línea 136: `(projectId, id)` invertido respecto al apiAdapter), eliminar las mutaciones del objeto del caller en los `update*`, y añadir un test de paridad que verifique que ambos adapters exponen los mismos métodos.

28. **i18n:** compartir estado vía contexto (hoy cada `useTranslation()` carga y guarda su propia copia), y traducir los textos hardcodeados (tabs Params/Headers/Body/Authorization/Captures, JsonEditor, CopyFormatModal, selectores de tema/color).

29. **`ErrorBoundary`** de React (hoy cualquier throw en render deja pantalla blanca) y **arreglar `calculateNewPosition`** (`FolderTree.jsx:357`: devuelve `Date.now() % 1000`, un placeholder que hace el orden de drag&drop efectivamente aleatorio). Sustituir los `key={index}` en listas editables por ids estables.

---

## Fase 4 — UX

30. **Sistema de toasts/notificaciones y errores visibles.** La mayor carencia de UX: hoy todo fallo (ejecutar, guardar, cargar) termina en `console.error` y el usuario no ve nada. Toast global + render del campo `error` de los stores.

31. **Indicador de estado de guardado** (sin guardar / guardando / guardado) — el autosave es silencioso y un fallo de guardado es invisible.

32. **Atajos de teclado:** `Cmd/Ctrl+Enter` enviar, `Cmd/Ctrl+S` guardar, `Cmd/Ctrl+K` búsqueda global. Documentarlos en un modal de ayuda.

33. **Accesibilidad:** usar `@headlessui/react` (ya instalado, sin uso) para modales y menús contextuales → focus trap, `role="dialog"`, Escape. Hoy hay cero atributos `aria-*` en todo el código.

34. **Panel de respuesta:** botón copiar, búsqueda en el body, toggle pretty/raw, word-wrap, y preview de imágenes/binarios.

35. **Unificar el header duplicado de `App.jsx`** (modos default/compact duplican el markup completo, líneas 57-85 vs 101-129).

---

## Fase 5 — Funcionalidades nuevas

Ordenadas por relación valor/esfuerzo frente a Postman/Insomnia:

36. **Pestañas multi-request.** Hoy solo hay un `currentRequest`; es el mayor gap funcional. Requiere elevar el estado de respuesta/vista por pestaña.
37. **Importar cURL** (ya existe export cURL/fetch/python y import OpenAPI; falta el camino inverso, muy barato de añadir).
38. **`multipart/form-data` con subida de archivos** (backend solo soporta `x-www-form-urlencoded`; modelo `FormData` es solo key/value).
39. **Más tipos de auth:** API key (header/query) y OAuth2 client-credentials (hoy solo none/bearer/basic).
40. **Opciones de ejecución:** toggle "ignorar certificado TLS inválido", control de redirects, timeout por request.
41. **Búsqueda global** de requests por nombre/URL (`Cmd+K`).
42. **Cookie jar** por proyecto.
43. **Collection runner** (ejecutar una carpeta en secuencia usando las capturas de respuesta ya existentes como encadenado) — se apoya en `response_captures`, que ya es una fortaleza del producto.
44. *(Futuro/explorar)* GraphQL y WebSocket.

---

## Orden sugerido de ejecución

| Sprint | Contenido | Riesgo |
|---|---|---|
| 1 | Fase 0 completa + pasos 5-8 | Bajo — cambios pequeños y aislados |
| 2 | Resto de Fase 1 + Fase 2 (tests + CI) | Bajo |
| 3 | Fase 3 backend (19-24) | Medio — refactor con red de tests ya puesta |
| 4 | Fase 3 frontend (25-29) + toasts (30-31) | Medio |
| 5 | Fase 4 restante + features 36-38 | Medio |
| 6+ | Features 39-44 según prioridad de producto | — |

Regla general: no empezar la Fase 3 (refactors) sin tener la Fase 2 (tests) en verde — los tests de las funciones puras son precisamente los que protegen los refactors de deduplicación y descomposición.
