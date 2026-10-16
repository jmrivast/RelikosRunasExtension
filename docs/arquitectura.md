# Arquitectura y referencias

Revisión realizada el 15 de octubre de 2026. Dependencias efectivas en `package-lock.json`; SDK instalado: `@owlbear-rodeo/sdk` 3.1.0. No se usan métodos supuestos: las llamadas de producción compilan contra sus declaraciones TypeScript reales.

## Investigación de extensiones en GitHub

Se inspeccionó el código, además del README, de tres proyectos. Se adoptaron patrones de integración, sin copiar sus implementaciones ni recursos gráficos.

| Proyecto y revisión consultada | Archivos inspeccionados | Aplicación en Relikos |
|---|---|---|
| [Initiative Tracker](https://github.com/owlbear-rodeo/initiative-tracker/tree/9cb103fd7874d808501251f9aee5c0349ff65c9e) · oficial | `src/PluginGate.tsx`, `src/InitiativeTracker.tsx`, `public/manifest.json` | Esperar disponibilidad y readiness, validar metadatos desconocidos, filtros de menú, actualizar únicamente la clave propia en el draft del objeto, escuchar cambios de rol e ítems. |
| [Colored Rings](https://github.com/owlbear-rodeo/colored-rings/tree/4f8e751e15775c4f0f616fc9f02d676e1917021b) · oficial | `src/background.ts`, estructura multipágina y README | Una página de fondo registra el menú; abrir/cerrar el panel no registra interacciones adicionales. |
| [Battle Board](https://github.com/MissingLinkDev/battle-board/tree/48eee500d31436d12f6343f6c00fbfb463a6c4bd) · comunidad | `src/hooks/useRole.ts`, `src/hooks/useSceneStateSync.ts`, `src/components/SceneState.ts`, `src/main.tsx`, `src/hooks/useContextMenu.ts` | Separar hooks y lógica del componente; ajustes de sala para persistir entre escenas; cleanup de listeners; ignorar respuestas async tras desmontaje; derivar las inscripciones de objetos existentes. Su hook `useContextMenu` maneja un menú HTML, no el menú SDK: no se confunden ambas APIs. |

Los ejemplos no sustituyen la documentación actual ni las firmas del SDK instalado. Las muestras oficiales antiguas usan otros paquetes visuales; Relikos mantiene su propio CSS.

## Fuentes oficiales contrastadas

- [Inicio](https://docs.owlbear.rodeo/extensions/getting-started/), [APIs y onReady](https://docs.owlbear.rodeo/extensions/apis/).
- [Player](https://docs.owlbear.rodeo/extensions/apis/player/) y [Party](https://docs.owlbear.rodeo/extensions/apis/party/).
- [Scene](https://docs.owlbear.rodeo/extensions/apis/scene/), [Items](https://docs.owlbear.rodeo/extensions/apis/scene/items/), [Room](https://docs.owlbear.rodeo/extensions/apis/room/).
- [Context Menu](https://docs.owlbear.rodeo/extensions/apis/context-menu/), [Tool](https://docs.owlbear.rodeo/extensions/apis/tool/), [Modal](https://docs.owlbear.rodeo/extensions/apis/modal/), [Viewport](https://docs.owlbear.rodeo/extensions/apis/viewport/).
- [Manifest](https://docs.owlbear.rodeo/extensions/reference/manifest/), [Metadata](https://docs.owlbear.rodeo/extensions/reference/metadata/), [Filters](https://docs.owlbear.rodeo/extensions/reference/filters/).

La documentación describe un retorno de cancelación para `OBR.onReady`, pero el SDK 3.1.0 instalado declara `void` y utiliza un listener de una sola ejecución. Relikos sigue el paquete real. Las suscripciones `onChange` sí se cancelan. Se comparte una sola suscripción de readiness por adaptador para evitar que un `unsubscribe` invalide otra escucha del mismo evento SDK.

## Capas

- `domain.ts`: esquemas Zod v1, permisos, normalización de identidad y runas deterministas. No depende de React ni Owlbear.
- `service.ts`: validación y comprobación del rol antes de todas las escrituras; límite preventivo de metadatos de sala.
- `adapter.ts`: contrato pequeño de la integración.
- `owlbear.ts`: llamadas reales al SDK, parche por clave, actualizaciones Immer, modales exclusivamente locales, control de escena mediante generación local de readiness.
- `background.ts`: dos menús contextuales de objeto, sin herramientas ni modos de inspección. Esta es la única página que registra interacciones. Limpieza al recargar/cerrar; rollback de registros ante fallo parcial.
- `demo.ts`: adaptador local de pruebas con tres IDs, localStorage compartido entre pestañas y navegación independiente por pestaña. Solo se carga en desarrollo con `?demo=1`; queda eliminado del build de producción.
- `useSession.ts`: sincronización reactiva con revisión incremental; descarta resultados antiguos y cancela suscripciones.
- `components/`: lector, editor, listas y formularios. Un `dialog` nativo gestiona foco, Escape y navegación de teclado.

## Almacenamiento

Namespace: `com.relikos.runas-antiguas`.

| Ubicación | Clave | Contenido |
|---|---|---|
| Objeto de escena | `/inscription` | `{version,id,objectId,title,languageId,text,unreadable?}` |
| Sala | `/language/{id}` | `{version,id,name}` |
| Sala | `/player/{playerId}` | `{version,playerId,displayName,character,languageIds}` |
| Sala | `/settings` | `{version,fontSize,animate}` |
| Navegador del DM | `/private-note/[roomId,playerId,itemId]` | Nota local de texto; nunca entra al transporte compartido |
| Token de personaje | `/token-player` | ID de la cuenta asignada en esta escena |
| Copia local de runa | `/local-rune` | ID del objeto original; no se persiste en la escena compartida |

Cada clave anterior lleva el namespace completo como prefijo. Las escrituras no reenvían el conjunto de metadatos: solo parchean una clave propia. El borrado de una inscripción elimina únicamente esa propiedad del objeto. Los perfiles se separan por ID para que guardar a un jugador no sobrescriba a otro.

Desde 1.3.0, el objeto admite los campos opcionales `hideTitleFromPlayers`, `hideLanguageFromPlayers`, `partialText` y `revelations: [{playerId,displayName,mode: 'partial'|'full'}]`, compatibles con registros anteriores. La lectura completa del GM, por idioma o por revelación completa tiene prioridad; después se evalúa una revelación parcial válida y, en último lugar, la escritura indescifrable. Las concesiones son aditivas y se identifican por cuenta, nunca por nombre. El servicio valida destinatarios únicos y plantillas completas antes de escribir.

Los fragmentos entre `[[` y `]]` en `partialText` se sustituyen por runas deterministas; texto mal formado falla cerrado. El lector utiliza texto de React, sin interpretar HTML. Las notas privadas se guardan mediante `privateNotes.ts`, bajo una clave local compuesta por `OBR.room.id`, ID del DM e ID real del objeto. La escritura revalida rol, sala, escena y existencia del objeto. Si el almacenamiento está bloqueado o lleno, el editor muestra el fallo sin marcar la nota como guardada. No hay sincronización entre dispositivos; no se envían las notas al SDK. No constituyen una bóveda cifrada frente a personas con acceso al mismo perfil del navegador.

Desde 1.4.0, `proximity?: {radiusFeet: 10, restoreVisible: boolean}` es opcional en la inscripción v1. El adaptador oculta la imagen original en la misma actualización de metadatos; al desactivar/quitar recupera la visibilidad anterior. La asignación se guarda únicamente en la clave propia del token de la escena, validando rol GM, capa Personaje, existencia, cuenta y generación de escena. Un cambio de token elimina las otras asignaciones de esa cuenta en la escena sin tocar metadatos ajenos.

`proximity.ts` calcula un radio euclídeo estricto configurable `< radiusFeet` con los centros de `getItemBounds`, DPI y escala real (pies o metros). `localRunes.ts` crea representaciones mediante `OBR.scene.local` solo para la cuenta cuyo token visible asignado está cerca. Mantiene el ID original en los metadatos de la copia para resolver el menú hacia el objeto canónico; retira copias lejanas, duplicadas o sin fuente. Nunca elimina objetos locales ajenos. Un controlador serializa y agrupa cambios de objetos, cuadrícula, sala, rol y escena, descarta snapshots obsoletos y limpia ante error o desmontaje. No utiliza broadcast ni herramientas de inspección.

El adaptador vuelve a validar el acceso al abrir el modal, y el lector reacciona a distancia/asignación para retirar el contenido y cerrarse al perder proximidad. La comprensión por idioma/revelación sigue siendo una comprobación independiente. El DM conserva acceso sin distancia. No se calcula línea de visión ni se interpreta la niebla de Smoke & Spectre; el alcance de esta regla es únicamente distancia, según indica el editor.

Telikari antiguo es el valor inicial mientras no haya entrada explícita; se persiste al renombrarlo/guardarlo. Los perfiles siempre se almacenan por ID, nunca por el nombre o por `connectionId`. El ID identifica a la cuenta y se conserva al reconectar con esa misma cuenta; invitado, cuenta distinta, otra sala o datos borrados requieren revisar la asignación. No se promete identidad entre cuentas.

El ID canónico de inscripción es `runa:{ID real del objeto}`. Al leer una copia se normalizan `id` y `objectId` sobre la copia real; al guardar se persiste la identidad normalizada. Un objeto duplicado hereda el contenido pero se edita independientemente. Al eliminar el objeto desaparece su inscripción porque no existe un registro paralelo que quede huérfano. El catálogo es exclusivo del DM; el hub de jugadores no revela existencia ni cantidades de inscripciones. Los jugadores abren la lectura desde el menú contextual del objeto seleccionado. La visibilidad bajo niebla y la selección siguen dependiendo de Owlbear; esta interfaz no constituye un sistema de descubrimiento ni de autorización por distancia.

## Límites y concurrencia

- Los permisos son de interfaz, no criptográficos. Los clientes reciben los metadatos. React muestra contenido como texto; no se usa HTML narrativo ejecutable.
- La sala tiene un límite total de 16 kB, compartido con las otras extensiones. Se rechazan escrituras cuya estimación alcanza 15.5 kB. El SDK puede rechazar antes si cambian simultáneamente otros datos; se muestra el error. Las inscripciones admiten hasta 12 000 caracteres y van en el objeto, no en la sala.
- Versiones desconocidas y datos inválidos fallan sin conceder permisos. Se muestran avisos al DM; no se reescriben datos dañados automáticamente. El DM puede reconfigurar el objeto.
- El SDK no ofrece transacciones compare-and-swap para esta configuración. Dos DMs que guardan simultáneamente el mismo perfil, idioma o inscripción tienen semántica de última escritura. Se recomienda coordinar ediciones. Distintos lectores no escriben nada.
- Los borradores del editor conservan el token de escena original. Un cambio de escena o eliminación del objeto impide guardar en un destino incorrecto. El SDK no expone un ID de escena en la API usada: el token es una generación local de readiness, no un supuesto método `getSceneId`.
- No hay registro duplicado por render de React ni mensajes globales. `modal.open` se llama desde la interacción del cliente; no se utiliza broadcast.
- Los permisos sobreviven al cambio de escena dentro de una sala. Otra sala tiene su propia configuración. El contenido acompaña al objeto cuando se guarda/duplica la escena.
- La comprobación definitiva del transporte, sincronización y persistencia de Owlbear requiere cuentas reales; las pruebas simuladas no la sustituyen.

### Visibilidad por destinatarios (1.5.0)

`inscription.visibility` es opcional y contiene `players` (ID y nombre de presentación) y `restoreVisible`. Su ausencia mantiene compatibilidad con inscripciones anteriores. Una lista vacía equivale a solo DM. `canAccessItem` comprueba primero el destinatario y después el radio opcional; con destinatarios y sin radio permite copias sin exigir token. El lector y el adaptador usan la misma condición. El renderizador continúa escribiendo exclusivamente en `scene.local`.

`proximity.radiusFeet` admite números finitos entre 0.1 y 100000. `restoredVisibility` conserva el estado original al alternar reglas; el servicio calcula ese estado de nuevo, sin confiar en el formulario. La ocultación del original y los metadatos se escriben en una sola actualización del SDK. Las reglas de idioma/revelación permanecen independientes.

Las inscripciones con `visibility` usan `version: 2`; sin ese campo conservan `version: 1`. El esquema exige esa correspondencia. El menú admite ambas versiones. Los clientes 1.4 rechazan v2 antes de crear una copia, en lugar de descartar silenciosamente la restricción desconocida.
