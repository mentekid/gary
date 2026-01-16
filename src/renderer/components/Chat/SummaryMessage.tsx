import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SummaryMessageProps {
  content: string;
}

function SummaryMessage({ content }: SummaryMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      {/* Divider line */}
      <div className="flex items-center gap-3 text-xs text-gray-500 py-2">
        <div className="flex-1 h-px bg-gray-700" />
        <span>Gary has summarized everything above this line</span>
        <div className="flex-1 h-px bg-gray-700" />
      </div>

      {/* Summary box */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {/* Header - always visible, clickable */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-semibold text-gray-300">
              {isExpanded ? 'Conversation Summary' : 'Conversation Summary (click to expand)'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {isExpanded ? 'Click to collapse' : 'Click to view'}
          </span>
        </button>

        {/* Expandable content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-700">
            <div className="prose prose-invert prose-sm max-w-none mt-3 text-gray-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SummaryMessage;
