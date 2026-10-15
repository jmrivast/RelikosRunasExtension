import type { Adapter } from '../adapter';
import {
  readInscription,
  inscriptionPresentation,
  INSCRIPTION_KEY,
  type Snapshot,
  type Config,
} from '../domain';
import { visibleItems } from '../adapter';
import type { Run } from '../types';
export function InscriptionsPanel({
  snapshot,
  config,
  adapter,
  run,
  busy,
}: {
  snapshot: Snapshot;
  config: Config;
  adapter: Adapter;
  run: Run;
  busy: boolean;
}) {
  const gm = snapshot.player.role === 'GM';
  if (!gm) return null;
  const inscriptions = visibleItems(snapshot.items, snapshot.player.role).flatMap((item) => {
    const inscription = readInscription(item);
    return inscription ? [{ item, inscription }] : [];
  });
  const invalid = snapshot.items.filter(
    (i) => i.metadata[INSCRIPTION_KEY] !== undefined && !readInscription(i),
  );
  return (
    <section>
      <h2>Inscripciones</h2>
      {!snapshot.ready ? (
        <p className="empty">No hay una escena abierta. Abre un mapa en Owlbear Rodeo.</p>
      ) : (
        <>
          <div className="inscriptions">
            {inscriptions.map(({ item, inscription }) => {
              const presentation = inscriptionPresentation(snapshot.player, inscription);
              return (
                <div className="inscription-row" key={item.id}>
                  <img src="/icon.svg" alt="" />
                  <div className="inscription-info">
                    <h3>{presentation.title}</h3>
                    {!presentation.hideLanguage && (
                      <p className="ice">
                        {config.languages.find((l) => l.id === inscription.languageId)?.name ??
                          'Idioma desconocido'}
                      </p>
                    )}
                    {gm && (
                      <p className="muted small">
                        {item.name}
                        <code>{item.id}</code>
                        {!item.visible && ' · Objeto oculto'}
                      </p>
                    )}
                  </div>
                  <div className="actions">
                    <button
                      className="read-button"
                      onClick={() => {
                        void run(() => adapter.open({ view: 'read', itemId: item.id }));
                      }}
                    >
                      Leer
                    </button>
                    {gm && (
                      <button
                        onClick={() => {
                          void run(() => adapter.open({ view: 'edit', itemId: item.id }));
                        }}
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {gm &&
            invalid.map((item) => (
              <p className="error" key={item.id}>
                Metadatos inválidos en {item.name}.
                <button
                  onClick={() => {
                    void run(() => adapter.open({ view: 'edit', itemId: item.id }));
                  }}
                >
                  Reconfigurar
                </button>
              </p>
            ))}
          {gm && (
            <>
              <button
                className="configure"
                disabled={busy || snapshot.selection.length !== 1}
                onClick={() => {
                  void run(async () => {
                    const ids = await adapter.selected();
                    if (ids.length !== 1)
                      throw new Error('Selecciona exactamente un objeto del mapa.');
                    await adapter.open({ view: 'edit', itemId: ids[0] });
                  });
                }}
              >
                Configurar objeto seleccionado
              </button>
              <div className="empty">
                <div className="ornament" aria-hidden="true">
                  ◇
                </div>
                <p>Selecciona una runa en el mapa para comenzar.</p>
                <p className="small muted">
                  También puedes usar «Configurar inscripción» en su menú.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
