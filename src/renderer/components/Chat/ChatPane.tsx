import React, { useState } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { useIPC } from '../../hooks/useIPC';
import { useChatStore } from '../../store/chatStore';

function ChatPane() {
  const { isStreaming } = useIPC();
  const getTotalTokens = useChatStore((state) => state.getTotalTokens);
  const getContextUsagePercent = useChatStore((state) => state.getContextUsagePercent);
  const messages = useChatStore((state) => state.messages);
  const replaceWithSummary = useChatStore((state) => state.replaceWithSummary);

  const [isCompacting, setIsCompacting] = useState(false);

  // Recalculate on every render (efficient enough with memoization)
  const totalTokens = getTotalTokens();
  const usagePercent = getContextUsagePercent();

  const formatTokenCount = (tokens: number): string => {
    if (tokens < 1000) return `${tokens}`;
    return `${(tokens / 1000).toFixed(1)}k`;
  };

  const getProgressBarColor = (): string => {
    if (usagePercent >= 75) return 'bg-red-500';
    if (usagePercent >= 50) return 'bg-yellow-500';
    return 'bg-purple-500';
  };

  const handleCompact = async () => {
    if (messages.length === 0) return;

    setIsCompacting(true);
    try {
      const response = await window.ipc.compactConversation({ messages });

      if (response.success && response.summary) {
        replaceWithSummary(response.summary);
        console.log('Conversation compacted successfully');
      } else {
        console.error('Compaction failed:', response.error);
        // Could show error message to user
      }
    } catch (error) {
      console.error('Compaction failed:', error);
    } finally {
      setIsCompacting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Gary - DM Assistant</h1>

          <div className="flex items-center gap-4">
            {/* Token counter with progress bar */}
            {messages.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {formatTokenCount(totalTokens)} tokens ({usagePercent}%)
                    </span>
                    <button
                      onClick={handleCompact}
                      disabled={isStreaming || isCompacting || messages.length === 0}
                      className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded transition-colors"
                      title="Compact conversation to summarize and free up context"
                    >
                      {isCompacting ? 'Compacting...' : 'Compact'}
                    </button>
                  </div>
                  <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressBarColor()} transition-all duration-300`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Streaming indicator */}
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
