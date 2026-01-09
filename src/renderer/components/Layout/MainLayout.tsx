import React, { useState, useRef, useEffect } from 'react';
import ChatPane from '../Chat/ChatPane';
import { FileTree } from '../FileBrowser/FileTree';
import { useVaultStore } from '../../store/vaultStore';

export function MainLayout() {
  const vaultName = useVaultStore((state) => state.vaultName);
  const warning = useVaultStore((state) => state.warning);
  const selectVault = useVaultStore((state) => state.selectVault);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar-width');
    return saved ? parseInt(saved, 10) : 256;
  });

  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem('sidebar-width', String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(Math.max(200, e.clientX), 500);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="flex h-screen bg-gray-900">
      {/* File Browser Sidebar */}
      {!isCollapsed && (
        <aside
          ref={sidebarRef}
          style={{ width: `${sidebarWidth}px` }}
          className="border-r border-gray-700 flex flex-col relative"
        >
          {/* Vault Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                Vault
              </h2>
              <button
                onClick={() => setIsCollapsed(true)}
                className="text-gray-400 hover:text-white"
                title="Collapse sidebar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            {vaultName ? (
              <button
                onClick={selectVault}
                className="text-white font-medium mt-1 truncate hover:text-purple-400 text-left w-full"
                title={`${vaultName}\n\nClick to select a different vault`}
              >
                {vaultName}
              </button>
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

          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500 transition-colors"
            onMouseDown={() => setIsResizing(true)}
          />
        </aside>
      )}

      {/* Collapsed Sidebar Toggle Button */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-8 border-r border-gray-700 flex items-center justify-center hover:bg-gray-800 transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main Content - Chat */}
      <main className="flex-1 flex flex-col">
        <ChatPane />
      </main>
    </div>
  );
}
