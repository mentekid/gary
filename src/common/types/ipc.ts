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
  history?: Message[]; // Optional conversation context
}

// Agent streaming response types
export interface AgentQueryResponse {
  type: 'chunk' | 'done' | 'error' | 'approval_required';
  text?: string;
  fullText?: string;
  error?: string;
  approvalRequest?: ApprovalRequest;
}

// File state update event
export interface FileStateUpdate {
  filePath: string; // Relative path
  state: import('./vault').FileState;
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

// Approval workflow types (M8)
export interface ApprovalRequest {
  toolUseId: string; // Unique ID for this tool use
  filePath: string; // Relative path
  beforeContent: string | null; // null for new files
  afterContent: string;
}

export interface ApprovalResponse {
  toolUseId: string;
  approved: boolean;
  feedback?: string; // Required when rejected
}

// IPC API exposed to renderer
export interface IpcApi {
  sendMessage: (message: UserMessagePayload) => void;
  onAgentResponse: (callback: (response: AgentQueryResponse) => void) => () => void;
  selectVault: () => Promise<SelectVaultResponse>;
  listDirectory: (request: ListDirectoryRequest) => Promise<ListDirectoryResponse>;
  onFileStateUpdate: (callback: (update: FileStateUpdate) => void) => () => void;
  respondToApproval: (response: ApprovalResponse) => void;
}
