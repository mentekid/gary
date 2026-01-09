import { useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import type { Message } from '../../common/types/ipc';

// Note: The streaming listener is set up once in App.tsx via useAgentResponseListener
// This hook just provides the sendMessage function and isStreaming state
export function useIPC() {
  const addMessage = useChatStore((state) => state.addMessage);
  const isStreaming = useChatStore((state) => state.isStreaming);

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
    useChatStore.getState().setIsStreaming(true);
    window.ipc.sendMessage({ text, history });
  }, [addMessage]);

  return { sendMessage, isStreaming };
}
