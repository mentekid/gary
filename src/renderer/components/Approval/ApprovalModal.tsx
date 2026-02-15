import React, { useState, useMemo } from 'react';
import { structuredPatch } from 'diff';
import type { ApprovalRequest } from '../../../common/types/ipc';

interface ApprovalModalProps {
  request: ApprovalRequest;
  onApprove: () => void;
  onReject: (feedback: string) => void;
}

function ApprovalModal({ request, onApprove, onReject }: ApprovalModalProps) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Debug logging for approval modal
  React.useEffect(() => {
    console.log('[APPROVAL_MODAL] Rendering with request:', {
      toolUseId: request.toolUseId,
      filePath: request.filePath,
      beforeContentLength: request.beforeContent?.length || 0,
      afterContentLength: request.afterContent?.length || 0,
      afterContentPreview: request.afterContent?.substring(0, 100) || '(empty)',
      isNewFile: request.beforeContent === null,
    });
  }, [request]);

  const handleReject = () => {
    if (!feedback.trim()) {
      return; // Feedback is required
    }
    console.log('[APPROVAL_MODAL] Rejecting with feedback:', feedback);
    onReject(feedback);
  };

  const handleApproveClick = () => {
    console.log('[APPROVAL_MODAL] Approving write');
    onApprove();
  };

  const isNewFile = request.beforeContent === null;

  const diffLines = useMemo(() => {
    const before = request.beforeContent ?? '';
    const after = request.afterContent ?? '';
    const patch = structuredPatch(
      request.filePath,
      request.filePath,
      before,
      after,
      '',
      '',
      { context: 5 }
    );

    const lines: Array<{ type: 'context' | 'add' | 'remove' | 'hunk-header'; text: string; lineNo?: string }> = [];

    for (const hunk of patch.hunks) {
      lines.push({
        type: 'hunk-header',
        text: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
      });

      let oldLine = hunk.oldStart;
      let newLine = hunk.newStart;

      for (const line of hunk.lines) {
        if (line.startsWith('+')) {
          lines.push({ type: 'add', text: line.substring(1), lineNo: `${newLine}` });
          newLine++;
        } else if (line.startsWith('-')) {
          lines.push({ type: 'remove', text: line.substring(1), lineNo: `${oldLine}` });
          oldLine++;
        } else {
          lines.push({ type: 'context', text: line.substring(1), lineNo: `${newLine}` });
          oldLine++;
          newLine++;
        }
      }
    }

    return lines;
  }, [request]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            Approve File {isNewFile ? 'Create' : 'Edit'}
          </h2>
          <p className="text-sm text-gray-400 font-mono">
            {request.filePath}
          </p>
          {isNewFile && (
            <p className="text-sm text-green-400 mt-1">New file</p>
          )}
        </div>

        {/* Unified Diff Viewer */}
        <div className="flex-1 overflow-auto bg-gray-950 font-mono text-sm">
          {diffLines.map((line, i) => {
            if (line.type === 'hunk-header') {
              return (
                <div key={i} className="bg-gray-800 text-purple-400 px-4 py-1 border-y border-gray-700">
                  {line.text}
                </div>
              );
            }

            const bgClass =
              line.type === 'add' ? 'bg-green-900/30' :
              line.type === 'remove' ? 'bg-red-900/30' :
              '';
            const textClass =
              line.type === 'add' ? 'text-green-300' :
              line.type === 'remove' ? 'text-red-300' :
              'text-gray-400';
            const prefix =
              line.type === 'add' ? '+' :
              line.type === 'remove' ? '-' :
              ' ';

            return (
              <div key={i} className={`${bgClass} flex`}>
                <span className="w-12 shrink-0 text-right pr-2 text-gray-600 select-none border-r border-gray-800 px-1">
                  {line.lineNo}
                </span>
                <span className={`${textClass} pl-2 whitespace-pre-wrap flex-1`}>
                  {prefix} {line.text}
                </span>
              </div>
            );
          })}
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
                onClick={handleApproveClick}
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
