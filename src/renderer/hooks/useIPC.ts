import { useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import type { Message } from '../../common/types/ipc';

export function useIPC() {
  const addMessage = useChatStore((state) => state.addMessage);

  const sendMessage = useCallback(async (text: string) => {
    // Create user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    // Add to store immediately (optimistic update)
    addMessage(userMessage);

    try {
      // Send to main process via IPC
      const response = await window.ipc.sendMessage({ text });

      // Create assistant message from response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
      };

      // Add to store
      addMessage(assistantMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Could add error handling UI here in future
    }
  }, [addMessage]);

  return { sendMessage };
}
