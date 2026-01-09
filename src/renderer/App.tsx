import React, { useEffect } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { useVaultStore } from './store/vaultStore';
import { useFileStateSync } from './hooks/useFileStateSync';

function App() {
  const selectVault = useVaultStore((state) => state.selectVault);

  // Subscribe to file state updates from main process
  useFileStateSync();

  // Trigger vault selection on mount
  useEffect(() => {
    selectVault();
  }, [selectVault]);

  return <MainLayout />;
}

export default App;
