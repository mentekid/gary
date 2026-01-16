import { useState } from 'react';
import type { PlanningRequest } from '../../common/types/ipc';

/**
 * Hook to manage planning workflow state (M10)
 * Mirrors useApprovalListener pattern
 */
export function usePlanningListener() {
  const [pendingPlanning, setPendingPlanning] = useState<PlanningRequest | null>(null);

  const requestPlanning = (request: PlanningRequest) => {
    setPendingPlanning(request);
  };

  const handleSubmit = (answers: Record<string, string>) => {
    if (!pendingPlanning) return;

    window.ipc.respondToPlanning({
      toolUseId: pendingPlanning.toolUseId,
      answers,
    });

    setPendingPlanning(null);
  };

  const handleCancel = () => {
    if (!pendingPlanning) return;

    window.ipc.respondToPlanning({
      toolUseId: pendingPlanning.toolUseId,
      answers: {}, // Empty answers = cancelled
    });

    setPendingPlanning(null);
  };

  return {
    pendingPlanning,
    requestPlanning,
    handleSubmit,
    handleCancel,
  };
}
