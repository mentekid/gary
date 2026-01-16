import type { ApprovalRequest, PlanningRequest } from '../../common/types/ipc';

/**
 * Context object passed to tool executions
 * Allows tools to request approval for operations (M8) and planning input (M10)
 */
export class ToolExecutionContext {
  public approvalRequest: ApprovalRequest | null = null;
  public planningRequest: PlanningRequest | null = null;

  /**
   * Request approval for an operation
   * Tool execution will be paused until user responds
   */
  requestApproval(request: ApprovalRequest): void {
    this.approvalRequest = request;
  }

  /**
   * Request planning input from user (M10)
   * Tool execution will be paused until user provides answers
   */
  requestPlanning(request: PlanningRequest): void {
    this.planningRequest = request;
  }

  /**
   * Check if approval was requested
   */
  needsApproval(): boolean {
    return this.approvalRequest !== null;
  }

  /**
   * Check if planning was requested (M10)
   */
  needsPlanning(): boolean {
    return this.planningRequest !== null;
  }

  /**
   * Clear approval and planning requests
   */
  clear(): void {
    this.approvalRequest = null;
    this.planningRequest = null;
  }
}
