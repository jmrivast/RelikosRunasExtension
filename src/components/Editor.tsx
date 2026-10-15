import { useState, type FormEvent } from 'react';
import { SAMPLE, type Config, type Inscription, type MapItem } from '../domain';
import type { RelikosService } from '../service';
import type { Run } from '../types';
export function Editor({
  item,
  existing,
  config,
  service,
  run,
  busy,
  sceneToken,
  onClose,
}: {
  item: MapItem;
  existing: Inscription | null;
  config: Config;
  service: RelikosService;
  run: Run;
  busy: boolean;
  sceneToken: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [languageId, setLanguageId] = useState(
    existing?.languageId ?? config.languages[0]?.id ?? '',
  );
  const [text, setText] = useState(existing?.text ?? '');
  const [unreadable, setUnreadable] = useState(existing?.unreadable ?? '');
  const [hideTitleFromPlayers, setHideTitleFromPlayers] = useState(
    existing?.hideTitleFromPlayers ?? false,
  );
  const [hideLanguageFromPlayers, setHideLanguageFromPlayers] = useState(
    existing?.hideLanguageFromPlayers ?? false,
  );
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState('');
  const [openedScene] = useState(sceneToken);
  function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    void run(async () => {
      try {
        await service.saveInscription(
          item.id,
          { title, languageId, text, unreadable, hideTitleFromPlayers, hideLanguageFromPlayers },
          openedScene,
        );
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      }
    }, 'Inscripción guardada.');
  }
  return (
    <section className="editor appear">
      <button className="close" onClick={onClose} aria-label="Cerrar editor">
        ×
      </button>
      <h1 id="dialog-title">{existing ? 'Editar inscripción' : 'Configurar inscripción'}</h1>
      <p className="muted">
        Objeto: {item.name} <code>{item.id}</code>
      </p>
      <form onSubmit={submit}>
        <label>
          Título
          <input
            required
            maxLength={140}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Idioma requerido
          <select value={languageId} onChange={(e) => setLanguageId(e.target.value)} required>
            {!config.languages.some((l) => l.id === languageId) && (
              <option value="">Selecciona un idioma</option>
            )}
            {config.languages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Vista de los jugadores</legend>
          <label className="check">
            <input
              type="checkbox"
              checked={hideTitleFromPlayers}
              onChange={(e) => setHideTitleFromPlayers(e.target.checked)}
            />
            Ocultar título a los jugadores
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={hideLanguageFromPlayers}
              onChange={(e) => setHideLanguageFromPlayers(e.target.checked)}
            />
            Ocultar idioma a los jugadores
          </label>
          <p className="muted small">
            Se aplica a la lectura, aunque comprendan el idioma. El DM siempre ve ambos.
          </p>
        </fieldset>
        <label htmlFor="inscription-text">Texto verdadero</label>
        <textarea
          id="inscription-text"
          required
          aria-label="Texto verdadero"
          maxLength={12000}
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <label htmlFor="inscription-unreadable">
          Escritura indescifrable personalizada <span className="muted">(opcional)</span>
        </label>
        <textarea
          id="inscription-unreadable"
          aria-label="Escritura indescifrable personalizada"
          maxLength={12000}
          rows={3}
          value={unreadable}
          onChange={(e) => setUnreadable(e.target.value)}
        />
        <p className="muted small">
          Si la dejas vacía, se generarán runas estables automáticamente.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <button className="primary" disabled={busy} type="submit">
            Guardar inscripción
          </button>
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
        </div>
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setTitle(SAMPLE.title);
            setLanguageId(SAMPLE.languageId);
            setText(SAMPLE.text);
            setUnreadable('');
          }}
        >
          Usar ejemplo de Aurill
        </button>
      </form>
      {existing && (
        <div className="remove-area">
          {confirmRemove ? (
            <>
              <p>Se quitará la inscripción; la imagen seguirá en el mapa.</p>
              <div className="actions">
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => {
                    void run(async () => {
                      await service.removeInscription(item.id, openedScene);
                      onClose();
                    }, 'Inscripción desvinculada.');
                  }}
                >
                  Confirmar eliminación
                </button>
                <button onClick={() => setConfirmRemove(false)}>Conservar inscripción</button>
              </div>
            </>
          ) : (
            <button className="text-button danger" onClick={() => setConfirmRemove(true)}>
              Quitar inscripción del objeto
            </button>
          )}
        </div>
      )}
    </section>
  );
}
