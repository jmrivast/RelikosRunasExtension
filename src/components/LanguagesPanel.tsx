import { useState } from 'react';
import type { Config, Language } from '../domain';
import type { RelikosService } from '../service';
import type { Run } from '../types';
function Rename({
  language,
  service,
  run,
  busy,
}: {
  language: Language;
  service: RelikosService;
  run: Run;
  busy: boolean;
}) {
  const [name, setName] = useState(language.name);
  return (
    <form
      className="rename"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => service.saveLanguage({ ...language, name }), 'Idioma actualizado.');
      }}
    >
      <label>
        Nombre del idioma
        <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button disabled={busy}>Renombrar</button>
    </form>
  );
}
export function LanguagesPanel({
  config,
  service,
  run,
  busy,
  onPlayers,
}: {
  config: Config;
  service: RelikosService;
  run: Run;
  busy: boolean;
  onPlayers: () => void;
}) {
  const [name, setName] = useState('');
  return (
    <section>
      <h2>Idiomas</h2>
      <p className="muted">Crea lenguas para la campaña y asigna quién puede comprenderlas.</p>
      {config.languages.map((language) => (
        <div className="language-row" key={language.id}>
          <Rename key={language.name} {...{ language, service, run, busy }} />
          <p className="muted small">
            Lectores:{' '}
            {config.profiles
              .filter((p) => p.languageIds.includes(language.id))
              .map((p) => p.character || p.displayName)
              .join(', ') || 'Solo el DM'}
          </p>
          <button className="text-button" onClick={onPlayers}>
            Asignar lectores
          </button>
        </div>
      ))}
      <form
        className="new-language"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await service.saveLanguage({ version: 1, id: crypto.randomUUID(), name });
            setName('');
          }, 'Idioma creado.');
        }}
      >
        <label>
          Nuevo idioma
          <input
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la lengua"
          />
        </label>
        <button className="primary" disabled={busy}>
          Crear idioma
        </button>
      </form>
    </section>
  );
}
