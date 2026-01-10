import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import type { ApprovalRequest } from '../../common/types/ipc';

/**
 * Sets up the agent response listener. Should only be called ONCE in App.tsx
 */
export function useAgentResponseListener(
  onApprovalRequest?: (request: ApprovalRequest) => void
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
        if (onApprovalRequest && response.approvalRequest) {
          onApprovalRequest(response.approvalRequest);
        }
      }
    });

    return cleanup;
  }, [addMessage, updateMessage, setIsStreaming, onApprovalRequest]);
}
