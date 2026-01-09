import { ipcMain } from 'electron';
import { IPC_EVENTS } from './events';
import { UserMessagePayload, AssistantMessagePayload } from '../../common/types/ipc';

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
}

export function unregisterIpcHandlers() {
  ipcMain.removeHandler(IPC_EVENTS.SEND_MESSAGE);
}
