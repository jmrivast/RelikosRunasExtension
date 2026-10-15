# Diseño de Relikos

Referencia original generada con la herramienta integrada Image Gen: `concept.png`.

Prompt: dos superficies completas, lector de 560 px y administración de 650 px; interfaz española de Relikos — Runas Antiguas, fondo casi negro, marco de metal antiguo, serif, texto marfil, oro tenue y azul hielo. Inscripciones, Jugadores, Idiomas y Configuración; ejemplo de Aurill proporcionado por el usuario. Sin recursos de videojuegos ni lore adicional.

La implementación usa texto y controles HTML, icono SVG original y texturas procedurales CSS. La imagen de concepto no es un fondo de la aplicación.

| Elemento | Regla |
|---|---|
| Fondo | `#101315`, exterior `#090c0e` |
| Texto | `#e5dece` |
| Títulos y ornamentos | `#c8ae7d` |
| Marco | `#70624a`, doble línea y pequeños rombos |
| Acento | `#93bdc9` |
| Tipografía | Georgia/Times; controles administrativos con etiquetas system-ui |
| Runas | Noto Sans Runic incluida localmente, SIL OFL |
| Lector | Hasta 580 px, padding 42 px; 24 px en móvil |
| Animación | 260 ms; desactivada con movimiento reducido o configuración |
| Contenedores | Una ventana, listas abiertas, formularios; sin rejilla de tarjetas |
| Navegación | Cuatro pestañas, línea azul para sección activa |

Extensiones funcionales respecto al concepto: botones para configurar el objeto, IDs de los objetos, controles de formularios, estados vacíos, errores y barra explícita del simulador. El texto de Aurill conserva exactamente el contenido suministrado; no se fuerzan los tres párrafos que produjo la imagen. Texturas deliberadamente discretas para mantener legibilidad.
