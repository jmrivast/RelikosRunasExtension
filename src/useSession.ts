import { useEffect, useState } from 'react';
import type { Adapter } from './adapter';
import type { Snapshot } from './domain';
export function useSession(adapter: Adapter) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let revision = 0;
    const refresh = () => {
      const current = ++revision;
      void adapter
        .snapshot()
        .then((next) => {
          if (active && current === revision) {
            setSnapshot(next);
            setError('');
          }
        })
        .catch((e) => {
          if (active && current === revision) {
            setSnapshot(null);
            setError(e instanceof Error ? e.message : String(e));
          }
        });
    };
    const stop = adapter.subscribe(refresh);
    refresh();
    return () => {
      active = false;
      revision++;
      stop();
    };
  }, [adapter]);
  return { snapshot, error };
}
