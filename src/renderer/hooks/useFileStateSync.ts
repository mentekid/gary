import { useEffect } from 'react';
import { useVaultStore } from '../store/vaultStore';

/**
 * Hook to sync file states from main process via IPC
 * Call once at app level (e.g., in App.tsx)
 */
export function useFileStateSync() {
  const updateFileState = useVaultStore((state) => state.updateFileState);

  useEffect(() => {
    const cleanup = window.ipc.onFileStateUpdate((update) => {
      updateFileState(update.filePath, update.state);
    });

    return cleanup;
  }, [updateFileState]);
}
