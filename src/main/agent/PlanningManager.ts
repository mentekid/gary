import type { PlanningRequest, PlanningResponse } from '../../common/types/ipc';

/**
 * Manages planning workflow for multi-question collection (M10)
 * Handles pausing agent execution until user provides answers
 */
export class PlanningManager {
  private pendingPlanning = new Map<
    string,
    {
      request: PlanningRequest;
      resolve: (response: PlanningResponse) => void;
    }
  >();

  /**
   * Request planning input from user
   * Returns a promise that resolves when user responds
   */
  async requestPlanning(request: PlanningRequest): Promise<PlanningResponse> {
    return new Promise((resolve) => {
      // Store the resolver
      this.pendingPlanning.set(request.toolUseId, { request, resolve });

      // Planning request is sent via agent response stream (see AgentController)
      // This method just sets up the promise and waits
    });
  }

  /**
   * Called by IPC handler when user responds to planning
   */
  handlePlanningResponse(response: PlanningResponse): void {
    const pending = this.pendingPlanning.get(response.toolUseId);
    if (!pending) {
      console.warn(`No pending planning found for toolUseId: ${response.toolUseId}`);
      return;
    }

    // Resolve the promise, allowing agent loop to continue
    pending.resolve(response);
    this.pendingPlanning.delete(response.toolUseId);
  }

  /**
   * Clear all pending planning requests (e.g., on vault change or app close)
   */
  clear(): void {
    // Reject all pending planning with empty answers
    for (const [toolUseId, { resolve }] of this.pendingPlanning) {
      resolve({
        toolUseId,
        answers: {}, // Empty answers = cancelled
      });
    }
    this.pendingPlanning.clear();
  }

  /**
   * Check if there are pending planning requests
   */
  hasPending(): boolean {
    return this.pendingPlanning.size > 0;
  }
}

// Singleton instance
export const planningManager = new PlanningManager();
