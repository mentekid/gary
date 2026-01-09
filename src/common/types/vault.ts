// Vault and file system types

export enum FileState {
  NOT_ACCESSED = 'not_accessed',
  PEEKED = 'peeked',
  READ = 'read',
  MODIFIED = 'modified',
}

export interface FileEntry {
  name: string;
  path: string; // Relative to vault root
  type: 'file' | 'directory';
  extension?: string;
  size?: number; // File size in bytes
  modified?: number; // Unix timestamp
}

export interface TreeNode extends FileEntry {
  id: string; // Unique ID (use path as ID)
  children?: TreeNode[];
  parent?: string; // Parent path
  isExpanded?: boolean; // Managed by react-arborist
  state?: FileState; // File access state (for M6+)
  icon?: string; // Icon name/component
}
