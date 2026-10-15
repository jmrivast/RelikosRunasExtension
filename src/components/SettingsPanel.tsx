import { useState } from 'react';
import type { Settings } from '../domain';
import type { RelikosService } from '../service';
import type { Run } from '../types';
export function SettingsPanel({
  settings,
  service,
  run,
  busy,
}: {
  settings: Settings;
  service: RelikosService;
  run: Run;
  busy: boolean;
}) {
  const [fontSize, setFontSize] = useState(settings.fontSize);
  const [animate, setAnimate] = useState(settings.animate);
  return (
    <section>
      <h2>Configuración</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            () => service.saveSettings({ version: 1, fontSize, animate }),
            'Configuración guardada.',
          );
        }}
      >
        <label>
          Tamaño del texto de lectura
          <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
            {[16, 17, 18, 19, 20, 21, 22, 23, 24].map((n) => (
              <option key={n} value={n}>
                {n} px
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={animate} onChange={(e) => setAnimate(e.target.checked)} />
          Animación de aparición
        </label>
        <p className="muted small">
          Se respetan las preferencias de movimiento reducido del dispositivo.
        </p>
        <button className="primary" disabled={busy}>
          Guardar configuración
        </button>
      </form>
      <div className="notice">
        <h3>Secretos de la mesa</h3>
        <p>
          Los permisos restringen la lectura en la interfaz. El texto se guarda en metadatos
          compartidos y no está cifrado: puede consultarse con herramientas técnicas.
        </p>
      </div>
    </section>
  );
}
