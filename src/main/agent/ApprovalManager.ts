import { BrowserWindow } from 'electron';
import type { ApprovalRequest, ApprovalResponse } from '../../common/types/ipc';

/**
 * Manages approval workflow for file writes (M8)
 * Handles pausing agent execution until user approves or rejects
 */
export class ApprovalManager {
  private pendingApprovals = new Map<
    string,
    {
      request: ApprovalRequest;
      resolve: (response: ApprovalResponse) => void;
    }
  >();

  /**
   * Request approval for a write operation
   * Returns a promise that resolves when user responds
   */
  async requestApproval(request: ApprovalRequest): Promise<ApprovalResponse> {
    return new Promise((resolve) => {
      // Store the resolver
      this.pendingApprovals.set(request.toolUseId, { request, resolve });

      // Approval request is sent via agent response stream (see AgentController)
      // This method just sets up the promise and waits
    });
  }

  /**
   * Called by IPC handler when user responds to approval
   */
  handleApprovalResponse(response: ApprovalResponse): void {
    const pending = this.pendingApprovals.get(response.toolUseId);
    if (!pending) {
      console.warn(`No pending approval found for toolUseId: ${response.toolUseId}`);
      return;
    }

    // Resolve the promise, allowing agent loop to continue
    pending.resolve(response);
    this.pendingApprovals.delete(response.toolUseId);
  }

  /**
   * Clear all pending approvals (e.g., on vault change or app close)
   */
  clear(): void {
    // Reject all pending approvals
    for (const [toolUseId, { resolve }] of this.pendingApprovals) {
      resolve({
        toolUseId,
        approved: false,
        feedback: 'Approval cancelled',
      });
    }
    this.pendingApprovals.clear();
  }

  /**
   * Check if there are pending approvals
   */
  hasPending(): boolean {
    return this.pendingApprovals.size > 0;
  }
}

// Singleton instance
export const approvalManager = new ApprovalManager();
