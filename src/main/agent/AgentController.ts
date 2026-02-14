import Anthropic from '@anthropic-ai/sdk';
import type { AgentQueryRequest } from './types';
import type { AgentQueryResponse } from '../../common/types/ipc';
import { SYSTEM_PROMPT_M6 } from './prompts/systemPrompt';
import { tools, executeToolCall, completeWrite } from './tools';
import { ToolExecutionContext } from './ToolExecutionContext';
import { approvalManager } from './ApprovalManager';
import { planningManager } from './PlanningManager';
import { fileSystemManager } from '../vault/FileSystemManager';
import { fileStateTracker } from '../vault/FileStateTracker';

export class AgentController {
  private anthropic: Anthropic;
  private apiKey: string;
  private abortController: AbortController | null = null;

  constructor() {
    this.apiKey = this.getApiKey();
    this.anthropic = new Anthropic({ apiKey: this.apiKey });
  }

  /**
   * Abort the current query if one is in progress
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private getApiKey(): string {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is not set. ' +
        'Please create a .env file with your API key.'
      );
    }
    return apiKey;
  }

  /**
   * Auto-load CAMPAIGN.md at the start of a session
   * Per spec: "Gary always reads this file in its entirety when a session starts"
   */
  private async loadCampaignFile(messages: Anthropic.MessageParam[]): Promise<void> {
    // Try both common variations
    const possibleNames = ['CAMPAIGN.md', 'Campaign.md'];

    for (const filename of possibleNames) {
      try {
        const exists = await fileSystemManager.fileExists(filename);
        if (exists) {
          const content = await fileSystemManager.readFile(filename);

          // Mark as READ in file state tracker
          fileStateTracker.markRead(filename);

          // Add to conversation context as a user message
          messages.push({
            role: 'user',
            content: `Here is the campaign file (${filename}):\n\n${content}`,
          });

          return; // Found and loaded, exit
        }
      } catch (error) {
        // File doesn't exist or can't be read, try next variation
        continue;
      }
    }

    // M11: No CAMPAIGN.md found - add system note so Gary can offer to help create one
    messages.push({
      role: 'user',
      content: 'Note: No CAMPAIGN.md file found in vault. You can offer to help the user create one using planning mode if they want.',
    });
  }

  /**
   * Auto-load vault structure at session start
   * Provides directory layout context to reduce list_directory calls
   */
  private async loadVaultStructure(messages: Anthropic.MessageParam[]): Promise<void> {
    try {
      const entries = await fileSystemManager.listDirectory('', true); // recursive
      const structure = this.formatVaultStructure(entries);

      if (structure) {
        messages.push({
          role: 'user',
          content: `Vault directory structure:\n${structure}`,
        });
      }
    } catch (error) {
      // Don't fail session start if structure loading fails
      console.error('Failed to load vault structure:', error);
    }
  }

  /**
   * Format vault structure as a compact tree
   * Shows directories only with file counts, max 3 levels deep
   */
  private formatVaultStructure(entries: any[]): string {
    interface DirNode {
      name: string;
      path: string;
      fileCount: number;
      subdirs: Map<string, DirNode>;
    }

    // Build directory tree with file counts
    const root: Map<string, DirNode> = new Map();

    for (const entry of entries) {
      const pathParts = entry.path.split('/');

      if (entry.type === 'file') {
        // Count file in its parent directory
        if (pathParts.length === 1) {
          // Root level file - skip (will mention separately)
          continue;
        }

        // Navigate to parent directory and increment count
        let currentLevel = root;
        for (let i = 0; i < pathParts.length - 1; i++) {
          const dirName = pathParts[i];
          if (!currentLevel.has(dirName)) {
            currentLevel.set(dirName, {
              name: dirName,
              path: pathParts.slice(0, i + 1).join('/'),
              fileCount: 0,
              subdirs: new Map(),
            });
          }
          const node = currentLevel.get(dirName)!;
          if (i === pathParts.length - 2) {
            // This is the direct parent
            node.fileCount++;
          }
          currentLevel = node.subdirs;
        }
      } else if (entry.type === 'directory') {
        // Ensure directory exists in tree
        let currentLevel = root;
        for (let i = 0; i < pathParts.length; i++) {
          const dirName = pathParts[i];
          if (!currentLevel.has(dirName)) {
            currentLevel.set(dirName, {
              name: dirName,
              path: pathParts.slice(0, i + 1).join('/'),
              fileCount: 0,
              subdirs: new Map(),
            });
          }
          currentLevel = currentLevel.get(dirName)!.subdirs;
        }
      }
    }

    // Format as tree with max depth of 3
    const lines: string[] = [];
    const formatNode = (node: DirNode, depth: number, prefix: string) => {
      if (depth > 3) return; // Max depth limit

      const indent = '  '.repeat(depth);
      const fileInfo = node.fileCount > 0 ? ` (${node.fileCount} files)` : '';
      lines.push(`${indent}📁 ${node.name}/${fileInfo}`);

      // Sort subdirectories alphabetically
      const sortedSubdirs = Array.from(node.subdirs.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      for (const subdir of sortedSubdirs) {
        formatNode(subdir, depth + 1, prefix + '  ');
      }
    };

    // Sort root directories alphabetically
    const sortedRoot = Array.from(root.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    for (const node of sortedRoot) {
      formatNode(node, 0, '');
    }

    // Count root-level files
    const rootFiles = entries.filter(
      (e) => e.type === 'file' && !e.path.includes('/')
    );
    if (rootFiles.length > 0) {
      lines.push(`\nRoot level: ${rootFiles.length} files`);
    }

    return lines.join('\n');
  }

  async *query(request: AgentQueryRequest): AsyncGenerator<AgentQueryResponse> {
    // Create abort controller for this query
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    let accumulatedText = '';

    try {
      // Build message history for API
      const messages: Anthropic.MessageParam[] = request.conversationHistory
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

      // Auto-load CAMPAIGN.md and vault structure if this is the first message
      if (messages.length === 0) {
        await this.loadCampaignFile(messages);
        await this.loadVaultStructure(messages);
      }

      // Add current message
      messages.push({
        role: 'user',
        content: request.message,
      });

      // Agentic loop - continue until we get a final text response
      let continueLoop = true;
      const maxTurns = 25;
      let turnCount = 0;

      while (continueLoop) {
        // Check if aborted
        if (signal.aborted) {
          yield { type: 'done', fullText: accumulatedText + '\n\n*[Request cancelled]*' };
          break;
        }

        // Check turn limit and ask user if they want to continue
        if (turnCount >= maxTurns) {
          const continueRequest = {
            toolUseId: `turn-limit-${Date.now()}`,
            questions: [
              {
                id: 'continue',
                question: `Gary has used ${maxTurns} turns. Should I continue working on this task?`,
              },
            ],
          };

          // Yield planning_required to ask user
          yield {
            type: 'planning_required',
            planningRequest: continueRequest,
          };

          // Wait for user response
          const continueResponse = await planningManager.requestPlanning(continueRequest);
          const answer = continueResponse.answers['continue']?.toLowerCase() || '';

          // Check if user wants to continue
          if (answer.includes('yes') || answer.includes('continue') || answer.includes('go on')) {
            // Reset turn counter and continue
            turnCount = 0;
          } else {
            // User wants to stop - yield done with accumulated text
            yield { type: 'done', fullText: accumulatedText };
            continueLoop = false;
            break;
          }
        }

        turnCount++;

        // Call API with tools
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 16384,
          system: SYSTEM_PROMPT_M6,
          messages,
          tools,
        });

        // Process response content blocks
        let hasToolUse = false;
        let textContent = '';

        for (const block of response.content) {
          if (block.type === 'text') {
            textContent += block.text;
            accumulatedText += block.text;
            // Stream text chunks (simulate streaming by yielding in parts)
            yield { type: 'chunk', text: block.text };
          } else if (block.type === 'tool_use') {
            hasToolUse = true;
          }
        }

        // If no tool use, we're done
        if (!hasToolUse) {
          yield { type: 'done', fullText: textContent };
          continueLoop = false;
          break;
        }

        // Handle truncated responses - tool call inputs may be incomplete
        if (response.stop_reason === 'max_tokens') {
          const responseChars = response.content
            .map(b => b.type === 'text' ? b.text.length : JSON.stringify(b.input).length)
            .reduce((a, b) => a + b, 0);
          console.warn(`[AGENT_CONTROLLER] Response truncated (max_tokens hit, ~${responseChars} chars), asking model to retry concisely`);

          // Add a compact placeholder so the model knows what happened, without replaying 16k of truncated content
          messages.push({
            role: 'assistant',
            content: `<truncated — response was ${responseChars} characters and hit the token limit>`,
          });
          messages.push({
            role: 'user',
            content: 'Your previous response was cut off because it was too long. Your tool call was incomplete and could not be executed. Please try again, but be much more concise — keep the content shorter and focused on the essentials.',
          });

          // Skip processing the truncated tool calls, loop back to API
          continue;
        }

        // Add spacing after text blocks when there's tool use
        // This creates separation between "thinking" messages
        if (textContent.length > 0) {
          yield { type: 'chunk', text: '\n\n' };
        }

        // Execute tools and continue conversation
        const toolResults: Anthropic.MessageParam = {
          role: 'user',
          content: [],
        };

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            try {
              // Debug logging for tool calls
              console.log('[AGENT_CONTROLLER] Tool use:', {
                toolName: block.name,
                toolUseId: block.id,
                input: block.name === 'write'
                  ? {
                      path: (block.input as any).path,
                      contentLength: (block.input as any).content?.length || 0,
                      contentPreview: (block.input as any).content?.substring(0, 100) || '(empty)',
                    }
                  : block.input,
              });

              // Create execution context for approval workflow (M8)
              const context = new ToolExecutionContext();
              const result = await executeToolCall(block.name, block.input, context);

              // Check if approval is needed
              if (context.needsApproval() && context.approvalRequest) {
                // Use actual tool use ID from API
                context.approvalRequest.toolUseId = block.id;

                console.log('[AGENT_CONTROLLER] Approval needed:', {
                  toolUseId: block.id,
                  filePath: context.approvalRequest.filePath,
                  afterContentLength: context.approvalRequest.afterContent?.length || 0,
                  afterContentPreview: context.approvalRequest.afterContent?.substring(0, 100) || '(empty)',
                });

                // Yield approval_required to renderer
                yield {
                  type: 'approval_required',
                  approvalRequest: context.approvalRequest,
                };

                console.log('[AGENT_CONTROLLER] Waiting for user approval...');

                // Wait for user approval response
                const approvalResponse = await approvalManager.requestApproval(
                  context.approvalRequest
                );

                console.log('[AGENT_CONTROLLER] Received approval response:', {
                  approved: approvalResponse.approved,
                  feedback: approvalResponse.feedback,
                });

                // Complete write based on approval
                const finalResult = await completeWrite(
                  context.approvalRequest.filePath,
                  context.approvalRequest.afterContent,
                  approvalResponse.approved,
                  approvalResponse.feedback
                );

                // Add final result to tool results
                (toolResults.content as any[]).push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: finalResult,
                });
              } else if (context.needsPlanning() && context.planningRequest) {
                // Handle planning workflow (M10)
                // Use actual tool use ID from API
                context.planningRequest.toolUseId = block.id;

                console.log('[AGENT_CONTROLLER] Planning needed:', {
                  toolUseId: block.id,
                  questionCount: context.planningRequest.questions.length,
                });

                // Yield planning_required to renderer
                yield {
                  type: 'planning_required',
                  planningRequest: context.planningRequest,
                };

                console.log('[AGENT_CONTROLLER] Waiting for user planning response...');

                // Wait for user response
                const planningResponse = await planningManager.requestPlanning(
                  context.planningRequest
                );

                console.log('[AGENT_CONTROLLER] Received planning response:', {
                  answerCount: Object.keys(planningResponse.answers).length,
                });

                // Format answers as tool result
                const formattedAnswers = context.planningRequest.questions
                  .map((q) => `Q: ${q.question}\nA: ${planningResponse.answers[q.id] || '(no answer)'}`)
                  .join('\n\n');

                (toolResults.content as any[]).push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: `User provided answers:\n\n${formattedAnswers}`,
                });
              } else {
                // No approval or planning needed, use result directly
                (toolResults.content as any[]).push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: result,
                });
              }
            } catch (error: any) {
              console.error('[AGENT_CONTROLLER] Tool execution error:', error);
              (toolResults.content as any[]).push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: `Error: ${error.message}`,
                is_error: true,
              });
            }
          }
        }

        // Add assistant response and tool results to history
        messages.push({
          role: 'assistant',
          content: response.content,
        });
        messages.push(toolResults);
      }
    } catch (error: any) {
      // Don't yield error if aborted - it was intentional
      if (signal.aborted) {
        yield { type: 'done', fullText: accumulatedText + '\n\n*[Request cancelled]*' };
      } else {
        console.error('Agent query error:', error);
        yield {
          type: 'error',
          error: error.message || 'Failed to query agent',
        };
      }
    } finally {
      // Clean up abort controller
      this.abortController = null;
    }
  }
}

// Singleton instance
export const agentController = new AgentController();
