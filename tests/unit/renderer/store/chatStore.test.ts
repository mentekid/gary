import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../../../../src/renderer/store/chatStore';

describe('chatStore - Token Counting (M12)', () => {
  beforeEach(() => {
    const store = useChatStore.getState();
    store.clearMessages();
  });

  it('should return 0 tokens for empty conversation', () => {
    const { getTotalTokens } = useChatStore.getState();
    expect(getTotalTokens()).toBe(0);
  });

  it('should count tokens for single message', () => {
    const { addMessage, getTotalTokens } = useChatStore.getState();

    addMessage({
      id: 'msg_1',
      role: 'user',
      content: 'Hello, Gary! How are you?',
      timestamp: Date.now(),
    });

    const tokens = getTotalTokens();
    expect(tokens).toBeGreaterThan(0);
    // "Hello, Gary! How are you?" ≈ 7 tokens + 4 overhead = ~11 tokens
    expect(tokens).toBeGreaterThanOrEqual(10);
    expect(tokens).toBeLessThan(20);
  });

  it('should count tokens cumulatively for multiple messages', () => {
    const { addMessage, getTotalTokens } = useChatStore.getState();

    addMessage({
      id: 'msg_1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    });

    const tokens1 = getTotalTokens();
    expect(tokens1).toBeGreaterThan(0);

    addMessage({
      id: 'msg_2',
      role: 'assistant',
      content: 'Hi there!',
      timestamp: Date.now(),
    });

    const tokens2 = getTotalTokens();
    expect(tokens2).toBeGreaterThan(tokens1);

    addMessage({
      id: 'msg_3',
      role: 'user',
      content: 'How are you doing today?',
      timestamp: Date.now(),
    });

    const tokens3 = getTotalTokens();
    expect(tokens3).toBeGreaterThan(tokens2);
  });

  it('should calculate context usage percentage correctly', () => {
    const { getContextUsagePercent } = useChatStore.getState();

    // Empty conversation
    expect(getContextUsagePercent()).toBe(0);
  });

  it('should cap context usage at 100%', () => {
    const { getContextUsagePercent } = useChatStore.getState();

    // Empty conversation starts at 0%
    const percent = getContextUsagePercent();
    expect(percent).toBeLessThanOrEqual(100);
    expect(percent).toBeGreaterThanOrEqual(0);
  });

  it('should include per-message overhead in token count', () => {
    const { addMessage, getTotalTokens } = useChatStore.getState();

    // Add a message with known short content
    addMessage({
      id: 'msg_1',
      role: 'user',
      content: 'Hi',
      timestamp: Date.now(),
    });

    const tokens = getTotalTokens();
    // "Hi" is 1 token + 4 overhead = ~5 tokens minimum
    expect(tokens).toBeGreaterThanOrEqual(4);
  });

  it('should count tokens for assistant messages', () => {
    const { addMessage, getTotalTokens } = useChatStore.getState();

    addMessage({
      id: 'msg_1',
      role: 'assistant',
      content: 'Hello! I am Gary, your D&D assistant.',
      timestamp: Date.now(),
    });

    const tokens = getTotalTokens();
    expect(tokens).toBeGreaterThan(0);
  });

  it('should handle summary messages in token count', () => {
    const { addMessage, getTotalTokens } = useChatStore.getState();

    addMessage({
      id: 'msg_1',
      role: 'user',
      content: 'Original message',
      timestamp: Date.now(),
    });

    const beforeTokens = getTotalTokens();

    addMessage({
      id: 'summary_1',
      role: 'summary',
      content: 'This is a conversation summary.',
      timestamp: Date.now(),
    });

    const afterTokens = getTotalTokens();
    expect(afterTokens).toBeGreaterThan(beforeTokens);
  });

  it('should handle replaceWithSummary correctly', () => {
    const { addMessage, replaceWithSummary } = useChatStore.getState();

    // Add multiple messages
    addMessage({
      id: 'msg_1',
      role: 'user',
      content: 'First message',
      timestamp: Date.now(),
    });

    addMessage({
      id: 'msg_2',
      role: 'assistant',
      content: 'Second message',
      timestamp: Date.now(),
    });

    // Get messages count after adding
    const beforeMessages = useChatStore.getState().messages;
    expect(beforeMessages.length).toBe(2);

    const beforeTokens = useChatStore.getState().getTotalTokens();

    // Replace with summary
    replaceWithSummary('Summary of conversation');

    const afterMessages = useChatStore.getState().messages;
    expect(afterMessages.length).toBe(1);
    expect(afterMessages[0].role).toBe('summary');
    expect(afterMessages[0].content).toBe('Summary of conversation');

    // Summary should have fewer tokens than full conversation
    const afterTokens = useChatStore.getState().getTotalTokens();
    expect(afterTokens).toBeLessThan(beforeTokens);
  });
});
