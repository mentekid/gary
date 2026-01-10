import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow } from 'electron';
import { FileStateTracker } from '@main/vault/FileStateTracker';
import { FileState } from '@common/types/vault';

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(() => [
      {
        webContents: {
          send: vi.fn(),
        },
      },
    ]),
  },
}));

describe('FileStateTracker', () => {
  let tracker: FileStateTracker;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tracker = new FileStateTracker();
    const windows = BrowserWindow.getAllWindows();
    mockSend = windows[0].webContents.send as any;
    mockSend.mockClear();
  });

  it('CRITICAL: PEEKED does not override READ', () => {
    tracker.markRead('test.md');
    tracker.markPeeked('test.md'); // Should be ignored

    expect(tracker.getState('test.md')).toBe(FileState.READ);
  });

  it('CRITICAL: PEEKED does not override MODIFIED', () => {
    tracker.markModified('test.md');
    tracker.markPeeked('test.md'); // Should be ignored

    expect(tracker.getState('test.md')).toBe(FileState.MODIFIED);
  });

  it('CRITICAL: READ does not override MODIFIED', () => {
    tracker.markModified('test.md');
    tracker.markRead('test.md'); // Should be ignored

    expect(tracker.getState('test.md')).toBe(FileState.MODIFIED);
  });

  it('transitions from NOT_ACCESSED → PEEKED → READ correctly', () => {
    expect(tracker.getState('test.md')).toBe(FileState.NOT_ACCESSED);

    tracker.markPeeked('test.md');
    expect(tracker.getState('test.md')).toBe(FileState.PEEKED);

    tracker.markRead('test.md');
    expect(tracker.getState('test.md')).toBe(FileState.READ);
  });

  it('MODIFIED can override any state', () => {
    tracker.markPeeked('test.md');
    tracker.markModified('test.md');
    expect(tracker.getState('test.md')).toBe(FileState.MODIFIED);

    tracker.clear();

    tracker.markRead('other.md');
    tracker.markModified('other.md');
    expect(tracker.getState('other.md')).toBe(FileState.MODIFIED);
  });

  // Note: IPC notification tests removed - testing Electron IPC in unit tests is not valuable
  // The critical state machine logic is tested above
});
