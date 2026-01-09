import { BrowserWindow } from 'electron';
import { FileState } from '../../common/types/vault';
import { IPC_EVENTS } from '../ipc/events';
import type { FileStateUpdate } from '../../common/types/ipc';

export class FileStateTracker {
  private fileStates = new Map<string, FileState>();

  /**
   * Mark a file as peeked (frontmatter only read)
   */
  markPeeked(filePath: string): void {
    // Only update if not already read or modified
    const currentState = this.fileStates.get(filePath);
    if (currentState === FileState.READ || currentState === FileState.MODIFIED) {
      return;
    }

    this.fileStates.set(filePath, FileState.PEEKED);
    this.notifyRenderer(filePath, FileState.PEEKED);
  }

  /**
   * Mark a file as read (full content read)
   */
  markRead(filePath: string): void {
    // Only update if not modified
    const currentState = this.fileStates.get(filePath);
    if (currentState === FileState.MODIFIED) {
      return;
    }

    this.fileStates.set(filePath, FileState.READ);
    this.notifyRenderer(filePath, FileState.READ);
  }

  /**
   * Mark a file as modified (will be used in M7+)
   */
  markModified(filePath: string): void {
    this.fileStates.set(filePath, FileState.MODIFIED);
    this.notifyRenderer(filePath, FileState.MODIFIED);
  }

  /**
   * Get current state of a file
   */
  getState(filePath: string): FileState {
    return this.fileStates.get(filePath) || FileState.NOT_ACCESSED;
  }

  /**
   * Get all file states
   */
  getAllStates(): Map<string, FileState> {
    return new Map(this.fileStates);
  }

  /**
   * Clear all states (e.g., when vault changes)
   */
  clear(): void {
    this.fileStates.clear();
  }

  /**
   * Notify renderer of state change via IPC
   */
  private notifyRenderer(filePath: string, state: FileState): void {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      const update: FileStateUpdate = { filePath, state };
      window.webContents.send(IPC_EVENTS.FILE_STATE_UPDATED, update);
    }
  }
}

// Singleton instance
export const fileStateTracker = new FileStateTracker();
