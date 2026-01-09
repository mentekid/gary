import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import type { Message } from '../../common/types/ipc';

export function useIPC() {
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);

  const [isStreaming, setIsStreaming] = useState(false);
  const currentMessageRef = useRef<string>('');
  const currentMessageIdRef = useRef<string | null>(null);

  // Subscribe to streaming responses
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
  }, [addMessage, updateMessage]);

  const sendMessage = useCallback((text: string) => {
    // Add user message optimistically
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMessage);

    // Get conversation history
    const history = useChatStore.getState().messages;

    // Send to main process
    setIsStreaming(true);
    window.ipc.sendMessage({ text, history });
  }, [addMessage]);

  return { sendMessage, isStreaming };
}
