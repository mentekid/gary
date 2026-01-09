import type { Message } from '../../common/types/ipc';

export interface AgentQueryRequest {
  message: string;
  conversationHistory: Message[];
}

export interface AgentQueryResponse {
  type: 'chunk' | 'done' | 'error';
  text?: string;
  fullText?: string;
  error?: string;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentError {
  code: 'API_KEY_MISSING' | 'API_ERROR' | 'NETWORK_ERROR' | 'RATE_LIMIT';
  message: string;
  originalError?: any;
}
