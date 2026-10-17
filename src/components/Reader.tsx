import { useState } from 'react';
import { InscriptionImage } from './InscriptionImage';
import {
  canViewImage,
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
  const [expanded, setExpanded] = useState(false);
  const media = inscription.media;
  const imageAllowed = canViewImage(player, inscription, config);
  if (media?.mode === 'image' || (expanded && media && imageAllowed)) {
    return (
      <article className="image-stage">
        <h1 id="dialog-title" className="sr-only">
          Inscripción
        </h1>
        <button className="close" onClick={onClose} aria-label="Cerrar inscripción">
          ×
        </button>
        {media && imageAllowed ? (
          <InscriptionImage key={media.url} url={media.url} expanded />
        ) : (
          <p className="image-error">No puedes comprender esta imagen.</p>
        )}
        {media?.mode !== 'image' && (
          <button className="image-back" onClick={() => setExpanded(false)}>
            Volver al texto
          </button>
        )}
      </article>
    );
  }
  const picture =
    media && imageAllowed ? (
      <InscriptionImage
        key={media.url}
        url={media.url}
        expanded={false}
        onExpand={() => setExpanded(true)}
      />
    ) : null;
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
      {media?.position === 'before' && picture}
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
      {media?.position === 'after' && picture}
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
