import React, { useState } from 'react';
import type { ApprovalRequest } from '../../../common/types/ipc';

interface ApprovalModalProps {
  request: ApprovalRequest;
  onApprove: () => void;
  onReject: (feedback: string) => void;
}

function ApprovalModal({ request, onApprove, onReject }: ApprovalModalProps) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleReject = () => {
    if (!feedback.trim()) {
      return; // Feedback is required
    }
    onReject(feedback);
  };

  const isNewFile = request.beforeContent === null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            Approve File Write
          </h2>
          <p className="text-sm text-gray-400 font-mono">
            {request.filePath}
          </p>
          {isNewFile && (
            <p className="text-sm text-green-400 mt-1">New file</p>
          )}
        </div>

        {/* Diff Viewer */}
        <div className="flex-1 overflow-hidden flex">
          {/* Before */}
          <div className="flex-1 flex flex-col border-r border-gray-700">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
              <h3 className="text-sm font-medium text-gray-300">
                {isNewFile ? '(new file)' : 'Before'}
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-950">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {isNewFile ? '' : request.beforeContent}
              </pre>
            </div>
          </div>

          {/* After */}
          <div className="flex-1 flex flex-col">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
              <h3 className="text-sm font-medium text-gray-300">After</h3>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-950">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {request.afterContent}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="border-t border-gray-700 p-6">
          {!showRejectInput ? (
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRejectInput(true)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Reject
              </button>
              <button
                onClick={onApprove}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Approve
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Rejection feedback (required):
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Explain why you're rejecting this change..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowRejectInput(false);
                    setFeedback('');
                  }}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!feedback.trim()}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Reject with Feedback
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApprovalModal;
