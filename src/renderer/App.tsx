import React from 'react';
import ChatPane from './components/Chat/ChatPane';

function App() {
  return (
    <div className="flex h-screen bg-gray-900">
      <div className="flex-1 flex flex-col">
        <ChatPane />
      </div>
    </div>
  );
}

export default App;
