import { contextBridge, ipcRenderer } from 'electron';
import type {
  IpcApi,
  UserMessagePayload,
  AgentQueryResponse,
  FileStateUpdate,
  FileCreatedEvent,
  DirectoryCreatedEvent,
  SelectVaultResponse,
  ListDirectoryRequest,
  ListDirectoryResponse,
} from '../common/types/ipc';

// Expose IPC API to renderer via contextBridge
const ipcApi: IpcApi = {
  sendMessage: (payload: UserMessagePayload): void => {
    ipcRenderer.send('send-message', payload);
  },

  onAgentResponse: (callback: (response: AgentQueryResponse) => void) => {
    const listener = (_event: any, response: AgentQueryResponse) => {
      callback(response);
    };
    ipcRenderer.on('agent-response', listener);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('agent-response', listener);
    };
  },

  selectVault: (): Promise<SelectVaultResponse> => {
    return ipcRenderer.invoke('select-vault');
  },

  listDirectory: (request: ListDirectoryRequest): Promise<ListDirectoryResponse> => {
    return ipcRenderer.invoke('list-directory', request);
  },

  onFileStateUpdate: (callback: (update: FileStateUpdate) => void) => {
    const listener = (_event: any, update: FileStateUpdate) => {
      callback(update);
    };
    ipcRenderer.on('file-state-updated', listener);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('file-state-updated', listener);
    };
  },

  onFileCreated: (callback: (event: FileCreatedEvent) => void) => {
    const listener = (_event: any, data: FileCreatedEvent) => {
      callback(data);
    };
    ipcRenderer.on('file-created', listener);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('file-created', listener);
    };
  },

  onDirectoryCreated: (callback: (event: DirectoryCreatedEvent) => void) => {
    const listener = (_event: any, data: DirectoryCreatedEvent) => {
      callback(data);
    };
    ipcRenderer.on('directory-created', listener);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('directory-created', listener);
    };
  },

  respondToApproval: (response: import('../common/types/ipc').ApprovalResponse): void => {
    ipcRenderer.send('approval-response', response);
  },
};

contextBridge.exposeInMainWorld('ipc', ipcApi);
