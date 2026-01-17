import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

vi.mock('@anthropic-ai/sdk');
vi.mock('@main/agent/tools');
vi.mock('@main/agent/prompts/systemPrompt');
vi.mock('@main/agent/PlanningManager');

import { AgentController } from '@main/agent/AgentController';
import { executeToolCall } from '@main/agent/tools';
import { fileSystemManager } from '@main/vault/FileSystemManager';
import { fileStateTracker } from '@main/vault/FileStateTracker';
import { planningManager } from '@main/agent/PlanningManager';

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

    // Mock planningManager to respond "no" when asked to continue
    vi.mocked(planningManager.requestPlanning).mockResolvedValue({
      answers: { continue: 'no' },
    });

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

    // Should get a planning_required asking to continue
    const planningResponse = responses.find(r => r.type === 'planning_required');
    expect(planningResponse).toBeDefined();
    expect((planningResponse as any).planningRequest.questions[0].question).toContain('Should I continue');

    // Should end with done (not error) after user says no
    const doneResponse = responses.find(r => r.type === 'done');
    expect(doneResponse).toBeDefined();
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

  it('CRITICAL: auto-loads CAMPAIGN.md at session start', async () => {
    // Create a test vault with CAMPAIGN.md
    const testVaultPath = path.join(os.tmpdir(), `gary-test-campaign-${Date.now()}`);
    await fs.mkdir(testVaultPath, { recursive: true });

    try {
      const campaignContent = '# Test Campaign\n\nThis is a test campaign.';
      await fs.writeFile(
        path.join(testVaultPath, 'CAMPAIGN.md'),
        campaignContent
      );

      // Verify file was created
      const fileExists = await fs.access(path.join(testVaultPath, 'CAMPAIGN.md'))
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      fileSystemManager.setVaultPath(testVaultPath);
      fileStateTracker.clear();

      // Mock API response
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
      });

      // Query with empty conversation history (first message)
      const responses = [];
      for await (const r of controller.query({
        message: 'Hello',
        conversationHistory: [],
      })) {
        responses.push(r);
      }

      // CRITICAL: Verify CAMPAIGN.md was marked as READ and visible in file browser
      expect(fileStateTracker.getState('CAMPAIGN.md')).toBe('read');
    } finally {
      await fs.rm(testVaultPath, { recursive: true, force: true });
    }
  });

  it('CRITICAL: auto-loads vault structure at session start', async () => {
    // Create a test vault with directory structure
    const testVaultPath = path.join(os.tmpdir(), `gary-test-structure-${Date.now()}`);
    await fs.mkdir(testVaultPath, { recursive: true });

    try {
      // Create directory structure: NPCs/, sessions/Notes/
      await fs.mkdir(path.join(testVaultPath, 'NPCs'), { recursive: true });
      await fs.mkdir(path.join(testVaultPath, 'sessions', 'Notes'), { recursive: true });

      // Add some files
      await fs.writeFile(path.join(testVaultPath, 'NPCs', 'Thorin.md'), 'NPC content');
      await fs.writeFile(path.join(testVaultPath, 'NPCs', 'Elara.md'), 'NPC content');
      await fs.writeFile(path.join(testVaultPath, 'sessions', 'Notes', 'Session1.md'), 'Notes');

      fileSystemManager.setVaultPath(testVaultPath);
      fileStateTracker.clear();

      // Mock API response and capture the messages sent to API
      let capturedMessages: any[] = [];
      mockCreate.mockImplementation((params: any) => {
        capturedMessages = params.messages;
        return Promise.resolve({
          content: [{ type: 'text', text: 'Response' }],
        });
      });

      // Query with empty conversation history (first message)
      const responses = [];
      for await (const r of controller.query({
        message: 'Hello',
        conversationHistory: [],
      })) {
        responses.push(r);
      }

      // Verify vault structure was loaded
      const structureMessage = capturedMessages.find((m: any) =>
        m.content?.includes('Vault directory structure')
      );
      expect(structureMessage).toBeDefined();
      expect(structureMessage.content).toContain('📁 NPCs/');
      expect(structureMessage.content).toContain('2 files'); // Thorin.md and Elara.md
      expect(structureMessage.content).toContain('📁 sessions/');
    } finally {
      await fs.rm(testVaultPath, { recursive: true, force: true });
    }
  });
});
