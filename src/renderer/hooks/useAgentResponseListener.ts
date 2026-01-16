import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import type { ApprovalRequest, PlanningRequest } from '../../common/types/ipc';

/**
 * Sets up the agent response listener. Should only be called ONCE in App.tsx
 */
export function useAgentResponseListener(
  onApprovalRequest?: (request: ApprovalRequest) => void,
  onPlanningRequest?: (request: PlanningRequest) => void
) {
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const setIsStreaming = useChatStore((state) => state.setIsStreaming);

  const currentMessageRef = useRef<string>('');
  const currentMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const cleanup = window.ipc.onAgentResponse((response) => {
      if (response.type === 'chunk') {
        // Accumulate chunks
        currentMessageRef.current += response.text || '';

        if (!currentMessageIdRef.current) {
          // Create new message
          const msgId = `assistant-${Date.now()}`;
          currentMessageIdRef.current = msgId;
          addMessage({
            id: msgId,
            role: 'assistant',
            content: currentMessageRef.current,
            timestamp: Date.now(),
          });
        } else {
          // Update existing message
          updateMessage(currentMessageIdRef.current, {
            content: currentMessageRef.current,
          });
        }
      } else if (response.type === 'done') {
        // Finalize message
        setIsStreaming(false);
        currentMessageRef.current = '';
        currentMessageIdRef.current = null;
      } else if (response.type === 'error') {
        // Handle error
        setIsStreaming(false);
        addMessage({
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${response.error}`,
          timestamp: Date.now(),
        });
        currentMessageRef.current = '';
        currentMessageIdRef.current = null;
      } else if (response.type === 'approval_required') {
        // M8: Handle approval request
        console.log('[AGENT_RESPONSE_LISTENER] Received approval_required:', {
          hasRequest: !!response.approvalRequest,
          request: response.approvalRequest ? {
            toolUseId: response.approvalRequest.toolUseId,
            filePath: response.approvalRequest.filePath,
            beforeContentLength: response.approvalRequest.beforeContent?.length || 0,
            afterContentLength: response.approvalRequest.afterContent?.length || 0,
            afterContentPreview: response.approvalRequest.afterContent?.substring(0, 100) || '(empty)',
          } : null,
        });
        if (onApprovalRequest && response.approvalRequest) {
          onApprovalRequest(response.approvalRequest);
        }
      } else if (response.type === 'planning_required') {
        // M10: Handle planning request
        console.log('[AGENT_RESPONSE_LISTENER] Received planning_required:', {
          hasRequest: !!response.planningRequest,
          questionCount: response.planningRequest?.questions.length,
        });
        if (onPlanningRequest && response.planningRequest) {
          onPlanningRequest(response.planningRequest);
        }
      }
    });

    return cleanup;
  }, [addMessage, updateMessage, setIsStreaming, onApprovalRequest, onPlanningRequest]);
}
