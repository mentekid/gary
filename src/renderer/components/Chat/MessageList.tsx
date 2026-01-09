import React from 'react';

// Hardcoded messages for M2
const HARDCODED_MESSAGES = [
  {
    id: '1',
    role: 'user' as const,
    content: 'Hello Gary! I need help planning my next D&D session.',
  },
  {
    id: '2',
    role: 'assistant' as const,
    content: "Hello! I'd be happy to help you plan your session. What kind of adventure are you thinking about? I can help you create NPCs, design encounters, flesh out locations, or brainstorm plot hooks.",
  },
  {
    id: '3',
    role: 'user' as const,
    content: 'I want to create a mysterious tavern keeper who knows more than they let on.',
  },
];

function MessageList() {
  return (
    <div className="px-6 py-4 space-y-4">
      {HARDCODED_MESSAGES.map((message) => (
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
      ))}
    </div>
  );
}

export default MessageList;
