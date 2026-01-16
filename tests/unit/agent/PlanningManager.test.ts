import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningManager } from '../../../src/main/agent/PlanningManager';
import type { PlanningRequest, PlanningResponse } from '../../../src/common/types/ipc';

describe('PlanningManager (M10)', () => {
  let manager: PlanningManager;

  beforeEach(() => {
    manager = new PlanningManager();
  });

  it('should resolve promise when response is received', async () => {
    const request: PlanningRequest = {
      toolUseId: 'test_1',
      questions: [{ id: 'q_0', question: 'Test?' }],
    };

    const responsePromise = manager.requestPlanning(request);
    expect(manager.hasPending('test_1')).toBe(true);

    manager.handlePlanningResponse({
      toolUseId: 'test_1',
      answers: { q_0: 'Answer' },
    });

    const response = await responsePromise;
    expect(response.answers.q_0).toBe('Answer');
    expect(manager.hasPending('test_1')).toBe(false);
  });

  it('should handle multiple requests independently', async () => {
    const req1: PlanningRequest = {
      toolUseId: 'test_1',
      questions: [{ id: 'q_0', question: 'Q1?' }],
    };
    const req2: PlanningRequest = {
      toolUseId: 'test_2',
      questions: [{ id: 'q_0', question: 'Q2?' }],
    };

    const promise1 = manager.requestPlanning(req1);
    const promise2 = manager.requestPlanning(req2);

    // Respond to first
    manager.handlePlanningResponse({
      toolUseId: 'test_1',
      answers: { q_0: 'A1' },
    });

    const response1 = await promise1;
    expect(response1.answers.q_0).toBe('A1');
    expect(manager.hasPending('test_2')).toBe(true);

    // Respond to second
    manager.handlePlanningResponse({
      toolUseId: 'test_2',
      answers: { q_0: 'A2' },
    });

    const response2 = await promise2;
    expect(response2.answers.q_0).toBe('A2');
    expect(manager.hasPending('test_1')).toBe(false);
    expect(manager.hasPending('test_2')).toBe(false);
  });

  it('should clear all pending requests with empty answers', async () => {
    const request: PlanningRequest = {
      toolUseId: 'test_1',
      questions: [{ id: 'q_0', question: 'Test?' }],
    };

    const promise = manager.requestPlanning(request);
    expect(manager.hasPending('test_1')).toBe(true);

    manager.clear();

    const response = await promise;
    expect(response.answers).toEqual({});
    expect(manager.hasPending('test_1')).toBe(false);
  });

  it('should correctly report pending status', () => {
    expect(manager.hasPending('test_1')).toBe(false);

    const request: PlanningRequest = {
      toolUseId: 'test_1',
      questions: [{ id: 'q_0', question: 'Test?' }],
    };
    manager.requestPlanning(request);

    expect(manager.hasPending('test_1')).toBe(true);

    manager.handlePlanningResponse({
      toolUseId: 'test_1',
      answers: { q_0: 'Answer' },
    });

    expect(manager.hasPending('test_1')).toBe(false);
  });

  it('should handle multiple answers in response', async () => {
    const request: PlanningRequest = {
      toolUseId: 'test_multi',
      questions: [
        { id: 'q_0', question: 'First?' },
        { id: 'q_1', question: 'Second?' },
        { id: 'q_2', question: 'Third?' },
      ],
    };

    const promise = manager.requestPlanning(request);

    manager.handlePlanningResponse({
      toolUseId: 'test_multi',
      answers: {
        q_0: 'Answer 1',
        q_1: 'Answer 2',
        q_2: 'Answer 3',
      },
    });

    const response = await promise;
    expect(response.answers.q_0).toBe('Answer 1');
    expect(response.answers.q_1).toBe('Answer 2');
    expect(response.answers.q_2).toBe('Answer 3');
  });
});
