# Verificación real con dos o tres cuentas

El 15 de octubre de 2026 se ejecutó una **prueba parcial en una sala autenticada**, con la versión 1.0.0 publicada en <https://relikos-runas-antiguas.pages.dev>, usando el navegador integrado de Codex en Windows.

Resultados reales comprobados:

- Instalación del manifiesto y activación en la sala.
- Menú **Configurar inscripción** disponible con el panel cerrado.
- Importación de `public/runa-relikos.png`, colocación en la escena y guardado del ejemplo exacto de Aurill en Telikari antiguo.
- Lectura desde el menú contextual y desde el panel de inscripciones.
- Tras recargar toda la sala, la extensión continúa activa y la inscripción conserva su objeto, idioma y texto; vuelve a abrirse correctamente.

Se dejó el objeto de ejemplo en la escena. Las conexiones presentes eran de DM; **la prueba con cuentas de jugador distintas sigue pendiente**, junto con los casos adicionales de la lista siguiente. Las pruebas automatizadas no sustituyen esa comprobación.

Con dos cuentas puedes probar al DM y a Basili, revocando el idioma para representar al lector desconocido. Una tercera cuenta simultánea permite comprobar el aislamiento entre los tres sin cambiar permisos.

## Preparación

1. Publica `dist/` bajo HTTPS; abre `/manifest.json` y verifica su JSON.
2. Instala y habilita la extensión en una sala de prueba de Owlbear.
3. Abre la sala con el DM y otra cuenta en otro perfil de navegador. Cada una debe tener un ID distinto en Jugadores.
4. Abre una escena. Importa `public/runa-relikos.png`, colócala y comprueba que sea seleccionable por jugadores; para un objeto bloqueado usa Inspeccionar.

## Lista de aceptación

- [x] Con el panel cerrado, el DM selecciona el objeto y encuentra **Configurar inscripción**. Esto verifica la página de fondo.
- [ ] El DM usa el ejemplo de Aurill, guarda Telikari antiguo y confirma que el objeto conserva posición, imagen y demás propiedades.
- [ ] El DM ve la inscripción en el panel con el ID del objeto; puede leer y editar.
- [ ] En Jugadores, el DM asigna Basili y Telikari antiguo al ID de la segunda cuenta y guarda.
- [ ] Basili selecciona la runa y utiliza **Leer inscripción**: ve exactamente el texto verdadero.
- [ ] Mientras Basili lee, la cuenta del DM y la tercera cuenta no abren ninguna ventana.
- [ ] La tercera cuenta sin idioma ve runas, sin botones administrativos. Con dos cuentas, revoca temporalmente el idioma de Basili para comprobarlo.
- [ ] Revocar el idioma con la lectura abierta sustituye el texto; concederlo lo restaura.
- [ ] Inspeccionar abre la misma inscripción con un clic. Comprobar también un objeto bloqueado si lo usarás así en la campaña.
- [ ] Cerrar con ×, botón y Escape funciona. Reabrir conserva símbolos estables.
- [ ] Un texto de varios párrafos y uno largo respetan saltos y ofrecen scroll; el cierre es accesible en móvil.
- [ ] Duplicar el objeto crea una segunda inscripción que puede editarse sin cambiar la primera.
- [ ] Quitar inscripción elimina el menú de lectura, conserva la imagen y sus otras propiedades.
- [ ] Eliminar la imagen retira su inscripción del panel.
- [ ] Cambiar de escena no mezcla listas y conserva idiomas/perfiles. Regresar restaura las inscripciones originales.
- [ ] Sin escena abierta se muestra el aviso correcto y no fallan los formularios de sala.
- [ ] Cerrar todas las ventanas, volver a entrar con las mismas cuentas y abrir la escena conserva contenido y permisos.
- [ ] Desconectar al jugador conserva su perfil; cambiar el nombre visible no cambia la autorización.
- [ ] Cambiar de cuenta o rol no permite editar como jugador.
- [ ] No se generaron mensajes globales ni notificaciones a otros clientes.

Registra fecha, URL publicada, versión de manifiesto, navegadores y resultados. Si un filtro o interacción no aparece, revisa la consola del iframe de fondo y que no haya bloqueos de CORS/iframe; no uses la demo como evidencia de que una prueba real pasó.
