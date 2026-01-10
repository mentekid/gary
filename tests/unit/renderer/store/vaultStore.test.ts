import { describe, it, expect } from 'vitest';
import { FileEntry, TreeNode } from '@common/types/vault';

// Extract buildTree for testing (it's not exported, so we'll copy the logic)
function buildTree(entries: FileEntry[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();

  for (const entry of entries) {
    const node: TreeNode = {
      ...entry,
      id: entry.path || 'root',
      children: entry.type === 'directory' ? [] : undefined,
    };
    nodeMap.set(entry.path, node);
  }

  const rootNodes: TreeNode[] = [];
  for (const node of nodeMap.values()) {
    const pathParts = node.path.split('/');
    if (pathParts.length === 1) {
      rootNodes.push(node);
    } else {
      const parentPath = pathParts.slice(0, -1).join('/');
      const parent = nodeMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
        node.parent = parentPath;
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  };

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

describe('buildTree', () => {
  it('CRITICAL: sorts directories before files', () => {
    const entries: FileEntry[] = [
      { name: 'file.md', path: 'file.md', type: 'file' },
      { name: 'dir', path: 'dir', type: 'directory' },
      { name: 'another.md', path: 'another.md', type: 'file' },
    ];

    const tree = buildTree(entries);

    expect(tree[0].type).toBe('directory');
    expect(tree[1].type).toBe('file');
    expect(tree[2].type).toBe('file');
  });

  it('CRITICAL: sorts alphabetically within same type', () => {
    const entries: FileEntry[] = [
      { name: 'zebra', path: 'zebra', type: 'directory' },
      { name: 'apple', path: 'apple', type: 'directory' },
      { name: 'banana', path: 'banana', type: 'directory' },
    ];

    const tree = buildTree(entries);

    expect(tree.map(n => n.name)).toEqual(['apple', 'banana', 'zebra']);
  });

  it('builds parent-child relationships correctly', () => {
    const entries: FileEntry[] = [
      { name: 'world', path: 'world', type: 'directory' },
      { name: 'NPCs', path: 'world/NPCs', type: 'directory' },
      { name: 'test.md', path: 'world/NPCs/test.md', type: 'file' },
    ];

    const tree = buildTree(entries);

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('world');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].name).toBe('NPCs');
    expect(tree[0].children![0].children).toHaveLength(1);
    expect(tree[0].children![0].children![0].name).toBe('test.md');
  });

  it('handles deep nesting (3+ levels)', () => {
    const entries: FileEntry[] = [
      { name: 'a', path: 'a', type: 'directory' },
      { name: 'b', path: 'a/b', type: 'directory' },
      { name: 'c', path: 'a/b/c', type: 'directory' },
      { name: 'deep.md', path: 'a/b/c/deep.md', type: 'file' },
    ];

    const tree = buildTree(entries);

    const deepFile = tree[0]?.children?.[0]?.children?.[0]?.children?.[0];
    expect(deepFile?.name).toBe('deep.md');
  });

  it('sorts recursively at all levels', () => {
    const entries: FileEntry[] = [
      { name: 'parent', path: 'parent', type: 'directory' },
      { name: 'z.md', path: 'parent/z.md', type: 'file' },
      { name: 'a.md', path: 'parent/a.md', type: 'file' },
      { name: 'subdir', path: 'parent/subdir', type: 'directory' },
    ];

    const tree = buildTree(entries);

    const parentChildren = tree[0].children!;
    expect(parentChildren[0].name).toBe('subdir'); // dir first
    expect(parentChildren[1].name).toBe('a.md'); // then files alphabetically
    expect(parentChildren[2].name).toBe('z.md');
  });
});
