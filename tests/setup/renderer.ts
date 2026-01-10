import '@testing-library/jest-dom/vitest';

// Mock window.electron for renderer tests
global.window.electron = {
  send: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  invoke: vi.fn(),
};
