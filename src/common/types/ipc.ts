// Message structure for chat
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'summary';
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
  type: 'chunk' | 'done' | 'error' | 'approval_required' | 'planning_required';
  text?: string;
  fullText?: string;
  error?: string;
  approvalRequest?: ApprovalRequest;
  planningRequest?: PlanningRequest;
}

// File state update event
export interface FileStateUpdate {
  filePath: string; // Relative path
  state: import('./vault').FileState;
}

// File tree update events
export interface FileCreatedEvent {
  filePath: string; // Relative path
  fileEntry: import('./vault').FileEntry;
}

export interface DirectoryCreatedEvent {
  dirPath: string; // Relative path
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

// Planning workflow types (M10)
export interface PlanningQuestion {
  id: string; // Unique ID for this question
  question: string; // The question text
}

export interface PlanningRequest {
  toolUseId: string; // Links to API tool_use block
  questions: PlanningQuestion[];
}

export interface PlanningResponse {
  toolUseId: string;
  answers: Record<string, string>; // Map of question ID → answer
}

// Compaction types (M12)
export interface CompactionRequest {
  messages: Message[];
}

export interface CompactionResponse {
  success: boolean;
  summary?: string;
  error?: string;
}

// IPC API exposed to renderer
export interface IpcApi {
  sendMessage: (message: UserMessagePayload) => void;
  onAgentResponse: (callback: (response: AgentQueryResponse) => void) => () => void;
  selectVault: () => Promise<SelectVaultResponse>;
  listDirectory: (request: ListDirectoryRequest) => Promise<ListDirectoryResponse>;
  onFileStateUpdate: (callback: (update: FileStateUpdate) => void) => () => void;
  onFileCreated: (callback: (event: FileCreatedEvent) => void) => () => void;
  onDirectoryCreated: (callback: (event: DirectoryCreatedEvent) => void) => () => void;
  respondToApproval: (response: ApprovalResponse) => void;
  respondToPlanning: (response: PlanningResponse) => void;
  compactConversation: (request: CompactionRequest) => Promise<CompactionResponse>;
}
