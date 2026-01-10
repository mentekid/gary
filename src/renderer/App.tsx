import React, { useEffect } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { useVaultStore } from './store/vaultStore';
import { useFileStateSync } from './hooks/useFileStateSync';
import { useAgentResponseListener } from './hooks/useAgentResponseListener';
import { useApprovalListener } from './hooks/useApprovalListener';
import ApprovalModal from './components/Approval/ApprovalModal';

function App() {
  const selectVault = useVaultStore((state) => state.selectVault);

  // Subscribe to file state updates from main process
  useFileStateSync();

  // M8: Approval workflow
  const { pendingApproval, requestApproval, handleApprove, handleReject } = useApprovalListener();

  // Subscribe to agent response updates (ONLY CALLED ONCE HERE)
  useAgentResponseListener(requestApproval);

  // Trigger vault selection on mount
  useEffect(() => {
    selectVault();
  }, [selectVault]);

  return (
    <>
      <MainLayout />
      {pendingApproval && (
        <ApprovalModal
          request={pendingApproval}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </>
  );
}

export default App;
