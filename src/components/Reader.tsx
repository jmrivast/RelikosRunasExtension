import {
  canRead,
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
  const known = canRead(player, inscription, config);
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
        className={`reading ${known ? '' : 'runes'}`}
        data-testid="reading"
        aria-label={known ? 'Texto de la inscripción' : 'Escritura indescifrable'}
      >
        {reading(player, inscription, config)}
      </div>
      {!known && <p className="unreadable-hint">No comprendes esta escritura.</p>}
      <footer>
        <button onClick={onClose}>Cerrar</button>
      </footer>
    </article>
  );
}
