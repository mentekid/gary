import type { IpcApi } from '../../common/types/ipc';

declare global {
  interface Window {
    ipc: IpcApi;
  }
}

export {};
