import React, { useEffect } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { useVaultStore } from './store/vaultStore';
import { useChatStore } from './store/chatStore';
import { useFileStateSync } from './hooks/useFileStateSync';
import { useFileTreeSync } from './hooks/useFileTreeSync';
import { useAgentResponseListener } from './hooks/useAgentResponseListener';
import { useApprovalListener } from './hooks/useApprovalListener';
import { usePlanningListener } from './hooks/usePlanningListener';
import ApprovalModal from './components/Approval/ApprovalModal';
import PlanningModal from './components/Planning/PlanningModal';

function App() {
  const selectVault = useVaultStore((state) => state.selectVault);
  const isStreaming = useChatStore((state) => state.isStreaming);

  // Subscribe to file state updates from main process
  useFileStateSync();

  // Subscribe to file tree updates (new files/directories)
  useFileTreeSync();

  // M8: Approval workflow
  const { pendingApproval, requestApproval, handleApprove, handleReject } = useApprovalListener();

  // M10: Planning workflow
  const { pendingPlanning, requestPlanning, handleSubmit, handleCancel } = usePlanningListener();

  // Subscribe to agent response updates (ONLY CALLED ONCE HERE)
  useAgentResponseListener(requestApproval, requestPlanning);

  // Trigger vault selection on mount
  useEffect(() => {
    selectVault();
  }, [selectVault]);

  // M11: Warn before closing when agent is thinking
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isStreaming) {
        e.preventDefault();
        e.returnValue = 'Gary is still thinking. Are you sure you want to close?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isStreaming]);

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
      {pendingPlanning && (
        <PlanningModal
          request={pendingPlanning}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}

export default App;
