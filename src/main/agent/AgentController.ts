import Anthropic from '@anthropic-ai/sdk';
import type { AgentQueryRequest } from './types';
import type { AgentQueryResponse } from '../../common/types/ipc';
import { SYSTEM_PROMPT_M6 } from './prompts/systemPrompt';
import { tools, executeToolCall, completeWrite } from './tools';
import { ToolExecutionContext } from './ToolExecutionContext';
import { approvalManager } from './ApprovalManager';

export class AgentController {
  private anthropic: Anthropic;
  private apiKey: string;

  constructor() {
    this.apiKey = this.getApiKey();
    this.anthropic = new Anthropic({ apiKey: this.apiKey });
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

  async *query(request: AgentQueryRequest): AsyncGenerator<AgentQueryResponse> {
    try {
      // Build message history for API
      const messages: Anthropic.MessageParam[] = request.conversationHistory
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

      // Add current message
      messages.push({
        role: 'user',
        content: request.message,
      });

      // Agentic loop - continue until we get a final text response
      let continueLoop = true;
      const maxTurns = 10;
      let turnCount = 0;

      while (continueLoop && turnCount < maxTurns) {
        turnCount++;

        // Call API with tools
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
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
              // Create execution context for approval workflow (M8)
              const context = new ToolExecutionContext();
              const result = await executeToolCall(block.name, block.input, context);

              // Check if approval is needed
              if (context.needsApproval() && context.approvalRequest) {
                // Use actual tool use ID from API
                context.approvalRequest.toolUseId = block.id;

                // Yield approval_required to renderer
                yield {
                  type: 'approval_required',
                  approvalRequest: context.approvalRequest,
                };

                // Wait for user approval response
                const approvalResponse = await approvalManager.requestApproval(
                  context.approvalRequest
                );

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
              } else {
                // No approval needed, use result directly
                (toolResults.content as any[]).push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: result,
                });
              }
            } catch (error: any) {
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

      if (turnCount >= maxTurns) {
        yield {
          type: 'error',
          error: 'Maximum conversation turns reached',
        };
      }
    } catch (error: any) {
      console.error('Agent query error:', error);
      yield {
        type: 'error',
        error: error.message || 'Failed to query agent',
      };
    }
  }
}

// Singleton instance
export const agentController = new AgentController();
