import type { ApprovalRequest } from '../../common/types/ipc';

/**
 * Context object passed to tool executions
 * Allows tools to request approval for operations (M8)
 */
export class ToolExecutionContext {
  public approvalRequest: ApprovalRequest | null = null;

  /**
   * Request approval for an operation
   * Tool execution will be paused until user responds
   */
  requestApproval(request: ApprovalRequest): void {
    this.approvalRequest = request;
  }

  /**
   * Check if approval was requested
   */
  needsApproval(): boolean {
    return this.approvalRequest !== null;
  }

  /**
   * Clear approval request
   */
  clear(): void {
    this.approvalRequest = null;
  }
}
