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

// Vault-related IPC types
export interface SelectVaultResponse {
  success: boolean;
  vaultPath?: string;
  error?: string;
  warning?: string; // e.g., "No CAMPAIGN.md found"
}

export interface ListDirectoryRequest {
  path: string; // Relative to vault root (empty string = root)
}

export interface ListDirectoryResponse {
  success: boolean;
  entries?: import('./vault').FileEntry[];
  error?: string;
}

// IPC API exposed to renderer
export interface IpcApi {
  sendMessage: (message: UserMessagePayload) => Promise<AssistantMessagePayload>;
  selectVault: () => Promise<SelectVaultResponse>;
  listDirectory: (request: ListDirectoryRequest) => Promise<ListDirectoryResponse>;
}
