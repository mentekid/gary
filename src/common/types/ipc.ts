// Message structure for chat
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// IPC communication types
export interface UserMessagePayload {
  text: string;
}

export interface AssistantMessagePayload {
  text: string;
}

// IPC API exposed to renderer
export interface IpcApi {
  sendMessage: (message: UserMessagePayload) => Promise<AssistantMessagePayload>;
}
