import { create } from 'zustand';
import { encodingForModel } from 'js-tiktoken';
import type { Message } from '../../common/types/ipc';

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  clearMessages: () => void;
  replaceWithSummary: (summary: string) => void;
  getTotalTokens: () => number;
  getContextUsagePercent: () => number;
}

// Claude 3.5 Sonnet context window
const MAX_CONTEXT_TOKENS = 200000;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),

  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map(msg =>
      msg.id === id ? { ...msg, ...updates } : msg
    ),
  })),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  clearMessages: () => set({ messages: [] }),

  replaceWithSummary: (summary) =>
    set({
      messages: [
        {
          id: `summary_${Date.now()}`,
          role: 'summary',
          content: summary,
          timestamp: Date.now(),
        },
      ],
    }),

  getTotalTokens: () => {
    const messages = get().messages;
    if (messages.length === 0) return 0;

    try {
      const encoding = encodingForModel('gpt-4'); // Claude uses similar tokenization
      let totalTokens = 0;

      for (const message of messages) {
        // Count tokens in message content
        const tokens = encoding.encode(message.content);
        totalTokens += tokens.length;

        // Add overhead for message formatting (role, metadata, etc.)
        totalTokens += 4; // Approximate overhead per message
      }

      // Note: js-tiktoken doesn't require manual cleanup
      return totalTokens;
    } catch (error) {
      console.error('Error counting tokens:', error);
      return 0;
    }
  },

  getContextUsagePercent: () => {
    const totalTokens = get().getTotalTokens();
    return Math.min(100, Math.round((totalTokens / MAX_CONTEXT_TOKENS) * 100));
  },
}));
