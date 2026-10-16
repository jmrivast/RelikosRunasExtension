import { useState, type FormEvent } from 'react';
import {
  SAMPLE,
  partialReading,
  validPartial,
  type Config,
  type Identity,
  type Inscription,
  type MapItem,
} from '../domain';
import { PrivateNote } from './PrivateNote';
import type { RelikosService } from '../service';
import type { Run } from '../types';
export function Editor({
  item,
  existing,
  config,
  players,
  player,
  roomId,
  service,
  run,
  busy,
  sceneToken,
  onClose,
}: {
  item: MapItem;
  existing: Inscription | null;
  config: Config;
  players: Identity[];
  player: Identity;
  roomId: string;
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
  const [partialText, setPartialText] = useState(existing?.partialText ?? '');
  const [revelations, setRevelations] = useState(existing?.revelations ?? []);
  const [hideTitleFromPlayers, setHideTitleFromPlayers] = useState(
    existing?.hideTitleFromPlayers ?? false,
  );
  const [hideLanguageFromPlayers, setHideLanguageFromPlayers] = useState(
    existing?.hideLanguageFromPlayers ?? false,
  );
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState('');
  const [openedScene] = useState(sceneToken);
  const readers = new Map(players.filter((p) => p.role !== 'GM').map((p) => [p.id, p.name]));
  for (const profile of config.profiles)
    if (!readers.has(profile.playerId) && !players.some((p) => p.id === profile.playerId))
      readers.set(profile.playerId, profile.displayName || profile.character || profile.playerId);
  for (const reveal of revelations)
    if (!readers.has(reveal.playerId) && !players.some((p) => p.id === reveal.playerId))
      readers.set(reveal.playerId, reveal.displayName || reveal.playerId);
  function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    void run(async () => {
      try {
        await service.saveInscription(
          item.id,
          {
            title,
            languageId,
            text,
            unreadable,
            hideTitleFromPlayers,
            hideLanguageFromPlayers,
            partialText,
            revelations,
          },
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
        <details className="editor-section">
          <summary>Traducción parcial</summary>
          <p className="muted small">
            Escribe las pistas legibles y encierra los fragmentos que seguirán siendo runas entre
            dobles corchetes. Ejemplo: [[El rey]] regresa [[al norte]]. Solo la verán los jugadores
            a los que asignes Traducción parcial abajo.
          </p>
          <label htmlFor="partial-text">Texto de traducción parcial</label>
          <textarea
            id="partial-text"
            maxLength={12000}
            rows={4}
            value={partialText}
            onChange={(e) => setPartialText(e.target.value)}
            placeholder="[[Fragmento oculto]] palabras legibles [[otro secreto]]"
          />
          {partialText.trim() &&
            (validPartial(partialText) ? (
              <div className="partial-preview">
                <p className="muted small">Vista previa de la traducción parcial</p>
                <div className="reading partial-reading" data-testid="partial-preview">
                  {partialReading(partialText, existing?.id ?? `runa:${item.id}`)}
                </div>
              </div>
            ) : (
              <p role="alert" className="error">
                Cierra cada fragmento oculto con [[ y ]], sin anidar corchetes.
              </p>
            ))}
        </details>
        <details className="editor-section">
          <summary>Revelación por jugador</summary>
          <p className="muted small">
            Concede lectura solo para esta inscripción. No cambia sus idiomas ni abre ventanas al
            jugador. Quienes ya conocen el idioma conservan la lectura completa.
          </p>
          {[...readers].map(([id, name]) => (
            <label key={id} className="revelation-row">
              <span>
                {name}
                {!players.some((p) => p.id === id) ? ' · Desconectado' : ''}
              </span>
              <code>{id}</code>
              <select
                aria-label={`Revelación para ${name} (${id})`}
                value={revelations.find((r) => r.playerId === id)?.mode ?? 'language'}
                onChange={(e) => {
                  const mode = e.target.value;
                  setRevelations((current) => {
                    const next = current.filter((r) => r.playerId !== id);
                    if (mode === 'partial' || mode === 'full')
                      next.push({ playerId: id, displayName: name, mode });
                    return next;
                  });
                }}
              >
                <option value="language">Según sus idiomas</option>
                <option value="partial">Traducción parcial</option>
                <option value="full">Texto completo</option>
              </select>
            </label>
          ))}
          {readers.size === 0 && (
            <p className="muted small">Los jugadores aparecerán al entrar a la sala.</p>
          )}
        </details>
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
      <PrivateNote
        key={`${roomId}:${player.id}:${item.id}`}
        {...{ roomId, player, sceneToken: openedScene, service, run, busy }}
        itemId={item.id}
      />
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
