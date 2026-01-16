import React, { useState, useRef, useEffect } from 'react';
import { useIPC } from '../../hooks/useIPC';
import { useChatStore } from '../../store/chatStore';

function ChatInput() {
  const [input, setInput] = useState('');
  const { sendMessage, isStreaming } = useIPC();
  const getContextUsagePercent = useChatStore((state) => state.getContextUsagePercent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const usagePercent = getContextUsagePercent();
  const isContextFull = usagePercent >= 75;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;
    if (isContextFull) return; // Prevent sending if context is too full

    // Send via IPC
    await sendMessage(input);

    // Clear input
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isContextFull
              ? 'Context is full. Please compact the conversation before continuing.'
              : 'Ask Gary anything about your campaign... (Shift+Enter for new line)'
          }
          disabled={isStreaming || isContextFull}
          rows={1}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '48px', maxHeight: '200px' }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming || isContextFull}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
        >
          {isStreaming ? 'Thinking...' : 'Send'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {isContextFull ? (
          <span className="text-red-400">
            Context usage at {usagePercent}%. Please compact the conversation to continue.
          </span>
        ) : (
          'Press Enter to send, Shift+Enter for new line'
        )}
      </p>
    </form>
  );
}

export default ChatInput;
