import React, { useState } from 'react';
import { useIPC } from '../../hooks/useIPC';

function ChatInput() {
  const [input, setInput] = useState('');
  const { sendMessage } = useIPC();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Send via IPC
    await sendMessage(input);

    // Clear input
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Gary anything about your campaign..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </form>
  );
}

export default ChatInput;
