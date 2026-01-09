import { ipcMain, dialog } from 'electron';
import { IPC_EVENTS } from './events';
import {
  UserMessagePayload,
  AssistantMessagePayload,
  SelectVaultResponse,
  ListDirectoryRequest,
  ListDirectoryResponse,
} from '../../common/types/ipc';
import { fileSystemManager } from '../vault/FileSystemManager';
import { vaultValidator } from '../vault/VaultValidator';

export function registerIpcHandlers() {
  // Echo handler - returns "You said: {message}"
  ipcMain.handle(
    IPC_EVENTS.SEND_MESSAGE,
    async (_event, payload: UserMessagePayload): Promise<AssistantMessagePayload> => {
      // Simple echo for M3 - will be replaced with agent in M5
      const response: AssistantMessagePayload = {
        text: `You said: ${payload.text}`,
      };

      // Simulate slight delay to feel more realistic
      await new Promise(resolve => setTimeout(resolve, 100));

      return response;
    }
  );

  // Select vault handler - opens file dialog
  ipcMain.handle(
    IPC_EVENTS.SELECT_VAULT,
    async (): Promise<SelectVaultResponse> => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory'],
          title: 'Select Vault Directory',
        });

        if (result.canceled) {
          return {
            success: false,
            error: 'Selection cancelled',
          };
        }

        const vaultPath = result.filePaths[0];

        // Validate vault
        const validation = await vaultValidator.validateVault(vaultPath);

        // Set vault path in FileSystemManager
        fileSystemManager.setVaultPath(vaultPath);

        return {
          success: true,
          vaultPath,
          warning: validation.warning || undefined,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Failed to select vault: ${error.message}`,
        };
      }
    }
  );

  // List directory handler - returns directory contents
  ipcMain.handle(
    IPC_EVENTS.LIST_DIRECTORY,
    async (_event, request: ListDirectoryRequest): Promise<ListDirectoryResponse> => {
      try {
        const entries = await fileSystemManager.listDirectory(
          request.path,
          true // Always recursive to load entire tree
        );

        return {
          success: true,
          entries,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }
  );
}

export function unregisterIpcHandlers() {
  ipcMain.removeHandler(IPC_EVENTS.SEND_MESSAGE);
  ipcMain.removeHandler(IPC_EVENTS.SELECT_VAULT);
  ipcMain.removeHandler(IPC_EVENTS.LIST_DIRECTORY);
}
