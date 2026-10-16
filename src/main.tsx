import { createRoot } from 'react-dom/client';
import OBR from '@owlbear-rodeo/sdk';
import { App } from './App';
import { OwlbearAdapter } from './owlbear';
import type { Adapter } from './adapter';
import './styles.css';
const params = new URLSearchParams(location.search);
const previewSurface =
  import.meta.env.DEV && params.get('demo') === '1' ? params.get('embed') : null;
document.documentElement.dataset.surface = OBR.isAvailable
  ? params.has('view')
    ? 'modal'
    : 'popover'
  : previewSurface === 'modal' || previewSurface === 'popover'
    ? previewSurface
    : 'standalone';
const root = createRoot(document.getElementById('root')!);
async function start() {
  let adapter: Adapter;
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('demo') === '1') {
    const { DemoAdapter } = await import('./demo');
    adapter = new DemoAdapter(new URLSearchParams(location.search).get('actor') ?? 'demo-dm');
  } else if (OBR.isAvailable) adapter = new OwlbearAdapter();
  else {
    root.render(
      <main className="shell">
        <header className="brand">
          <img src="/icon.svg" alt="" />
          <div>
            <h1>Relikos</h1>
            <p>Runas Antiguas</p>
          </div>
        </header>
        <h2>Abre la extensión en Owlbear Rodeo</h2>
        <p>Instala el manifiesto de este sitio desde las extensiones de tu sala.</p>
        <a href="/manifest.json">Ver manifest.json</a>
        {import.meta.env.DEV && (
          <p>
            <a href="/?demo=1">Abrir entorno de pruebas simulado</a>
          </p>
        )}
      </main>,
    );
    return;
  }
  await adapter.ready();
  root.render(<App adapter={adapter} />);
  if (adapter instanceof OwlbearAdapter) {
    window.addEventListener('pagehide', () => adapter.dispose(), { once: true });
    import.meta.hot?.dispose(() => adapter.dispose());
  }
}
void start().catch((error) => {
  root.render(
    <main className="shell">
      <h1>No se pudo iniciar Relikos</h1>
      <p role="alert">{String(error)}</p>
      <button onClick={() => location.reload()}>Reintentar</button>
    </main>,
  );
});
