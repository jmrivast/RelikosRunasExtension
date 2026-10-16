import type { DemoAdapter } from '../demo';
import { readInscription, type Snapshot } from '../domain';
import { canAccessItem, isCharacterToken } from '../proximity';

/** Opt-in visual fixture. This module, like DemoAdapter, is removed from production. */
export function DemoMap({ adapter, snapshot }: { adapter: DemoAdapter; snapshot: Snapshot }) {
  return (
    <section className="demo-map" aria-label="Mapa de prueba">
      <p className="muted small">Mapa de prueba · 5 pies por casilla</p>
      <div className="demo-map-stage">
        {snapshot.items.filter(isCharacterToken).map((token) => (
          <div
            className="demo-token"
            key={token.id}
            style={{ left: `${((token.position?.x ?? 0) + 100) / 8}%` }}
          >
            <span aria-hidden="true">●</span>
            <small>{token.name}</small>
          </div>
        ))}
        {snapshot.items
          .filter((item) => readInscription(item) && canAccessItem(snapshot, item))
          .map((item) => (
            <button
              key={item.id}
              className="demo-rune"
              aria-label={`Abrir inscripción del mapa ${item.id}`}
              style={{ left: `${((item.position?.x ?? 0) + 100) / 8}%` }}
              onClick={() => {
                void adapter.open({ view: 'read', itemId: item.id });
              }}
            >
              <img src="/icon.svg" alt="" />
            </button>
          ))}
      </div>
      {snapshot.player.role === 'GM' &&
        snapshot.items.filter(isCharacterToken).map((token) => (
          <label key={token.id}>
            Distancia de {token.name}
            <select
              aria-label={`Distancia de ${token.name}`}
              value={(token.position?.x ?? 0) / 20}
              onChange={(e) => adapter.moveToken(token.id, Number(e.target.value))}
            >
              {[0, 5, 9.9, 10, 15, 20, 30].map((feet) => (
                <option key={feet} value={feet}>
                  {feet} pies
                </option>
              ))}
            </select>
          </label>
        ))}
    </section>
  );
}
