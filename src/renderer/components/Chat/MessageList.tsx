import React from 'react';
import { useChatStore } from '../../store/chatStore';

function MessageList() {
  const messages = useChatStore((state) => state.messages);

  return (
    <div className="px-6 py-4 space-y-4">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          <p className="text-lg">Welcome to Gary!</p>
          <p className="text-sm mt-2">Start a conversation to plan your D&D session.</p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              <div className="text-sm mb-1 font-semibold opacity-70">
                {message.role === 'user' ? 'You' : 'Gary'}
              </div>
              <div className="text-base">{message.content}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default MessageList;
