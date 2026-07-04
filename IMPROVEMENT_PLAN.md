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

5. **Activar claves foráneas en SQLite.** ✅ DSN con `_foreign_keys=on` en `database.NewDB`; los CASCADE/SET NULL del esquema ahora se aplican de verdad (cubierto por tests).

6. **Configurar el pool para SQLite.** ✅ `SetMaxOpenConns(1)` + `_journal_mode=WAL` + `_busy_timeout=5000` en el DSN.

7. **Transaccionar `MAX(position)+1`.** ✅ Resuelto sin transacción: la posición se calcula con un subquery dentro del propio INSERT (atómico) en `CreateRequest` y `CreateFolder`, devuelta vía `RETURNING`.

8. **Limitar el tamaño de respuesta.** ✅ `io.LimitReader` de 10 MB (`maxResponseBodyBytes` en request_service.go); los cuerpos truncados se marcan con una nota al final del body.

> Nota: junto con estos pasos se creó `internal/database/database_test.go` (primeros tests del proyecto: posiciones, FKs, cascade, telemetría opt-in) — adelanto de la Fase 2.

9. **Apagado limpio en modo servidor.** ✅ `http.Server` + SIGINT/SIGTERM + `Shutdown(ctx)` con drenaje de 10s; `db.Close()` ahora sí corre. Gin en release mode salvo que `RIKUEST_DEBUG` esté definida.

10. **Arreglar CORS.** ✅ Orígenes restringidos a localhost/127.0.0.1 (5173 y 8080); eliminado `AllowCredentials` + wildcard.

11. **Índices en claves foráneas.** ✅ 8 índices sobre las FKs consultadas con frecuencia, aplicados como migración v1.

12. **Migraciones versionadas.** ✅ Runner basado en `PRAGMA user_version` (lista `migrations` numerada, transaccional); la detección de columnas legacy usa `PRAGMA table_info` en vez de comparar strings de error. Cubierto por tests.

**Fase 1 ✅ COMPLETADA**

---

## Fase 2 — Tests (base para todo lo demás) ✅ COMPLETADA

13. `variable_resolver.go` ✅ Resolve (tabla), ResolveRequest (todos los campos + no-mutación), BuildVariableMap (precedencia env < folder, sin env activo).
14. `response_capture_service.go` ✅ `extractDotPath` (tabla con arrays/escalares/nulls) y `ApplyCaptures` end-to-end (guarda en env activo, silencioso ante JSON inválido).
15. `format_service.go` ✅ cURL (headers, auth, query params, bodies), GetFormat/GetAllFormats. Pendiente: el bug de escapado de comillas simples en el body cURL sigue ahí (documentarlo/arreglarlo en Fase 3 al deduplicar).
16. `config_service.go` ✅ default 300s, clamping [1, 10800], fallback ante valores no numéricos.
17. `executeHTTPRequest` ✅ con `httptest.Server`: headers/auth/query params, form encoding, errores de conexión como respuesta status 0, truncamiento a 10 MB.
18. **CI mínimo** ✅ `.github/workflows/ci.yml`: backend (build+vet+test) y frontend (lint+build). El lint es `continue-on-error` hasta limpiar los ~40 errores legacy de `no-unused-vars` (hacerlo blocking al completar el paso 25).

---

## Fase 3 — Refactor arquitectónico

### Backend ✅ COMPLETADO

19. **Deduplicar código.** ✅ `buildRawRequest` unificado en FormatService; `errorStatusText` única (copia muerta de handlers eliminada); telemetría con `deliver()` + `buildDiscordPayload()` compartidos (además se protegió el slice `installationID[:8]` y se eliminó la goroutine huérfana de la re-creación del servicio en main.go).

20. **`context.Context` en la ruta de ejecución.** ✅ `ExecuteRequest(ctx, id)` + `http.NewRequestWithContext`; HTTP pasa el contexto de gin (desconexión del cliente cancela la petición saliente), Wails pasa el contexto de ciclo de vida. Con test de cancelación. Pendiente (menor): propagar ctx al resto de métodos CRUD/BD.

21. **Dividir `database.go`.** ✅ 7 archivos por agregado (project/request/folder/environment/capture/telemetry/settings_repo.go); database.go conserva solo conexión, schema y migraciones. N+1 de `GetEnvironments` resuelto con un único JOIN.

22. **Cadena de carpetas ancestras.** ✅ CTE recursivo `GetFolderAncestry`; precedencia documentada y testeada: env < ancestros (root primero) < carpeta inmediata.

23. **Inyección por constructor.** ✅ `NewRequestService(db, resolver, capture)`; `SetCollaborators` y nil-guards eliminados.

24. **Paridad HTTP/Wails.** ✅ Los handlers HTTP ahora emiten los mismos eventos de telemetría que Wails (project_created, folder_created, request_executed); eliminados los re-fetch de Wails tras create (RETURNING ya devuelve el modelo completo) — ambas rutas devuelven lo mismo. Pendiente (menor): interfaz-fachada formal que fuerce la paridad en compilación.

### Frontend ✅ COMPLETADO

25. **Descomponer `RequestBuilder.jsx`.** ✅ De 1.357 a 342 líneas; editores/respuesta/historial/modal en `components/request-builder/`. Hooks extraídos: `useResizablePanel`, `useIsDark`, `useAutosave` (mismo debounce y formato de guardado; claves de layout preservadas). `getMethodColor` unificado en `lib/utils.js`. Pendiente (menor): mismo tratamiento para `FolderTree.jsx` (742 LOC).

26. **Factory de stores Zustand.** ✅ Helper `asyncAction` en `stores/createAsyncAction.js`; los 5 stores de datos lo usan y todos exponen `error` en el estado (contrato unificado para el futuro sistema de toasts, paso 30). Los mapas estáticos de uiStore viven en `lib/uiConfig.js`.

27. **Contrato de adapters.** ✅ Verificado: el supuesto bug de orden de argumentos en `setActiveEnvironment` **no existía** (el orden es consistente y correcto contra el binding Go). Sí corregido: mutaciones del objeto del caller en los `update*` de wailsAdapter, y chequeo de paridad de métodos en dev (console.warn si los adapters divergen).

28. **i18n.** ✅ `useTranslation` comparte estado vía un store único (una carga de locale por idioma para toda la app); tabs de request/respuesta, JsonEditor, CopyFormatModal, selectores y drop-zone traducidos; en/es/fr sincronizados (278 claves cada uno).

29. **ErrorBoundary + drag&drop.** ✅ ErrorBoundary montado en main.jsx (reporta a telemetría, pantalla recuperable); `calculateNewPosition` ya no es aleatorio (toma el slot del request destino o añade al final de la carpeta); `key={index}` sustituido por `_id` estables en las filas editables.

**Fase 3 ✅ COMPLETADA** (pendientes menores anotados en 20, 24 y 25)

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
