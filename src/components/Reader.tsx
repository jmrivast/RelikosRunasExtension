import {
  readingMode,
  inscriptionPresentation,
  reading,
  type Config,
  type Inscription,
  type Identity,
} from '../domain';
export function Reader({
  inscription,
  config,
  player,
  onClose,
}: {
  inscription: Inscription;
  config: Config;
  player: Identity;
  onClose: () => void;
}) {
  const mode = readingMode(player, inscription, config);
  const presentation = inscriptionPresentation(player, inscription);
  return (
    <article
      className={`reader ${config.settings.animate ? 'appear' : ''}`}
      style={{ '--reading-size': `${config.settings.fontSize}px` } as React.CSSProperties}
    >
      <button className="close" onClick={onClose} aria-label="Cerrar inscripción">
        ×
      </button>
      <img className="sigil" src="/icon.svg" alt="" />
      <h1 id="dialog-title" className={presentation.hideTitle ? 'sr-only' : undefined}>
        {presentation.title}
      </h1>
      {!presentation.hideLanguage && (
        <p className="language">
          {config.languages.find((l) => l.id === inscription.languageId)?.name ??
            'Idioma desconocido'}
        </p>
      )}
      <div className="ornament" aria-hidden="true">
        ◇
      </div>
      <div
        className={`reading ${mode === 'runes' ? 'runes' : mode === 'partial' ? 'partial-reading' : ''}`}
        data-testid="reading"
        aria-label={
          mode === 'full'
            ? 'Texto de la inscripción'
            : mode === 'partial'
              ? 'Traducción parcial'
              : 'Escritura indescifrable'
        }
      >
        {reading(player, inscription, config)}
      </div>
      {mode !== 'full' && (
        <p className="unreadable-hint">
          {mode === 'partial'
            ? 'Solo comprendes algunos fragmentos.'
            : 'No comprendes esta escritura.'}
        </p>
      )}
      <footer>
        <button onClick={onClose}>Cerrar</button>
      </footer>
    </article>
  );
}
