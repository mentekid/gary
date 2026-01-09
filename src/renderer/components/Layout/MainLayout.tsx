import React from 'react';
import ChatPane from '../Chat/ChatPane';
import { FileTree } from '../FileBrowser/FileTree';
import { useVaultStore } from '../../store/vaultStore';

export function MainLayout() {
  const vaultName = useVaultStore((state) => state.vaultName);
  const warning = useVaultStore((state) => state.warning);

  return (
    <div className="flex h-screen bg-gray-900">
      {/* File Browser Sidebar */}
      <aside className="w-64 border-r border-gray-700 flex flex-col">
        {/* Vault Header */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Vault
          </h2>
          {vaultName ? (
            <p className="text-white font-medium mt-1 truncate" title={vaultName}>
              {vaultName}
            </p>
          ) : (
            <p className="text-gray-500 mt-1">No vault selected</p>
          )}
          {warning && (
            <p className="text-yellow-500 text-xs mt-2">{warning}</p>
          )}
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto">
          <FileTree />
        </div>
      </aside>

      {/* Main Content - Chat */}
      <main className="flex-1 flex flex-col">
        <ChatPane />
      </main>
    </div>
  );
}
