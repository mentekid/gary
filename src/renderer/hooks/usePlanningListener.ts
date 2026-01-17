import { useState } from 'react';
import type { PlanningRequest, Message } from '../../common/types/ipc';
import { useChatStore } from '../store/chatStore';

/**
 * Hook to manage planning workflow state (M10)
 * Mirrors useApprovalListener pattern
 */
export function usePlanningListener() {
  const [pendingPlanning, setPendingPlanning] = useState<PlanningRequest | null>(null);

  const requestPlanning = (request: PlanningRequest) => {
    setPendingPlanning(request);
  };

  const handleSubmit = (answers: Record<string, string>) => {
    if (!pendingPlanning) return;

    // Format Q&A exchange for display in chat
    const qaContent = pendingPlanning.questions
      .map((q) => `**Q:** ${q.question}\n**A:** ${answers[q.id] || '(no answer)'}`)
      .join('\n\n');

    // Add Q&A message to chat store for visibility and token counting
    const qaMessage: Message = {
      id: `planning-qa-${Date.now()}`,
      role: 'user',
      content: `**Planning Q&A:**\n\n${qaContent}`,
      timestamp: Date.now(),
    };
    useChatStore.getState().addMessage(qaMessage);

    window.ipc.respondToPlanning({
      toolUseId: pendingPlanning.toolUseId,
      answers,
    });

    setPendingPlanning(null);
  };

  const handleCancel = () => {
    if (!pendingPlanning) return;

    window.ipc.respondToPlanning({
      toolUseId: pendingPlanning.toolUseId,
      answers: {}, // Empty answers = cancelled
    });

    setPendingPlanning(null);
  };

  return {
    pendingPlanning,
    requestPlanning,
    handleSubmit,
    handleCancel,
  };
}
