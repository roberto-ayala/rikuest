# Plan de Unificación de Componentes React

Objetivo: eliminar la divergencia visual y de código entre componentes que hacen
lo mismo de forma distinta (modales, formularios, menús contextuales), extrayendo
primitivos reutilizables en `frontend/src/components/ui/`. El caso disparador es
el modal de **crear proyecto** vs **editar proyecto** en `views/Home.jsx`: dos
bloques casi idénticos de ~38 líneas cada uno.

## Diagnóstico (estado actual)

| Problema | Dónde | Impacto |
|----------|-------|---------|
| 3 técnicas de shell de modal distintas | raw `div` (Home, SettingsModal, HistoryDrawer, LanguageSelector) vs Headless UI con overlay en className (ConfirmDialog, FolderVariablesModal…) vs Headless UI con backdrop en `div` aparte (DeleteConfirmModal) | Los raw `div` no tienen focus-trap, Escape ni accesibilidad |
| Overlay inconsistente | `bg-black/50` vs `bg-background/80 backdrop-blur-sm` | Aspecto distinto entre diálogos |
| Clases de panel duplicadas | `bg-card p-6 rounded-lg shadow-lg border border-border w-full max-w-md` repetido en cada modal | Cambiar el estilo obliga a tocar N archivos |
| Crear vs Editar proyecto duplicados | `views/Home.jsx` (2 bloques casi idénticos) | Divergencia futura garantizada |
| Falta primitivo `Modal`/`Label`/`Field`/`Checkbox`/`Switch` | `components/ui/` sólo tiene Button, Input, Select, Textarea | No hay base común |
| `ConfirmDialog` ≈ `DeleteConfirmModal` | ~90% solapamiento | Dos componentes para lo mismo |
| **`Input` no respeta `useUISize`** (tamaño fijo `h-9`), pero `Select` sí | `ui/Input.jsx` vs `ui/Select.jsx` | Es la **causa raíz** de que se hagan inputs a mano: para escalar con el tamaño de UI |
| Inputs de texto sueltos con clases a mano | `FolderVariablesModal`, `EnvironmentManager`, `ResponseCapturesPanel` | Apariencia distinta (ver tabla Fase 4) |
| Checkboxes crudos (6 ocurrencias) | `RequestTabs`, `OpenAPIImportModal` | Sin primitivo `Checkbox` |
| Toggle/switch a mano (peer-based) | `TelemetrySettings` | Sin primitivo `Switch` |
| `<select>` crudos | `RequestBuilder`, `RequestTabs`, `Project` | No usan el primitivo `Select` |
| `<label>` con clases inconsistentes | 7 archivos: `${text('sm')} font-medium mb-2 block` vs `text-sm font-medium mb-2 block` vs sin margen | Sin primitivo `Label` |
| Menús contextuales a mano | `Home`, `FolderTree`, `Project` (todos con `menuPosition` + `role="menu"`) | Lógica de posicionado/teclado triplicada |

## Principios

- **No cambiar comportamiento** en fases de refactor: mismas features, mismo texto i18n, misma validación.
- **Verificar por fase**: `npm run build` + `npm run lint` (sin regresiones sobre el baseline de ~40 `no-unused-vars`) + sincronía de locales en/es/fr.
- **Commit por fase** con mensaje descriptivo; actualizar `CLAUDE.md` cuando se agregue un primitivo nuevo a la convención.
- Un primitivo se adopta **incrementalmente**: se crea, se migra el caso disparador, luego el resto.

---

## Fase 0 — Primitivos base (`ui/Modal`, `ui/Field`, `ui/Label`) ✅

Fundación sobre la que se apoya todo lo demás. Sin migrar consumidores todavía.

- [x] `ui/Modal.jsx` — wrapper de Headless UI `Dialog` con overlay estándar
      (`bg-background/80 backdrop-blur-sm`), panel centrado y prop `size`
      (`sm|md|lg|xl`). Exporta subcomponentes `ModalHeader` (título + botón X de
      cierre), `ModalBody`, `ModalFooter` (área de acciones alineada a la derecha).
- [x] `ui/Label.jsx` — `<label>` con las clases estándar (`font-medium`, tamaño desde `useUISize`).
- [x] `ui/Field.jsx` — compone `Label` + control (`children`) + texto de ayuda/error opcional.
- [x] `ui/IconButton.jsx` — botón ghost cuadrado para iconos (X de cerrar, papelera), hoy repetido inline.
- [x] **`ui/Input.jsx` — integrarlo con `useUISize`** (como ya hace `Select`) para que
      escale con el tamaño de UI. Esta es la razón por la que hoy se hacen inputs a mano;
      sin esto la Fase 4 no puede adoptar el primitivo sin romper la feature de tamaño.
      Añadir variante `borderless` para los inputs de búsqueda (GlobalSearch, ResponsePanel).
- [x] `ui/Checkbox.jsx` — hoy hay 6 checkboxes crudos idénticos (`w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary`).
- [x] `ui/Switch.jsx` — envolver Headless UI `Switch` para reemplazar el toggle peer-based de `TelemetrySettings`.
- [x] Barrel `ui/index.js` para importar `{ Modal, Field, Label, Button, Input, Checkbox, Switch… }` desde un punto.

**Entregable** ✅: 8 primitivos en `ui/` + barrel. Nota: `Input` pasó a ser
size-aware y adoptó el lenguaje visual de `Select` (`bg-background`, `rounded`,
anillo de foco `ring-2`), por lo que los consumidores actuales de `<Input>` ven
una normalización leve — es intencional (converge con los `<select>` contiguos).
Build y lint sin regresiones.

---

## Fase 1 — Unificar el modal de proyecto (crear/editar) [caso disparador] ✅

- [x] Extraer `components/ProjectFormDialog.jsx` con prop `mode="create"|"edit"`
      que reciba `initialValues`, `onSubmit`, `isOpen`, `onClose`, usando
      `Modal` + `Field` + `Input`/`Textarea`.
- [x] Reemplazar los dos bloques duplicados en `views/Home.jsx` por un único
      `<ProjectFormDialog>`; el título y el label del botón dependen de `mode`.
- [x] Verificar: crear navega al proyecto nuevo; editar persiste nombre/descripción.

**Entregable** ✅: `Home.jsx` pasó de 322 → 231 líneas (−91). El diálogo ahora tiene
foco inicial y cierre con Escape (gratis vía `Modal`). Build/lint sin regresiones
(38 problemas, −1 respecto al baseline por un `input` sin usar eliminado).

---

## Fase 2 — Migrar modales Headless UI existentes al primitivo `Modal` ✅

Ya usan `Dialog`, sólo hay que quitarles el boilerplate de panel/overlay.

- [x] Tanda 1 (simples): `ConfirmDialog`, `ShortcutsHelp`, `FolderVariablesModal`,
      `CopyFormatModal` → `<Modal>`.
- [x] Tanda 2 (layout propio): `EnvironmentManager`, `CookieManager`,
      `CollectionRunner`, `OpenAPIImportModal`, `ImportCurlModal`, `GlobalSearch`
      → `<Modal>`. Se añadió la prop `align="top"` al primitivo para el
      command-palette de `GlobalSearch`.
- [x] Overlay normalizado: eliminados los `bg-black/50` divergentes
      (FolderVariablesModal, EnvironmentManager, CookieManager) y los paneles
      `bg-background` pasan a `bg-card`. Todos comparten `bg-background/80 backdrop-blur-sm`.

**Entregable** ✅: un solo lugar (`ui/Modal.jsx`) define overlay, centrado y chrome
del panel para los 10 diálogos. Build/lint sin regresiones (38 problemas, solo
warnings/errores legacy preexistentes).

---

## Fase 3 — Migrar modales hechos a mano (raw `div`) a `Modal` ✅

Ganan focus-trap, cierre con Escape y accesibilidad "gratis".

- [x] `SettingsModal` → `<Modal size="2xl">` (el `2xl` mapea exacto a `max-w-2xl lg:max-w-4xl`); se conserva su layout de sidebar/header/footer.
- [x] `request-builder/HistoryDrawer` → nuevo primitivo `ui/Drawer.jsx` (panel lateral full-height sobre Headless UI `Dialog`), no un modal centrado. Ahora tiene focus-trap y Escape que antes le faltaban.
- [~] `LanguageSelector` → **diferido a la Fase 5**: no es un modal sino un dropdown/popover anclado al botón del header (`App.jsx`). Encaja con Headless UI `Menu`/`ContextMenu` de la Fase 5, no con `Modal`.

**Entregable** ✅: no queda ningún `fixed inset-0` de modal centrado escrito a mano
(`SettingsModal`, `HistoryDrawer`). Queda solo el popover de `LanguageSelector`,
que se aborda como menú anclado en la Fase 5. Build/lint sin regresiones (38).

---

## Fase 4 — Unificar campos de formulario e inputs sueltos ✅

Depende de la Fase 0 (Input size-aware + Checkbox + Switch). Los inputs hechos a mano
no son sólo "sueltos": tienen **diferencias reales de apariencia** respecto al primitivo.

### Diferencias concretas medidas (input de texto a mano vs primitivo `Input`)

| Propiedad | A mano (`ResponseCapturesPanel`, `FolderVariablesModal`, `EnvironmentManager`) | Primitivo `Input` |
|-----------|-------------------------------------------------------------------------------|-------------------|
| Radio de borde | `rounded` (0.25rem) | `rounded-md` (0.375rem) |
| Fondo | `bg-background` | `bg-transparent` |
| Foco | `focus:ring-1` (aparece con clic de ratón) | `focus-visible:ring-1` (sólo teclado) |
| Sombra | — | `shadow-sm` |
| Tamaño | `${inputClass}` de `useUISize` (escala) | `h-9` fijo (no escala) ← se arregla en Fase 0 |

Resultado visible: los campos a mano tienen esquinas menos redondeadas, fondo sólido y
un anillo de foco que salta al hacer clic. Tras la Fase 0 se pueden reemplazar 1:1.

### Trabajo (dos tandas)

**Tanda 1 — inputs de texto:**
- [x] `ResponseCapturesPanel` (CaptureRow), `FolderVariablesModal` (VariableRow),
      `EnvironmentManager` (VariableRow + input de nuevo entorno) → `<Input>`.
- [x] Búsqueda borderless: `GlobalSearch`, `ResponsePanel` → `<Input variant="borderless">`.
- [~] La edición inline de nombre de entorno (`bg-transparent border-b border-primary`)
      se deja como está: es una afordancia de subrayado distinta, no un campo estándar.

**Tanda 2 — checkbox / switch / select / label:**
- [x] **Switch**: `TelemetrySettings` (toggle peer-based) → `<Switch>`.
- [x] **Checkboxes**: `RequestTabs` (3×) y `OpenAPIImportModal` (2×) → `<Checkbox>`.
- [x] **Selects crudos**: `RequestBuilder` (método), `RequestTabs` (auth/apikey),
      `Project` (método) → `<Select>`/`<SelectOption>` (se elimina el token `${select}` duplicado).
- [x] **Labels**: `RequestTabs` (10) y `Project` (3) → `<Label>`.
- [~] Labels sueltas one-off (`OpenAPIImportModal`, `ImportCurlModal`, `TelemetrySettings`,
      `RequestTimeoutSelector`) quedan como `<label>`: son visualmente idénticas a `Label`
      (mismo `${text('sm')} font-medium`), bajo valor migrarlas.

**Entregable** ✅: los formularios comparten radio, fondo, foco, tamaño y estados
disabled vía primitivos. Build/lint sin regresiones (38) en ambas tandas.

---

## Fase 5 — Unificar menús contextuales ✅

- [x] Extraer `components/ui/ContextMenu.jsx` (`ContextMenu` + `ContextMenuItem`):
      encapsula el overlay click-catcher, el posicionado por cursor (`position={x,y}`),
      el `role="menu"`/`menuitem` y el teclado (`handleMenuKeyDown`). El item es
      size-aware (`menuItem`), con props `icon`/`destructive`/`disabled`.
- [x] Migrar `Home` (acciones de proyecto), `Project` (acciones de request) y
      `FolderTree` (menú de carpeta + menú de creación) a `<ContextMenu>`. El menú de
      Home gana navegación por teclado y semántica `role` que no tenía; los items de
      Home/Project pasan a size-aware (antes `text-sm` fijo).
- [x] `LanguageSelector` (dropdown del header) → Headless UI `Menu` con `anchor`,
      reemplazando el backdrop `fixed inset-0` a mano; gana teclado y cierre accesibles.

**Entregable** ✅: una sola implementación de menú contextual (`ui/ContextMenu`) para
los 4 menús + `LanguageSelector` sobre Headless UI `Menu`. Build limpio; lint 38 → 37.

---

## Fase 6 — Consolidar diálogos de confirmación ✅

- [x] Dar a `ConfirmDialog` un slot `children` opcional para detalles extra
      (hecho en la Fase 2 al migrar `ConfirmDialog` a `Modal`).
- [x] Reemplazar `request-builder/DeleteConfirmModal` por `ConfirmDialog` con el
      bloque de detalles del historial (fecha ejecución + status) pasado como `children`.
      Se elimina el archivo `DeleteConfirmModal.jsx`.
- [x] Todas las confirmaciones de borrado pasan por `ConfirmDialog` (proyectos en
      `Home`, cookies en `CookieManager`, item de historial en `RequestBuilder`).

**Entregable** ✅: un único componente de confirmación (`ConfirmDialog`) en toda la app.
Build limpio; lint 37.

---

## Orden recomendado

Fase 0 → 1 (valida el patrón con el caso que motivó todo) → 2 → 3 → 4 → 5 → 6.
Las fases 4, 5 y 6 son independientes entre sí y pueden reordenarse según prioridad.

## Resultado final (todas las fases ✅)

- **11 primitivos** en `components/ui/` + barrel: `Modal`(+Header/Body/Footer),
  `Drawer`, `ContextMenu`(+Item), `Field`, `Label`, `Input`(size-aware+borderless),
  `Checkbox`, `Switch`, `Select`, `IconButton`, `Button`, `Textarea`.
- **Un solo shell de modal** para los ~12 diálogos (antes 3 técnicas distintas);
  overlay unificado (se eliminaron los `bg-black/50`).
- **Formularios** sobre primitivos size-aware (inputs/checkboxes/switch/select/label).
- **Menús contextuales** unificados en `ContextMenu`; `LanguageSelector` sobre Headless UI `Menu`.
- **Confirmación única** (`ConfirmDialog`); `DeleteConfirmModal` eliminado.
- **`ProjectFormDialog`** unifica crear/editar proyecto (el caso disparador).
- Lint: 39 → 37 problemas (sin regresiones; se limpiaron 2 unused legacy de paso).
  Modales/drawer/menús hechos a mano ahora tienen focus-trap, Escape y teclado
  accesibles que antes les faltaban.
