import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';

vi.mock('@anthropic-ai/sdk');
vi.mock('@main/agent/tools');
vi.mock('@main/agent/prompts/systemPrompt');

import { AgentController } from '@main/agent/AgentController';
import { executeToolCall } from '@main/agent/tools';

describe('AgentController', () => {
  let controller: AgentController;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    mockCreate = vi.fn();

    (Anthropic as any).mockImplementation(function (this: any) {
      this.messages = { create: mockCreate };
    });

    controller = new AgentController();
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('CRITICAL: adds newline after text when tool use follows', async () => {
    vi.mocked(executeToolCall).mockResolvedValue('File content');

    mockCreate
      .mockResolvedValueOnce({
        content: [
          { type: 'text', text: 'Let me read that file.' },
          { type: 'tool_use', id: 'tool_1', name: 'read', input: { file: 'test.md' } },
        ],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Here is the content.' }],
      });

    const responses = [];
    for await (const r of controller.query({ message: 'Read test.md', conversationHistory: [] })) {
      responses.push(r);
    }

    // The critical behavior: newline separates "thinking" from tool use
    expect(responses).toEqual([
      { type: 'chunk', text: 'Let me read that file.' },
      { type: 'chunk', text: '\n\n' }, // <-- This is what we're testing!
      { type: 'chunk', text: 'Here is the content.' },
      { type: 'done', fullText: 'Here is the content.' },
    ]);
  });

  it('does NOT add newline when tool use has no preceding text', async () => {
    vi.mocked(executeToolCall).mockResolvedValue('Result');

    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 'tool_1', name: 'read', input: {} }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Done.' }],
      });

    const responses = [];
    for await (const r of controller.query({ message: 'Test', conversationHistory: [] })) {
      responses.push(r);
    }

    const hasNewline = responses.some(r => r.type === 'chunk' && (r as any).text === '\n\n');
    expect(hasNewline).toBe(false);
  });

  it('prevents infinite loops with max turns limit', async () => {
    vi.mocked(executeToolCall).mockResolvedValue('Result');

    // Always return tool use (would loop forever without limit)
    mockCreate.mockResolvedValue({
      content: [
        { type: 'text', text: 'Thinking...' },
        { type: 'tool_use', id: 'tool_1', name: 'read', input: {} },
      ],
    });

    const responses = [];
    for await (const r of controller.query({ message: 'Test', conversationHistory: [] })) {
      responses.push(r);
    }

    const errorResponse = responses.find(r => r.type === 'error');
    expect(errorResponse).toEqual({
      type: 'error',
      error: 'Maximum conversation turns reached',
    });
  });

  it('continues agentic loop when tools are used', async () => {
    vi.mocked(executeToolCall).mockResolvedValue('File 1').mockResolvedValueOnce('File 2');

    mockCreate
      .mockResolvedValueOnce({
        content: [
          { type: 'text', text: 'Checking files.' },
          { type: 'tool_use', id: 'tool_1', name: 'read', input: { file: 'a.md' } },
        ],
      })
      .mockResolvedValueOnce({
        content: [
          { type: 'text', text: 'Checking more.' },
          { type: 'tool_use', id: 'tool_2', name: 'read', input: { file: 'b.md' } },
        ],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'All done.' }],
      });

    const responses = [];
    for await (const r of controller.query({ message: 'Test', conversationHistory: [] })) {
      responses.push(r);
    }

    // Should have gone through multiple turns
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(responses[responses.length - 1].type).toBe('done');
  });
});
