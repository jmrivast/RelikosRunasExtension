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

**No se ejecutó una sesión autenticada de Owlbear con cuentas reales.** Permanecen por verificar allí el transporte SDK, las políticas reales de selección/objetos bloqueados, la carga en segundo plano y la persistencia de sus servicios al cerrar/reabrir. La guía `verificacion-manual.md` detalla esa prueba, sin confundirla con lo automatizado. No se verificaron Safari, Firefox ni dispositivos físicos.

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
