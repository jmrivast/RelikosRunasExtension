import { useState } from 'react';

/** The same original URL is used in previews, fit-to-screen and native-size views. */
export function InscriptionImage({
  url,
  expanded,
  onExpand,
}: {
  url: string;
  expanded: boolean;
  onExpand?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [nativeSize, setNativeSize] = useState(false);
  if (failed)
    return (
      <p role="alert" className="image-error">
        No se pudo cargar la imagen.
        <button onClick={() => setFailed(false)}>Reintentar imagen</button>
      </p>
    );
  const picture = (
    <img
      src={url}
      alt="Imagen de la inscripción"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
  if (!expanded)
    return (
      <button className="inscription-picture" onClick={onExpand} aria-label="Ampliar imagen">
        {picture}
      </button>
    );
  return (
    <>
      <div
        className={`image-viewport ${nativeSize ? 'native-size' : ''}`}
        tabIndex={0}
        aria-label="Vista de la imagen"
      >
        {picture}
      </div>
      <button
        className="image-zoom"
        aria-label={nativeSize ? 'Ajustar imagen a la pantalla' : 'Ver imagen a tamaño original'}
        onClick={() => setNativeSize(!nativeSize)}
      >
        {nativeSize ? '⊖' : '⊕'}
      </button>
    </>
  );
}
