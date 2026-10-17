# Verificación de la entrega

Fecha: 15 de octubre de 2026. Proyecto: Relikos — Runas Antiguas 1.0.0.

## Resultados ejecutados

La secuencia final `npm run check` terminó con código 0:

| Comprobación | Resultado |
|---|---|
| TypeScript estricto, `tsc --noEmit` | Correcto |
| ESLint y reglas de hooks | Correcto |
| Vitest | 36/36 pruebas correctas en 3 archivos |
| Playwright Chromium | 14/14 pruebas correctas, 38.6 s |
| Vite producción | Correcto, 226 módulos, ambas páginas de entrada |

Entorno: Windows, Node.js 24.14.0, npm 11.9.0, SDK Owlbear 3.1.0, React 19, Vite 8. Versiones completas fijadas en `package-lock.json`.

## Flujos comprobados

- Crear, guardar, editar y desvincular inscripciones sin eliminar la imagen ni metadatos ajenos.
- Identificación por ID, lectura del DM y de Basili; otro jugador ve únicamente runas.
- La cadena verdadera no se inserta en el DOM del lector sin permisos.
- Runas deterministas, longitud, separación de párrafos y versión manual.
- Administración inaccesible para jugadores, incluso mediante una URL directa del editor; servicios y adaptador comprueban el rol antes de escribir.
- Modales independientes por pestaña; abrir uno no abre los otros.
- Revocar/restaurar el idioma actualiza una lectura abierta en otra pestaña.
- Personajes, idiomas y configuración persisten al recargar. Un perfil desconectado conserva permisos.
- Idiomas adicionales, renombrado y acceso al formulario de asignación de lectores.
- Escena cerrada y múltiples escenas; duplicados independientes y objetos eliminados.
- Datos inválidos, versiones no compatibles, nombres duplicados, objeto inexistente, escena cambiada y límite de sala.
- Limpieza de suscripciones, registro único en el fondo, callbacks de menú/herramienta y manifiesto conforme a los campos oficiales.
- Texto largo con scroll, cierre por ×/botón/Escape, móvil y movimiento reducido.

## Verificación visual

Se usó Playwright porque el plugin Browser no estaba disponible. El intento posterior de acceso al navegador del usuario para Cloudflare falló en la política de cabeceras del runtime; la publicación se realizó por Wrangler autorizado por el usuario. No se reutilizó ni extrajo la sesión del navegador.

URL de prueba: `http://localhost:5173/?demo=1`. Viewports: 960 × 900 y 375 × 740. Capturas de las ventanas a su tamaño real: administración de 680 px y lector de 580 px. La prueba comprueba identidad de página, contenido significativo, ausencia de overlay Vite, ausencia de errores JavaScript/consola y respuesta de los controles.

Se inspeccionaron con `view_image` tanto `docs/design/concept.png` como las capturas finales `admin.png`, `reader.png`, `runes.png` y `mobile.png` guardadas fuera del repositorio en la carpeta de visualizaciones de esta conversación.

| Comparación con el concepto | Resultado y ajuste |
|---|---|
| Fondo | Negro azulado y ruido procedural discreto; se sustituyeron las rayas diagonales iniciales por textura de ceniza SVG. |
| Marco | Doble borde fino en metal dorado envejecido y rombos de esquina. Ornamentación más simple que la imagen. |
| Tipografía | Serif de sistema y jerarquía título/texto; etiquetas administrativas sans serif. La fuente concreta depende del sistema. |
| Color | Marfil, oro apagado y azul hielo según los tokens del concepto. |
| Lector | Emblema centrado, título, idioma, separador y controles discretos de cierre; texto legible y scroll. |
| Administración | Cuatro secciones, listado de inscripciones y acciones Leer/Editar, sin rejilla genérica de tarjetas. |
| Móvil | Se reordena la fila de acciones; el título envuelve sin desbordamiento horizontal. |

Se verificó la fidelidad al sistema visual, con estas diferencias intencionadas respecto al mockup: texto exacto de Aurill en su párrafo original, sin inventar saltos narrativos; marco simplificado; información del objeto y controles adicionales necesarios para el funcionamiento. No se afirma una coincidencia de píxeles con una imagen generada.

## Diferencia entre simulación y prueba real

Las 14 pruebas de navegador usan `DemoAdapter`: tres IDs simulados y almacenamiento local compartido entre pestañas. Las pruebas del adaptador real simulan las respuestas del transporte SDK; la comprobación de tipos utiliza las declaraciones del paquete instalado. El manifiesto se valida localmente según la estructura oficial, no mediante una certificación de Owlbear.

**Sí se ejecutó una prueba parcial autenticada dentro de Owlbear**, el 15 de octubre de 2026, desde el navegador integrado de Codex en Windows. Se instaló y habilitó el manifiesto de producción, se importó la imagen de la runa, se configuró el ejemplo exacto de Aurill con el panel cerrado y se leyó mediante el menú contextual. Después de recargar toda la sala, la extensión siguió activa y el panel conservó la inscripción; abrirla desde allí volvió a mostrar el texto correcto. Esto comprueba la carga de fondo, el transporte SDK y la persistencia del contenido tras recarga para ese flujo. La captura `owlbear-instalado.jpg` quedó fuera del repositorio en la carpeta de visualizaciones de esta conversación.

Las conexiones presentes tenían rol DM. Permanecen por comprobar con cuentas de jugador distintas los permisos, la revocación en vivo y el aislamiento entre clientes, además de objetos bloqueados, cambios de escena y una salida/reentrada completa. La guía `verificacion-manual.md` distingue estos casos de lo ya ejecutado. No se verificaron Safari, Firefox ni dispositivos físicos.

La publicación HTTPS se verifica por separado mediante respuestas del sitio y recursos desplegados. Eso tampoco sustituye la prueba dentro de Owlbear.

## Publicación verificada

- Producción: <https://relikos-runas-antiguas.pages.dev>.
- Manifiesto instalable: <https://relikos-runas-antiguas.pages.dev/manifest.json>.
- Deployment: <https://629059f8.relikos-runas-antiguas.pages.dev>.
- Comprobado el 15 de octubre de 2026 a las 11:57, hora de Bolivia.

Los siete recursos comprobados (`manifest.json`, `index.html`, `background.html`, `icon.svg`, `runa-relikos.png`, fuente rúnica y textura) respondieron 200 con MIME correcto. Sus SHA-256 coinciden con los archivos locales de `dist/`. Se verificaron CORS `*` y CSP `frame-ancestors` que permite Owlbear y sus subdominios.

Una sesión Chromium nueva abrió el sitio público: título correcto, instrucciones para instalar, sin errores de consola. El parámetro `?demo=1` no activa el adaptador de pruebas en producción ni muestra administración fuera de Owlbear. El reporte HTTP y la captura `production.png` se guardaron en la carpeta de visualizaciones de esta conversación.

Wrangler 4.151 intentó delegar inicialmente la creación de Pages hacia Workers y falló antes de publicar. Se creó el proyecto directamente en Pages con la opción de creación `--force`; el despliegue posterior normal subió 13 recursos y `_headers` correctamente. No se crearon Workers, bases de datos ni servicios privados. La CLI quedó autorizada por el usuario con lectura de cuenta/usuario y escritura en Pages.

La publicación fue por carga directa con Wrangler. El repositorio Git conserva el código, pero no se configuró integración automática Git → Cloudflare; para actualizar hay que compilar y volver a ejecutar el comando de despliegue.
## Prueba real de proximidad — 16 de octubre de 2026

Se creó desde el prop una inscripción independiente, «PRUEBA · Proximidad 10 pies», fuera de los mapas preparados. Objeto: `0cd07e30-2306-4b99-a1da-58e5c552f769`. Se creó un segundo prop, se cambió a la capa Personaje y se asignó a Specter únicamente para la prueba: `c945f069-abfa-43d3-b70e-994d7d13d6f8`. No se modificaron las cuatro inscripciones originales ni los permisos de idioma.

Se observó la representación local en la cuenta del jugador con el token cercano y el original atenuado para el DM. El cambio de tamaño del original también se reflejó en esa representación. La automatización no consiguió validar de forma concluyente la apertura y retirada en directo, debido a problemas de selección y sincronización. Posteriormente, el usuario realizó personalmente la prueba en Owlbear y confirmó que funciona bien. La validación funcional final procede de esa prueba manual del usuario.

Se descartó y revirtió un experimento que reutilizaba el ID del original para la copia local. La publicación restaurada `7028e3c8` corresponde nuevamente al código de `12e7848` y conserva UUID independientes. Tras la confirmación del usuario se comprobó de nuevo producción: manifiesto 1.4.0 y `background.html` con respuesta HTTP 200, enlazando `background-CdVdvaqq.js` y `owlbear-DrAKu1O_.js`. Las 61 pruebas unitarias y 30 de navegador son evidencia adicional simulada, distinta de la prueba manual real.

## Visibilidad individual y distancia configurable — 1.5.0

El 16 de octubre de 2026 pasaron TypeScript, ESLint, compilación, 67 pruebas unitarias y 33 pruebas Chromium. Los casos nuevos verifican destinatarios por cuenta sin token, combinación con proximidad de 20 pies, cambio en directo a 12,5 pies, cierre al revocar acceso, destinatarios desconectados, persistencia y restauración de la visibilidad original. El protocolo de metadatos 2 impide que clientes antiguos interpreten una inscripción restringida como pública. Las inscripciones anteriores conservan su configuración.

Se inspeccionó la captura móvil de los controles nuevos, sin desbordamiento horizontal. También pasaron las comprobaciones existentes de consola, idiomas, revelaciones, notas privadas y ausencia de franjas negras. Browser plugin no estaba disponible; se usó Playwright. Estas pruebas utilizan DemoAdapter o transporte SDK simulado: no equivalen a una nueva prueba entre cuentas reales dentro de Owlbear. La comprobación manual del usuario indicada arriba corresponde a 1.4.0. Tras actualizar hay que recargar Owlbear en todas las cuentas.


## Confirmación real de 1.5.0

El 16 de octubre se comprobó en la cuenta Specter la inscripción de prueba «Check de lenguaje»: al seleccionarla como destinataria, apareció la copia local y el menú Leer inscripción abrió el contenido, manteniendo título e idioma ocultos. Al retirar esa cuenta se eliminó la copia y se cerró la lectura. Se restauró OBS como único destinatario. Después el usuario confirmó que funciona. La ausencia inicial de mapa en la observación automatizada fue una vista descentrada, no una prueba de fallo de carga.

## Imágenes — 1.6.0

El 16 de octubre pasaron `npm run check`: TypeScript, ESLint, 72 pruebas unitarias, 37 pruebas de navegador Chromium y compilación. Los cuatro nuevos flujos prueban imagen complementaria con persistencia, cambio de posición, ampliación a 2400 píxeles originales y regreso al texto; imagen sola sin texto, título, idioma ni ornamentos, destinatarios, revocación y adaptación móvil; ausencia de solicitudes de imagen para cuentas sin comprensión completa y retirada al revocar idioma; error de carga y recuperación mediante Reintentar.

Se inspeccionaron las capturas de Solo imagen en 960×900 y 390×844, guardadas fuera del repositorio en la carpeta de visualizaciones de esta conversación. El selector `OBR.assets.downloadImages(false)` y el tamaño de la ventana del SDK están verificados mediante transporte simulado y declaraciones oficiales. Browser plugin no estaba disponible: los flujos nuevos utilizan Playwright con DemoAdapter e imagen de prueba determinista de 2400×1600. No se ha ejecutado todavía el selector ni los modos multimedia entre cuentas reales de Owlbear; estas comprobaciones no sustituyen esa prueba. Las 33 pruebas de navegador anteriores siguen pasando. No se añaden dependencias, alojamiento de archivos ni modificaciones a los mapas preparados.
