import { useState } from 'react';
import type { Identity } from '../domain';
import { loadPrivateNote } from '../privateNotes';
import type { RelikosService } from '../service';
import type { Run } from '../types';

export function PrivateNote({
  roomId,
  player,
  itemId,
  sceneToken,
  service,
  run,
  busy,
}: {
  roomId: string;
  player: Identity;
  itemId: string;
  sceneToken: string;
  service: RelikosService;
  run: Run;
  busy: boolean;
}) {
  const [initial] = useState(() => {
    try {
      return { text: loadPrivateNote({ roomId, player, itemId }), error: '' };
    } catch {
      return { text: '', error: 'El navegador no permite acceder a las notas privadas.' };
    }
  });
  const [note, setNote] = useState(initial.text);
  const [saved, setSaved] = useState(initial.text);
  const [error, setError] = useState(initial.error);
  return (
    <details className="editor-section">
      <summary>Notas privadas del DM</summary>
      <p className="muted small">
        Solo se guardan en este navegador, para tu cuenta y esta sala. No se envían a los jugadores
        ni se sincronizan con otros dispositivos. Se guardan por separado.
      </p>
      <label htmlFor="private-note">Nota privada</label>
      <textarea
        id="private-note"
        maxLength={12000}
        rows={5}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Pistas, significado y consecuencias…"
      />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="actions">
        <button
          type="button"
          disabled={busy || !!initial.error}
          onClick={() => {
            setError('');
            void run(async () => {
              try {
                await service.saveNote(itemId, note, sceneToken, roomId);
                setSaved(note);
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
                throw e;
              }
            });
          }}
        >
          Guardar nota privada
        </button>
        <span className="muted small" role="status">
          {note !== saved ? 'Nota sin guardar' : saved ? 'Nota guardada en este navegador' : ''}
        </span>
      </div>
    </details>
  );
}
