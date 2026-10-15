import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Adapter, Navigation } from './adapter';
import { readConfig, readInscription } from './domain';
import { RelikosService } from './service';
import { useSession } from './useSession';
import { Reader } from './components/Reader';
import { Editor } from './components/Editor';
import { Modal } from './components/Modal';
import { PlayersPanel } from './components/PlayersPanel';
import { LanguagesPanel } from './components/LanguagesPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { InscriptionsPanel } from './components/InscriptionsPanel';
import type { DemoAdapter } from './demo';
import type { Run } from './types';
const tabs = ['Inscripciones', 'Jugadores', 'Idiomas', 'Configuración'] as const;
export function App({ adapter }: { adapter: Adapter }) {
  const { snapshot, error: loadError } = useSession(adapter);
  const service = useMemo(() => new RelikosService(adapter), [adapter]);
  const [tab, setTab] = useState<(typeof tabs)[number]>('Inscripciones');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const [navigation, setNavigation] = useState<Navigation | null>(() => {
    const view = params.get('view');
    const itemId = params.get('item');
    return (view === 'read' || view === 'edit') && itemId ? { view, itemId } : null;
  });
  useEffect(() => {
    if (adapter.demo) (adapter as DemoAdapter).onNavigate(setNavigation);
  }, [adapter]);
  const close = useCallback(() => {
    setNavigation(null);
    void adapter.close().catch((e) => setError(String(e)));
  }, [adapter]);
  const run: Run = useCallback(async (action, success) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (success) setNotice(success);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  if (!snapshot)
    return (
      <main className="shell">
        <h1>Relikos</h1>
        <p role={loadError ? 'alert' : 'status'}>{loadError || 'Cargando…'}</p>
        {loadError && <button onClick={() => window.location.reload()}>Volver a conectar</button>}
      </main>
    );
  const config = readConfig(snapshot.room);
  const gm = snapshot.player.role === 'GM';
  const item = navigation
    ? snapshot.items.find((i) => i.id === navigation.itemId && (gm || i.visible))
    : undefined;
  const inscription = item ? readInscription(item) : null;
  const routeModal = !adapter.demo && params.has('view');
  const shared = { config, service, run, busy };
  const demo = adapter as DemoAdapter;
  return (
    <>
      {adapter.demo && (
        <aside className="demo-bar">
          <strong>Entorno de pruebas · SDK simulado</strong>
          <span>{snapshot.player.name}</span>
          <div className="actions">
            <a href="/?demo=1&actor=demo-dm">DM</a>
            <a href="/?demo=1&actor=demo-basili">Basili</a>
            <a href="/?demo=1&actor=demo-other">Otro jugador</a>
          </div>
          <label>
            Escena de prueba
            <select aria-label="Escena de prueba" onChange={(e) => demo.setScene(e.target.value)}>
              <option value="a">Escena A</option>
              <option value="b">Escena B</option>
              <option value="none">Sin escena</option>
            </select>
          </label>
          {gm && (
            <details>
              <summary>Controles de prueba</summary>
              <div className="actions">
                <button onClick={() => demo.toggleBasili()}>Conectar/desconectar Basili</button>
                <button onClick={() => demo.duplicate()}>Duplicar objeto</button>
                <button onClick={() => demo.deleteObject()}>Eliminar objeto de Aurill</button>
                <button onClick={() => demo.reset()}>Restablecer demo</button>
              </div>
            </details>
          )}
        </aside>
      )}
      {!routeModal &&
        (gm ? (
          <main className="shell">
            <header className="brand">
              <img src="/icon.svg" alt="" />
              <div>
                <h1>Relikos</h1>
                <p>Runas Antiguas</p>
              </div>
            </header>
            {gm && (
              <nav aria-label="Administración">
                {tabs.map((t) => (
                  <button
                    key={t}
                    aria-current={tab === t ? 'page' : undefined}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </nav>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="success" role="status">
                {notice}
              </p>
            )}
            {gm &&
              config.warnings.map((w, i) => (
                <p role="alert" key={i} className="error">
                  {w}
                </p>
              ))}
            <div className="panel">
              {gm && tab === 'Inscripciones' && (
                <InscriptionsPanel {...{ snapshot, config, adapter, run, busy }} />
              )}
              {gm && tab === 'Jugadores' && <PlayersPanel {...shared} players={snapshot.players} />}{' '}
              {gm && tab === 'Idiomas' && (
                <LanguagesPanel {...shared} onPlayers={() => setTab('Jugadores')} />
              )}{' '}
              {gm && tab === 'Configuración' && (
                <SettingsPanel
                  key={JSON.stringify(config.settings)}
                  {...{ service, run, busy }}
                  settings={config.settings}
                />
              )}
            </div>
            <footer className="shell-footer">
              {gm
                ? 'Dungeon Master'
                : config.profiles.find((p) => p.playerId === snapshot.player.id)?.character ||
                  snapshot.player.name}{' '}
              <span>Las Crónicas de Relikos</span>
            </footer>
          </main>
        ) : (
          <main className="shell">
            <h1>Relikos</h1>
            <p>Este panel está reservado al Dungeon Master.</p>
          </main>
        ))}
      {navigation && (
        <Modal onClose={close}>
          {!snapshot.ready || !item ? (
            <section className="editor">
              <h1 id="dialog-title">Inscripción no disponible</h1>
              <p>El objeto fue eliminado, está oculto o la escena cambió.</p>
              <button onClick={close}>Cerrar</button>
            </section>
          ) : navigation.view === 'edit' ? (
            gm ? (
              <Editor
                key={item.id}
                {...{ item, config, service, run, busy }}
                existing={inscription}
                sceneToken={snapshot.sceneToken}
                onClose={close}
              />
            ) : (
              <section className="editor">
                <h1 id="dialog-title">Acceso reservado al DM</h1>
                <p>Los jugadores no pueden editar inscripciones ni permisos.</p>
                <button onClick={close}>Cerrar</button>
              </section>
            )
          ) : inscription ? (
            <Reader {...{ inscription, config }} player={snapshot.player} onClose={close} />
          ) : (
            <section className="editor">
              <h1 id="dialog-title">Inscripción no disponible</h1>
              <p>La inscripción fue retirada o contiene datos inválidos.</p>
              <button onClick={close}>Cerrar</button>
            </section>
          )}
        </Modal>
      )}
    </>
  );
}
