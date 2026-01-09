import React, { useEffect } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { useVaultStore } from './store/vaultStore';

function App() {
  const selectVault = useVaultStore((state) => state.selectVault);

  // Trigger vault selection on mount
  useEffect(() => {
    selectVault();
  }, [selectVault]);

  return <MainLayout />;
}

export default App;
