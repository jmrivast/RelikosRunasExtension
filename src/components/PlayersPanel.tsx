import { useState, type FormEvent } from 'react';
import type { Config, Identity, Profile, Snapshot } from '../domain';
import { isCharacterToken, tokenPlayer } from '../proximity';
import type { RelikosService } from '../service';
import type { Run } from '../types';
function TokenAssignment({
  player,
  snapshot,
  service,
  run,
  busy,
}: {
  player: Identity;
  snapshot: Snapshot;
  service: RelikosService;
  run: Run;
  busy: boolean;
}) {
  const tokens = snapshot.items.filter(isCharacterToken);
  const assigned = tokens.find((token) => tokenPlayer(token) === player.id)?.id ?? '';
  return (
    <TokenChoice
      key={`${snapshot.sceneToken}:${assigned}`}
      {...{ player, snapshot, service, run, busy, tokens, assigned }}
    />
  );
}
function TokenChoice({
  player,
  snapshot,
  service,
  run,
  busy,
  tokens,
  assigned,
}: {
  player: Identity;
  snapshot: Snapshot;
  service: RelikosService;
  run: Run;
  busy: boolean;
  tokens: Snapshot['items'];
  assigned: string;
}) {
  const [chosen, setChosen] = useState(assigned);
  return (
    <fieldset>
      <legend>Token para proximidad · escena actual</legend>
      <label>
        Token de {player.name}
        <select
          aria-label={`Token de ${player.name}`}
          value={chosen}
          disabled={!snapshot.ready || busy}
          onChange={(e) => setChosen(e.target.value)}
        >
          <option value="">Sin token asignado</option>
          {tokens.map((token) => (
            <option
              key={token.id}
              value={token.id}
              disabled={!!tokenPlayer(token) && tokenPlayer(token) !== player.id}
            >
              {token.name} · {token.id}
              {tokenPlayer(token) && tokenPlayer(token) !== player.id
                ? ' · Asignado a otra cuenta'
                : ''}
            </option>
          ))}
        </select>
      </label>
      <p className="muted small">
        Elige una imagen de la capa Personaje. La asignación pertenece a esta escena y no cambia sus
        idiomas.
      </p>
      <button
        type="button"
        disabled={!snapshot.ready || busy}
        onClick={() => {
          void run(
            () => service.assignToken(player.id, chosen || null, snapshot.sceneToken),
            'Token de proximidad guardado.',
          );
        }}
      >
        Guardar token de {player.name}
      </button>
    </fieldset>
  );
}
function ProfileForm({
  player,
  profile,
  config,
  online,
  service,
  run,
  busy,
  snapshot,
}: {
  player: Identity;
  profile: Profile | undefined;
  config: Config;
  online: boolean;
  service: RelikosService;
  run: Run;
  busy: boolean;
  snapshot: Snapshot;
}) {
  const [character, setCharacter] = useState(profile?.character ?? '');
  const [languageIds, setLanguageIds] = useState(profile?.languageIds ?? []);
  function submit(e: FormEvent) {
    e.preventDefault();
    void run(
      () =>
        service.saveProfile({
          version: 1,
          playerId: player.id,
          displayName: player.name,
          character,
          languageIds,
        }),
      'Personaje e idiomas guardados.',
    );
  }
  return (
    <form className="profile" onSubmit={submit}>
      <div className="row">
        <h3>{player.name}</h3>
        <span className={online ? 'online' : 'muted'}>{online ? 'Conectado' : 'Desconectado'}</span>
      </div>
      <code>{player.id}</code>
      <label>
        Personaje de {player.name}
        <input
          maxLength={100}
          value={character}
          onChange={(e) => setCharacter(e.target.value)}
          placeholder="Nombre del personaje"
        />
      </label>
      <fieldset>
        <legend>Idiomas que comprende</legend>
        {config.languages.map((l) => (
          <label className="check" key={l.id}>
            <input
              type="checkbox"
              checked={languageIds.includes(l.id)}
              onChange={(e) =>
                setLanguageIds((ids) =>
                  e.target.checked ? [...ids, l.id] : ids.filter((id) => id !== l.id),
                )
              }
            />
            {l.name}
          </label>
        ))}
      </fieldset>
      <TokenAssignment {...{ player, snapshot, service, run, busy }} />
      <div className="actions">
        <button className="primary" disabled={busy}>
          Guardar jugador
        </button>
        {!online && (
          <button
            disabled={busy}
            type="button"
            className="text-button"
            onClick={() => {
              void run(() => service.removeProfile(player.id), 'Perfil eliminado.');
            }}
          >
            Eliminar perfil desconectado
          </button>
        )}
      </div>
    </form>
  );
}
export function PlayersPanel({
  config,
  players,
  service,
  run,
  busy,
  snapshot,
}: {
  config: Config;
  players: Identity[];
  service: RelikosService;
  run: Run;
  busy: boolean;
  snapshot: Snapshot;
}) {
  const all = new Map(players.map((p) => [p.id, p]));
  config.profiles.forEach((p) => {
    if (!all.has(p.playerId))
      all.set(p.playerId, {
        id: p.playerId,
        name: p.displayName || p.character || p.playerId,
        role: 'PLAYER',
      });
  });
  return (
    <section>
      <h2>Jugadores e idiomas</h2>
      <p className="muted">
        Los permisos pertenecen al ID de la cuenta, incluso cuando el jugador se desconecta. El DM
        siempre puede leer.
      </p>
      {[...all.values()]
        .filter((p) => p.role !== 'GM')
        .map((player) => {
          const profile = config.profiles.find((p) => p.playerId === player.id);
          return (
            <ProfileForm
              key={player.id + JSON.stringify(profile)}
              {...{ player, profile, config, service, run, busy, snapshot }}
              online={players.some((p) => p.id === player.id)}
            />
          );
        })}
      {[...all.values()].every((p) => p.role === 'GM') && (
        <p className="empty">Los jugadores aparecerán aquí cuando entren a la sala.</p>
      )}
    </section>
  );
}
