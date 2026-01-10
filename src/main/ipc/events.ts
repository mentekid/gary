// Centralized IPC event names
export const IPC_EVENTS = {
  SEND_MESSAGE: 'send-message',
  AGENT_RESPONSE: 'agent-response',
  SELECT_VAULT: 'select-vault',
  LIST_DIRECTORY: 'list-directory',
  FILE_STATE_UPDATED: 'file-state-updated',
  APPROVAL_RESPONSE: 'approval-response', // M8: User responds to approval request
  FILE_CREATED: 'file-created', // File/directory created by agent
  DIRECTORY_CREATED: 'directory-created', // Directory created by agent
  FILE_DELETED: 'file-deleted', // File deleted by agent (future)
} as const;
