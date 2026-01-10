import type { Message } from '../../common/types/ipc';

export interface AgentQueryRequest {
  message: string;
  conversationHistory: Message[];
}
