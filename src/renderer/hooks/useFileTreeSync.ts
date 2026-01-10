import { useEffect } from 'react';
import { useVaultStore } from '../store/vaultStore';

/**
 * Hook to sync file tree with file system changes
 * Listens for FILE_CREATED and DIRECTORY_CREATED events from main process
 * and updates the file tree accordingly
 */
export function useFileTreeSync() {
  const insertFile = useVaultStore((state) => state.insertFile);
  const insertDirectory = useVaultStore((state) => state.insertDirectory);

  useEffect(() => {
    // Listen for file created events
    const cleanupFileCreated = window.ipc.onFileCreated((event) => {
      insertFile(event.filePath, event.fileEntry);
    });

    // Listen for directory created events
    const cleanupDirectoryCreated = window.ipc.onDirectoryCreated((event) => {
      insertDirectory(event.dirPath);
    });

    // Cleanup listeners on unmount
    return () => {
      cleanupFileCreated();
      cleanupDirectoryCreated();
    };
  }, [insertFile, insertDirectory]);
}
