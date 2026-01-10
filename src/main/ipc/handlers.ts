import { ipcMain, dialog } from 'electron';
import { IPC_EVENTS } from './events';
import {
  UserMessagePayload,
  SelectVaultResponse,
  ListDirectoryRequest,
  ListDirectoryResponse,
  ApprovalResponse,
} from '../../common/types/ipc';
import { fileSystemManager } from '../vault/FileSystemManager';
import { vaultValidator } from '../vault/VaultValidator';
import { agentController } from '../agent/AgentController';
import { fileStateTracker } from '../vault/FileStateTracker';
import { approvalManager } from '../agent/ApprovalManager';

export function registerIpcHandlers() {
  // Agent streaming handler - M5
  ipcMain.on(
    IPC_EVENTS.SEND_MESSAGE,
    async (event, payload: UserMessagePayload) => {
      try {
        const queryRequest = {
          message: payload.text,
          conversationHistory: payload.history || [],
        };

        // Stream responses back to renderer
        for await (const chunk of agentController.query(queryRequest)) {
          event.sender.send(IPC_EVENTS.AGENT_RESPONSE, chunk);
        }
      } catch (error: any) {
        event.sender.send(IPC_EVENTS.AGENT_RESPONSE, {
          type: 'error',
          error: error.message || 'Failed to query agent',
        });
      }
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

        // Clear file states from previous vault
        fileStateTracker.clear();

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

  // Approval response handler (M8) - user responds to write approval request
  ipcMain.on(
    IPC_EVENTS.APPROVAL_RESPONSE,
    (_event, response: ApprovalResponse) => {
      console.log('[IPC_HANDLER] Received approval response:', {
        toolUseId: response.toolUseId,
        approved: response.approved,
        feedback: response.feedback,
      });
      approvalManager.handleApprovalResponse(response);
    }
  );
}

export function unregisterIpcHandlers() {
  ipcMain.removeAllListeners(IPC_EVENTS.SEND_MESSAGE);
  ipcMain.removeHandler(IPC_EVENTS.SELECT_VAULT);
  ipcMain.removeHandler(IPC_EVENTS.LIST_DIRECTORY);
  ipcMain.removeAllListeners(IPC_EVENTS.APPROVAL_RESPONSE);
}
