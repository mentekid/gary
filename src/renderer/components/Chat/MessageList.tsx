import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '../../store/chatStore';
import { useIPC } from '../../hooks/useIPC';
import SummaryMessage from './SummaryMessage';

function MessageList() {
  const messages = useChatStore((state) => state.messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage } = useIPC();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isErrorMessage = (content: string): boolean => {
    return content.startsWith('Error:');
  };

  const handleRetry = (messageIndex: number) => {
    // Find the previous user message
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        sendMessage(messages[i].content);
        return;
      }
    }
  };

  return (
    <div className="px-6 py-4 space-y-4">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          <p className="text-lg">Welcome to Gary!</p>
          <p className="text-sm mt-2">Start a conversation to plan your D&D session.</p>
        </div>
      ) : (
        messages.map((message, index) => {
          // Handle summary messages
          if (message.role === 'summary') {
            return <SummaryMessage key={message.id} content={message.content} />;
          }

          // Handle regular messages
          const isError = message.role === 'assistant' && isErrorMessage(message.content);
          return (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : isError
                    ? 'bg-red-900 text-red-100'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                <div className="text-sm mb-1 font-semibold opacity-70">
                  {message.role === 'user' ? 'You' : 'Gary'}
                </div>
                <div className="text-base prose prose-invert prose-sm max-w-none">
                  {message.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
                {isError && (
                  <button
                    onClick={() => handleRetry(index)}
                    className="mt-3 px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
