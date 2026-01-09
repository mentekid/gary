import React from 'react';
import { Tree, NodeRendererProps } from 'react-arborist';
import { useVaultStore } from '../../store/vaultStore';
import { TreeNode, FileState } from '../../../common/types/vault';
import { FileStateIcon } from './FileStateIcon';

// Simple SVG icons as components
function FolderIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className="w-4 h-4 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      {isOpen ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      )}
    </svg>
  );
}

function FileIcon({ extension }: { extension?: string }) {
  const isMarkdown = extension === 'md';
  return (
    <svg
      className={`w-4 h-4 ${isMarkdown ? 'text-purple-500' : 'text-gray-500'}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

// Custom node renderer for the tree
function Node({ node, style, dragHandle }: NodeRendererProps<TreeNode>) {
  const fileStates = useVaultStore((state) => state.fileStates);
  const isDirectory = node.data.type === 'directory';
  const fileState = fileStates.get(node.data.path) || FileState.NOT_ACCESSED;

  return (
    <div
      ref={dragHandle}
      style={style}
      className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-800 ${
        node.isSelected ? 'bg-gray-700' : ''
      }`}
      onClick={() => node.isInternal && node.toggle()}
    >
      {/* Expand/collapse arrow for directories */}
      {isDirectory && (
        <span className="w-4 flex items-center justify-center">
          {node.isOpen ? (
            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      )}
      {!isDirectory && <span className="w-4" />}

      {/* Icon */}
      {isDirectory ? (
        <FolderIcon isOpen={node.isOpen} />
      ) : (
        <FileIcon extension={node.data.extension} />
      )}

      {/* File state icon (only for files) */}
      {!isDirectory && <FileStateIcon state={fileState} />}

      {/* Name */}
      <span className={`text-sm ${isDirectory ? 'text-white' : 'text-gray-300'}`}>
        {node.data.name}
      </span>
    </div>
  );
}

export function FileTree() {
  const fileTree = useVaultStore((state) => state.fileTree);
  const isLoadingVault = useVaultStore((state) => state.isLoadingVault);
  const isLoadingTree = useVaultStore((state) => state.isLoadingTree);
  const error = useVaultStore((state) => state.error);
  const vaultPath = useVaultStore((state) => state.vaultPath);
  const selectVault = useVaultStore((state) => state.selectVault);
  const clearError = useVaultStore((state) => state.clearError);

  // Loading state
  if (isLoadingVault || isLoadingTree) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <button
          onClick={() => {
            clearError();
            selectVault();
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state (no vault selected)
  if (!vaultPath || fileTree.length === 0) {
    return (
      <div className="p-4">
        <p className="text-gray-500 text-sm mb-4">
          {!vaultPath ? 'No vault selected' : 'Vault is empty'}
        </p>
        <button
          onClick={selectVault}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
        >
          Select Vault
        </button>
      </div>
    );
  }

  // Render tree
  return (
    <div className="h-full">
      <Tree
        data={fileTree}
        openByDefault={false}
        width="100%"
        height={window.innerHeight - 120} // Subtract header height
        indent={24}
        rowHeight={32}
      >
        {Node}
      </Tree>
    </div>
  );
}
