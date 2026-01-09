import { create } from 'zustand';
import { TreeNode, FileEntry, FileState } from '../../common/types/vault';

interface VaultState {
  // Vault metadata
  vaultPath: string | null;
  vaultName: string | null;

  // Loading states
  isLoadingVault: boolean;
  isLoadingTree: boolean;

  // File tree data
  fileTree: TreeNode[];

  // File access states
  fileStates: Map<string, FileState>;

  // Errors and warnings
  error: string | null;
  warning: string | null;

  // Actions
  selectVault: () => Promise<void>;
  loadFileTree: () => Promise<void>;
  updateFileState: (path: string, state: FileState) => void;
  clearError: () => void;
}

// Helper function to build tree structure from flat file entries
function buildTree(entries: FileEntry[]): TreeNode[] {
  // Create a map to quickly find entries by path
  const nodeMap = new Map<string, TreeNode>();

  // First pass: create all nodes
  for (const entry of entries) {
    const node: TreeNode = {
      ...entry,
      id: entry.path || 'root',
      children: entry.type === 'directory' ? [] : undefined,
    };
    nodeMap.set(entry.path, node);
  }

  // Second pass: build parent-child relationships
  const rootNodes: TreeNode[] = [];
  for (const node of nodeMap.values()) {
    const pathParts = node.path.split('/');
    if (pathParts.length === 1) {
      // Root level node
      rootNodes.push(node);
    } else {
      // Find parent
      const parentPath = pathParts.slice(0, -1).join('/');
      const parent = nodeMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
        node.parent = parentPath;
      }
    }
  }

  // Sort: directories first, then files, alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  };

  // Recursively sort all nodes
  const sortTree = (nodes: TreeNode[]): TreeNode[] => {
    const sorted = sortNodes(nodes);
    for (const node of sorted) {
      if (node.children) {
        node.children = sortTree(node.children);
      }
    }
    return sorted;
  };

  return sortTree(rootNodes);
}

export const useVaultStore = create<VaultState>((set, get) => ({
  // Initial state
  vaultPath: null,
  vaultName: null,
  isLoadingVault: false,
  isLoadingTree: false,
  fileTree: [],
  fileStates: new Map(),
  error: null,
  warning: null,

  // Actions
  selectVault: async () => {
    set({ isLoadingVault: true, error: null, warning: null });

    try {
      const response = await window.ipc.selectVault();

      if (!response.success) {
        set({
          isLoadingVault: false,
          error: response.error || 'Failed to select vault',
        });
        return;
      }

      const vaultPath = response.vaultPath!;
      const vaultName = vaultPath.split('/').pop() || 'Unknown';

      set({
        vaultPath,
        vaultName,
        warning: response.warning || null,
      });

      // Load file tree after successful vault selection
      await get().loadFileTree();
    } catch (err: any) {
      set({
        isLoadingVault: false,
        error: `Failed to select vault: ${err.message}`,
      });
    }
  },

  loadFileTree: async () => {
    set({ isLoadingTree: true, error: null });

    try {
      const response = await window.ipc.listDirectory({ path: '' });

      if (!response.success) {
        set({
          isLoadingTree: false,
          isLoadingVault: false,
          error: response.error || 'Failed to load file tree',
        });
        return;
      }

      const fileTree = buildTree(response.entries || []);

      set({
        fileTree,
        isLoadingTree: false,
        isLoadingVault: false,
      });
    } catch (err: any) {
      set({
        isLoadingTree: false,
        isLoadingVault: false,
        error: `Failed to load file tree: ${err.message}`,
      });
    }
  },

  updateFileState: (path, state) => {
    set((prevState) => {
      const newStates = new Map(prevState.fileStates);
      newStates.set(path, state);
      return { fileStates: newStates };
    });
  },

  clearError: () => {
    set({ error: null, warning: null });
  },
}));
