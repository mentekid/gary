import { contextBridge, ipcRenderer } from 'electron';
import type { IpcApi, UserMessagePayload, AssistantMessagePayload } from '../common/types/ipc';

// Expose IPC API to renderer via contextBridge
const ipcApi: IpcApi = {
  sendMessage: (payload: UserMessagePayload): Promise<AssistantMessagePayload> => {
    return ipcRenderer.invoke('send-message', payload);
  },
};

contextBridge.exposeInMainWorld('ipc', ipcApi);
