import { useEffect, useState } from 'react';
import type { ApprovalRequest, Message } from '../../common/types/ipc';
import { useChatStore } from '../store/chatStore';

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

    // Add approval message to chat store for visibility
    const approvalMessage: Message = {
      id: `approval-${Date.now()}`,
      role: 'user',
      content: `**Approved:** Writing to \`${pendingApproval.filePath}\``,
      timestamp: Date.now(),
    };
    useChatStore.getState().addMessage(approvalMessage);

    window.ipc.respondToApproval({
      toolUseId: pendingApproval.toolUseId,
      approved: true,
    });

    setPendingApproval(null);
  };

  const handleReject = (feedback: string) => {
    if (!pendingApproval) return;

    // Add rejection message to chat store for visibility
    const rejectionMessage: Message = {
      id: `rejection-${Date.now()}`,
      role: 'user',
      content: `**Rejected:** Writing to \`${pendingApproval.filePath}\`\n**Feedback:** ${feedback}`,
      timestamp: Date.now(),
    };
    useChatStore.getState().addMessage(rejectionMessage);

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
