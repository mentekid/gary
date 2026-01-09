import React from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

function ChatPane() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-semibold text-white">Gary - DM Assistant</h1>
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
