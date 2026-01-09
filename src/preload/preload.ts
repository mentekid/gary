import { contextBridge, ipcRenderer } from 'electron';
import type {
  IpcApi,
  UserMessagePayload,
  AssistantMessagePayload,
  SelectVaultResponse,
  ListDirectoryRequest,
  ListDirectoryResponse,
} from '../common/types/ipc';

// Expose IPC API to renderer via contextBridge
const ipcApi: IpcApi = {
  sendMessage: (payload: UserMessagePayload): Promise<AssistantMessagePayload> => {
    return ipcRenderer.invoke('send-message', payload);
  },
  selectVault: (): Promise<SelectVaultResponse> => {
    return ipcRenderer.invoke('select-vault');
  },
  listDirectory: (request: ListDirectoryRequest): Promise<ListDirectoryResponse> => {
    return ipcRenderer.invoke('list-directory', request);
  },
};

contextBridge.exposeInMainWorld('ipc', ipcApi);
