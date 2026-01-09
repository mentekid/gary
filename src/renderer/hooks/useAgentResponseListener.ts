import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';

/**
 * Sets up the agent response listener. Should only be called ONCE in App.tsx
 */
export function useAgentResponseListener() {
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
      }
    });

    return cleanup;
  }, [addMessage, updateMessage, setIsStreaming]);
}
