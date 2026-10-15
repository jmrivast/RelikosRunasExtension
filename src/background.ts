import OBR from '@owlbear-rodeo/sdk';
import { NS, INSCRIPTION_KEY, readInscription } from './domain';
import { OwlbearAdapter } from './owlbear';

/** Only this persistent iframe registers object menus; panels and readers never do. */
export async function registerInteractions(adapter: OwlbearAdapter) {
  const report = (error: unknown) => {
    void OBR.notification.show(
      error instanceof Error ? error.message : 'No se pudo abrir la inscripción.',
      'ERROR',
    );
  };
  const open = (view: 'read' | 'edit', itemId: string) => {
    void adapter.open({ view, itemId }).catch(report);
  };
  const readId = `${NS}/read`,
    editId = `${NS}/edit`;
  try {
    await OBR.contextMenu.create({
      id: readId,
      icons: [
        {
          icon: '/icon.svg',
          label: 'Leer inscripción',
          filter: {
            min: 1,
            max: 1,
            every: [{ key: ['metadata', INSCRIPTION_KEY, 'version'], value: 1 }],
          },
        },
      ],
      onClick(context) {
        const item = context.items[0];
        if (item && readInscription(item)) open('read', item.id);
      },
    });
    await OBR.contextMenu.create({
      id: editId,
      icons: [
        {
          icon: '/icon.svg',
          label: 'Configurar inscripción',
          filter: { min: 1, max: 1, roles: ['GM'], permissions: ['UPDATE'] },
        },
      ],
      onClick(context) {
        void OBR.player
          .getRole()
          .then((role) => {
            if (role === 'GM' && context.items[0]) open('edit', context.items[0].id);
          })
          .catch(report);
      },
    });
  } catch (error) {
    await Promise.allSettled([OBR.contextMenu.remove(readId), OBR.contextMenu.remove(editId)]);
    throw error;
  }
  return () => Promise.allSettled([OBR.contextMenu.remove(readId), OBR.contextMenu.remove(editId)]);
}
if (OBR.isAvailable) {
  OBR.onReady(() => {
    const adapter = new OwlbearAdapter();
    let cleanup: (() => Promise<unknown>) | undefined;
    let disposed = false;
    void registerInteractions(adapter)
      .then((stop) => {
        if (disposed) void stop();
        else cleanup = stop;
      })
      .catch((error) => {
        void OBR.notification.show(String(error), 'ERROR');
      });
    const dispose = () => {
      disposed = true;
      adapter.dispose();
      void cleanup?.();
    };
    window.addEventListener('pagehide', dispose, { once: true });
    import.meta.hot?.dispose(dispose);
  });
}
