import React from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { useIPC } from '../../hooks/useIPC';

function ChatPane() {
  const { isStreaming } = useIPC();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Gary - DM Assistant</h1>
          {isStreaming && (
            <div className="flex items-center gap-2 text-purple-400">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm">Gary is thinking...</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <MessageList />
      </div>

      {/* Input */}
      <div className="border-t border-gray-700">
        <ChatInput />
      </div>
    </div>
  );
}

export default ChatPane;
