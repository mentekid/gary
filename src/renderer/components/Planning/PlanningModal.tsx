import React, { useState } from 'react';
import type { PlanningRequest } from '../../../common/types/ipc';

interface PlanningModalProps {
  request: PlanningRequest;
  onSubmit: (answers: Record<string, string>) => void;
  onCancel: () => void;
}

/**
 * Modal for collecting planning answers from user (M10)
 * All questions are required before submission
 */
function PlanningModal({ request, onSubmit, onCancel }: PlanningModalProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    // Initialize with empty strings
    Object.fromEntries(request.questions.map((q) => [q.id, '']))
  );

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = () => {
    // Validate all questions answered
    const allAnswered = request.questions.every((q) => answers[q.id]?.trim());
    if (!allAnswered) {
      return; // Validation prevents submission
    }
    onSubmit(answers);
  };

  const allAnswered = request.questions.every((q) => answers[q.id]?.trim());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            Planning Questions
          </h2>
          <p className="text-sm text-gray-400">
            Gary needs more information to continue. Please answer all questions.
          </p>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {request.questions.map((q, idx) => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {idx + 1}. {q.question}
                {!answers[q.id]?.trim() && (
                  <span className="text-red-400 ml-1">*</span>
                )}
              </label>
              <textarea
                value={answers[q.id]}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                placeholder="Enter your answer..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-6">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Submit Answers
            </button>
          </div>
          {!allAnswered && (
            <p className="text-sm text-gray-400 mt-3 text-right">
              All questions must be answered
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlanningModal;
