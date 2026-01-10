import { useEffect, useState } from 'react';
import type { ApprovalRequest } from '../../common/types/ipc';

/**
 * Hook to manage approval workflow state (M8)
 * Listens for approval_required responses from agent
 */
export function useApprovalListener() {
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);

  // This will be called by useAgentResponseListener when approval_required is received
  const requestApproval = (request: ApprovalRequest) => {
    setPendingApproval(request);
  };

  const handleApprove = () => {
    if (!pendingApproval) return;

    window.ipc.respondToApproval({
      toolUseId: pendingApproval.toolUseId,
      approved: true,
    });

    setPendingApproval(null);
  };

  const handleReject = (feedback: string) => {
    if (!pendingApproval) return;

    window.ipc.respondToApproval({
      toolUseId: pendingApproval.toolUseId,
      approved: false,
      feedback,
    });

    setPendingApproval(null);
  };

  return {
    pendingApproval,
    requestApproval,
    handleApprove,
    handleReject,
  };
}
