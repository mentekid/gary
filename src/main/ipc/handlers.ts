import { ipcMain, dialog } from 'electron';
import Anthropic from '@anthropic-ai/sdk';
import { IPC_EVENTS } from './events';
import {
  UserMessagePayload,
  SelectVaultResponse,
  ListDirectoryRequest,
  ListDirectoryResponse,
  ApprovalResponse,
  PlanningResponse,
  CompactionRequest,
  CompactionResponse,
} from '../../common/types/ipc';
import { fileSystemManager } from '../vault/FileSystemManager';
import { vaultValidator } from '../vault/VaultValidator';
import { agentController } from '../agent/AgentController';
import { fileStateTracker } from '../vault/FileStateTracker';
import { approvalManager } from '../agent/ApprovalManager';
import { planningManager } from '../agent/PlanningManager';

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

  // Planning response handler (M10) - user responds to planning request
  ipcMain.on(
    IPC_EVENTS.PLANNING_RESPONSE,
    (_event, response: PlanningResponse) => {
      console.log('[IPC_HANDLER] Received planning response:', {
        toolUseId: response.toolUseId,
        answerCount: Object.keys(response.answers).length,
      });
      planningManager.handlePlanningResponse(response);
    }
  );

  // Abort query handler - cancel in-progress request
  ipcMain.on(IPC_EVENTS.ABORT_QUERY, () => {
    console.log('[IPC_HANDLER] Abort query requested');
    agentController.abort();
  });

  // Compact conversation handler (M12) - generate summary of conversation
  ipcMain.handle(
    IPC_EVENTS.COMPACT_CONVERSATION,
    async (_event, request: CompactionRequest): Promise<CompactionResponse> => {
      try {
        console.log('[IPC_HANDLER] Starting conversation compaction:', {
          messageCount: request.messages.length,
        });

        // Get API key
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return {
            success: false,
            error: 'ANTHROPIC_API_KEY not found in environment',
          };
        }

        const client = new Anthropic({ apiKey });

        // Convert messages to Anthropic format
        const anthropicMessages: Anthropic.MessageParam[] = request.messages
          .filter((msg) => msg.role !== 'summary') // Exclude existing summaries
          .map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          }));

        // Request summary from Claude
        const response = await client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: `You are helping summarize a conversation between a user and Gary, an AI assistant for D&D Dungeon Masters.

Please create a concise summary of the conversation history provided below. The summary should preserve:
1. The user's initial and current goals
2. Key decisions that were made
3. Files that were modified or created
4. Important context for continuing the conversation
5. Next topics or pending tasks

Format the summary in markdown with clear sections. Be concise but preserve all critical information.

Here is the conversation history:

${anthropicMessages.map((msg, i) => `[${msg.role.toUpperCase()}]:\n${msg.content}\n`).join('\n---\n\n')}`,
            },
          ],
        });

        const summaryContent =
          response.content[0].type === 'text' ? response.content[0].text : '';

        console.log('[IPC_HANDLER] Compaction completed:', {
          summaryLength: summaryContent.length,
        });

        return {
          success: true,
          summary: summaryContent,
        };
      } catch (error: any) {
        console.error('[IPC_HANDLER] Compaction failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to compact conversation',
        };
      }
    }
  );
}

export function unregisterIpcHandlers() {
  ipcMain.removeAllListeners(IPC_EVENTS.SEND_MESSAGE);
  ipcMain.removeHandler(IPC_EVENTS.SELECT_VAULT);
  ipcMain.removeHandler(IPC_EVENTS.LIST_DIRECTORY);
  ipcMain.removeAllListeners(IPC_EVENTS.APPROVAL_RESPONSE);
  ipcMain.removeAllListeners(IPC_EVENTS.PLANNING_RESPONSE);
  ipcMain.removeAllListeners(IPC_EVENTS.ABORT_QUERY);
  ipcMain.removeHandler(IPC_EVENTS.COMPACT_CONVERSATION);
}
