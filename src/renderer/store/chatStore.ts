import { create } from 'zustand';
import type { Message } from '../../common/types/ipc';

interface ChatState {
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),

  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map(msg =>
      msg.id === id ? { ...msg, ...updates } : msg
    ),
  })),

  clearMessages: () => set({ messages: [] }),
}));
