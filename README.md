# Relikos — Runas Antiguas

Extensión para Owlbear Rodeo 2.0 de **Las Crónicas de Relikos: Hijos del Caos**. El DM convierte objetos del mapa en inscripciones; cada jugador lee el texto verdadero solo si su ID de cuenta tiene el idioma correspondiente. El DM siempre puede leer y editar.

Ventana original de fantasía oscura con fondo de piedra y ceniza, bordes de metal envejecido, títulos dorados, texto marfil y acentos azul hielo. Adaptable a móvil, con desplazamiento, Escape y movimiento reducido. Sin backend.

## Estado de entrega

Código fuente, pruebas, manifiesto, icono original y fuente rúnica local incluidos. La carpeta local `dist/` contiene la compilación estática (se genera con `npm run build` y se excluye de Git). Publicado y verificado por HTTPS en Cloudflare Pages: [manifiesto de instalación](https://relikos-runas-antiguas.pages.dev/manifest.json). Código: [RelikosRunasExtension](https://github.com/jmrivast/RelikosRunasExtension). **Todavía falta la verificación dentro de una sala autenticada de Owlbear.** Consulta `docs/verificacion.md` para resultados y `docs/verificacion-manual.md` para la prueba con cuentas reales.

## Desarrollo local

Requiere Node.js 22.12 o posterior compatible con Vite 8; se verificó con Node 24.14.0 y npm 11.9.0. En PowerShell puedes usar `npm.cmd` si la política de ejecución bloquea `npm.ps1`.

```sh
npm install
npm run dev
```

Abre `http://localhost:5173/?demo=1` para el **SDK simulado**. Hay enlaces DM, Basili y Otro jugador. Comparten los datos de prueba de este navegador, pero cada pestaña abre y cierra sus propios modales. El DM dispone de controles para cambiar de escena, desconectar a Basili, duplicar/eliminar el objeto y restablecer los datos. Estos controles no existen en producción.

Para desarrollo real, agrega temporalmente en Owlbear el manifiesto `http://localhost:5173/manifest.json`. Mantén el servidor abierto. Los navegadores suelen tratar localhost como contexto confiable, pero sus políticas de contenido mixto o de acceso a red local pueden bloquear el iframe o pedir permiso. Si sucede, publica un preview HTTPS en Cloudflare Pages; no hace falta desactivar globalmente la seguridad del navegador. Los demás jugadores no acceden a tu localhost: necesitan el mismo alojamiento HTTPS accesible por todos.

Vite permite CORS desde `https://owlbear.rodeo` y sus subdominios. En producción, `public/_headers` habilita `Access-Control-Allow-Origin: *` y permite que Owlbear enmarque la aplicación. No agregues `X-Frame-Options: DENY/SAMEORIGIN` ni una política que impida esos iframes.

## Publicar en Cloudflare Pages

No se necesitan claves de API de Owlbear. El alojamiento solo sirve archivos estáticos.

```sh
npm run build
npx wrangler login
npx wrangler whoami
npx wrangler pages project create relikos-runas-antiguas --production-branch main --force
npm run deploy -- --branch main
```

El proyecto de esta entrega ya existe: para actualizar basta compilar y ejecutar `npm run deploy -- --branch main`. La creación es de una sola vez; omítela si ya existe. En Wrangler 4.151, `--force` en la creación elige Pages directamente y evita su delegación automática a Workers; no se necesita en despliegues posteriores. Si ese nombre no está disponible, usa otro nombre en `package.json` y `wrangler.jsonc` y en el comando de creación. No compartas tokens en el chat. También puedes subir **el contenido de `dist/`**, no el código fuente ni `node_modules`, mediante Direct Upload en Cloudflare Pages. La configuración ya incluye las cabeceras necesarias y no necesita Functions ni base de datos.

Wrangler mostrará la dirección HTTPS real. Verifica en el navegador que su ruta `/manifest.json` responde con JSON, que `/index.html` y `/background.html` cargan y que `/icon.svg` es accesible. Usa el dominio estable de producción para instalar; las URLs de previews cambian. No cambies de origen al actualizar: Owlbear puede mantener referencias a URLs antiguas.

## Instalar en Owlbear

1. Publica `dist/` y comprueba la URL real del manifiesto HTTPS.
2. En Owlbear abre la administración de extensiones y añade una extensión personalizada mediante esa URL, terminada en `/manifest.json`.
3. Actívala en la sala de Relikos. Abre un mapa y entra como DM.
4. Abre **Relikos — Runas Antiguas** desde el menú de extensiones. Los jugadores de la sala también deben tener la extensión habilitada/cargada.

Los nombres exactos de los menús de Owlbear pueden variar con su idioma o futuras versiones.

## Configurar a Basili

1. Pide al jugador que entre con su cuenta habitual.
2. Como DM, abre **Jugadores** → **Jugadores e idiomas**.
3. Busca su nombre visible y verifica su **ID**. Escribe `Basili` en el personaje.
4. Marca **Telikari antiguo** y pulsa **Guardar jugador**.

El nombre solo sirve para reconocerlo. La autorización usa su ID de Owlbear. Si se desconecta, su perfil permanece en la lista; puedes cambiar sus idiomas sin que esté conectado. Si entra con otra cuenta debes asignar el nuevo ID.

## Crear y editar una inscripción

1. Importa una imagen de runa y colócala en una pared. Se incluye `public/runa-relikos.png` como recurso original transparente; puedes usar cualquier imagen propia.
2. Selecciona **un solo objeto** y usa **Configurar inscripción** en su menú contextual. También puedes pulsar **Configurar objeto seleccionado** en el panel.
3. Completa título, idioma y texto verdadero. La escritura indescifrable personalizada es opcional; al dejarla vacía se generan símbolos deterministas respetando espacios y párrafos.
4. En **Vista de los jugadores**, marca **Ocultar título a los jugadores** y/o **Ocultar idioma a los jugadores** si quieres mostrar solo la escritura. Son opciones independientes por inscripción, incluso para lectores que comprendan el idioma. El DM conserva ambos datos y el catálogo completo. Las inscripciones anteriores mantienen su presentación hasta que cambies estas opciones.
5. Pulsa **Guardar inscripción**.

El editor ofrece **Usar ejemplo de Aurill**, con el texto proporcionado en el encargo. No crea objetos ni añade lore automáticamente a escenas reales.

En **Inscripciones** se lista cada registro de la escena actual con su objeto e ID. **Editar** vuelve a abrirlo. **Quitar inscripción del objeto** pide una confirmación local y conserva la imagen y los metadatos de otras extensiones. Duplicar la imagen copia su contenido inicial; después ambas inscripciones se editan independientemente. Eliminar el objeto elimina también su inscripción.

## Leer como jugador

Selecciona el objeto del mapa y elige **Leer inscripción** en su menú contextual. La ventana se abre únicamente en tu cliente. Puedes cerrarla con ×, **Cerrar** o Escape y abrirla otra vez. El hub del jugador muestra únicamente un aviso de panel reservado al DM: no enumera inscripciones, títulos, idiomas, cantidades ni accesos de lectura. No hay herramienta ni modo especial de inspección en la barra.

Si tu ID comprende el idioma, aparece el texto verdadero; de lo contrario, runas. Revocar o conceder un idioma actualiza una lectura abierta cuando llegan los metadatos sincronizados. Los jugadores no reciben formularios de edición ni pueden modificar sus propios permisos mediante los flujos de la extensión. El DM debe permitir seleccionar el objeto para que el jugador pueda usar su menú; no se ofrece un acceso alternativo desde el hub.

## Añadir idiomas y ajustar la lectura

En **Idiomas**, crea una lengua, renómbrala conservando su ID y usa **Asignar lectores** para abrir Jugadores. El DM permanece autorizado a todas. En **Configuración** ajusta tamaño del texto y animación; los valores se guardan para la sala y todas sus escenas. Las preferencias del dispositivo de movimiento reducido tienen prioridad.

## Pruebas y compilación

```sh
npx playwright install chromium
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

`npm run check` ejecuta la secuencia completa. Playwright arranca Vite automáticamente o reutiliza un servidor accesible en el puerto 5173. Las pruebas E2E usan el adaptador simulado; las pruebas de contrato compilan contra el SDK real pero simulan el transporte. Ninguna equivale a una prueba autenticada dentro de Owlbear. Sigue `docs/verificacion-manual.md` antes de usarlo en una sesión importante.

## Actualizar

Conserva la carpeta del proyecto y `package-lock.json`. Realiza cambios, ejecuta `npm run check`, incrementa la versión de `package.json` y `public/manifest.json`, compila y publica `dist/` en **el mismo dominio**. Recarga la sala y la extensión. El esquema v1 no cambia por una actualización visual. Una futura versión de datos necesitará una migración explícita; versiones desconocidas se rechazan de forma segura.

## Problemas comunes

| Síntoma | Revisión |
|---|---|
| «Abre la extensión en Owlbear Rodeo» | Abriste la web directamente; instala el manifiesto y abre su acción en la sala. Para la demo usa `?demo=1` con `npm run dev`. |
| No aparece Configurar inscripción | Debes ser GM, seleccionar exactamente un objeto y cargar la extensión en esa sala. Recarga la sala si acabas de instalarla. |
| No aparece Leer inscripción | Guarda antes la configuración. Si hay datos inválidos, el DM verá un aviso para reconfigurar el objeto. |
| Basili ve símbolos | Comprueba el ID, el idioma de esa inscripción, **Guardar jugador** y que no esté usando otra cuenta/sala. |
| No hay escena | Abre un mapa. Puedes gestionar permisos de sala aunque no haya escena. |
| Texto cambiado no aparece | Comprueba que editaste el objeto correcto; las copias tienen identidad propia. Espera sincronización y vuelve a abrir. |
| No se puede guardar | Revisa rol, conexión, si cambió la escena o si eliminaron el objeto. El límite de sala se comparte con otras extensiones. |
| Falla el manifiesto/iframe | Verifica HTTPS público, respuesta JSON, cabeceras CORS, ausencia de bloqueo de iframes y que todos los archivos de `dist` estén publicados. |
| El puerto 5173 está ocupado | Cierra el otro servidor o reutiliza el de este proyecto; revisa que puedas abrirlo en el navegador de pruebas. |
| Glifos vacíos | Verifica `/fonts/NotoSansRunic-Regular.ttf`. La fuente se incluye localmente y no depende de Google Fonts en tiempo de ejecución. |
| Perfiles inválidos | No se conceden permisos con registros dañados. Guarda de nuevo el perfil correcto desde el DM. |

## Privacidad, alcance y límites

**Los permisos son visuales, no criptográficos.** El texto verdadero y las asignaciones viajan en metadatos compartidos de Owlbear y pueden inspeccionarse técnicamente. No hay cifrado, backend ni aislamiento contra jugadores que manipulen el SDK o las herramientas de desarrollador.

Los ajustes y perfiles pertenecen a una sala; las inscripciones al objeto de su escena. El panel lista los objetos que Owlbear entrega y excluye los ocultos para jugadores; no intenta reconstruir visibilidad por niebla. Para secretos de ubicación, mantén oculto el objeto hasta descubrirlo. Los usuarios desconectados conservan permisos. Si varios DMs editan exactamente el mismo registro simultáneamente, prevalece el último guardado; coordinen esas ediciones.

Detalles técnicos y límites: `docs/arquitectura.md`. Investigación de GitHub: misma guía, con archivos y revisiones consultadas. Noto Sans Runic se distribuye bajo SIL OFL, incluida en `public/fonts/OFL.txt`. El icono SVG y el PNG son originales del proyecto; no se usan recursos de Dark Souls ni Elden Ring.
