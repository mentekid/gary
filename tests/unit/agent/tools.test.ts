import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow } from 'electron';
import { executeToolCall, tools } from '@main/agent/tools';
import { fileSystemManager } from '@main/vault/FileSystemManager';
import { fileStateTracker } from '@main/vault/FileStateTracker';
import { FileState } from '@common/types/vault';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(() => [
      {
        webContents: {
          send: vi.fn(),
        },
      },
    ]),
  },
}));

describe('Write Tool (M7)', () => {
  let testVaultPath: string;

  beforeEach(async () => {
    // Create a temporary vault directory for testing
    testVaultPath = path.join(os.tmpdir(), `gary-test-${Date.now()}`);
    await fs.mkdir(testVaultPath, { recursive: true });
    fileSystemManager.setVaultPath(testVaultPath);
    fileStateTracker.clear();
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(testVaultPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('write tool validation', () => {
    it('CRITICAL: rejects write to existing file without prior read', async () => {
      // Create a file in the vault
      const testFile = 'test.md';
      await fs.writeFile(path.join(testVaultPath, testFile), 'original content');

      // Try to write without reading first
      const result = await executeToolCall('write', {
        path: testFile,
        content: 'new content',
      });

      expect(result).toContain('Error: Must read()');
      expect(result).toContain('not_accessed');
    });

    it('CRITICAL: rejects write to peeked file without full read', async () => {
      // Create a file with frontmatter
      const testFile = 'test.md';
      const content = '---\nfoo: bar\n---\nBody content';
      await fs.writeFile(path.join(testVaultPath, testFile), content);

      // Peek the file (only reads frontmatter)
      await executeToolCall('peek', { path: testFile });
      expect(fileStateTracker.getState(testFile)).toBe(FileState.PEEKED);

      // Try to write without full read
      const result = await executeToolCall('write', {
        path: testFile,
        content: 'new content',
      });

      expect(result).toContain('Error: Must read()');
      expect(result).toContain('peeked');
    });

    it('allows write to existing file after read', async () => {
      // Create a file
      const testFile = 'test.md';
      await fs.writeFile(path.join(testVaultPath, testFile), 'original');

      // Read it first
      await executeToolCall('read', { path: testFile });

      // Now write should succeed
      const result = await executeToolCall('write', {
        path: testFile,
        content: 'modified content',
      });

      expect(result).toContain('Successfully wrote');
      expect(result).toContain(testFile);
    });

    it('allows write to new file without prior read', async () => {
      const newFile = 'new.md';

      // Write should succeed for new files
      const result = await executeToolCall('write', {
        path: newFile,
        content: 'new file content',
      });

      expect(result).toContain('Successfully wrote');

      // Verify file was created
      const content = await fs.readFile(path.join(testVaultPath, newFile), 'utf-8');
      expect(content).toBe('new file content');
    });
  });

  describe('write tool file operations', () => {
    it('CRITICAL: creates parent directories automatically', async () => {
      const nestedFile = 'world/NPCs/Varen.md';
      const content = '---\nName: Varen\n---\nDescription';

      const result = await executeToolCall('write', {
        path: nestedFile,
        content,
      });

      expect(result).toContain('Successfully wrote');

      // Verify file exists in nested directory
      const fullPath = path.join(testVaultPath, nestedFile);
      const fileContent = await fs.readFile(fullPath, 'utf-8');
      expect(fileContent).toBe(content);
    });

    it('CRITICAL: rejects writes outside vault', async () => {
      const outsidePath = '../../../etc/passwd';

      const result = await executeToolCall('write', {
        path: outsidePath,
        content: 'malicious',
      });

      expect(result).toContain('Error');
      expect(result).toContain('outside vault');
    });

    it('writes content atomically', async () => {
      // This is hard to test directly, but we can verify the temp file is cleaned up
      const testFile = 'test.md';

      await executeToolCall('write', {
        path: testFile,
        content: 'test content',
      });

      // Verify temp file doesn't exist
      const tempPath = path.join(testVaultPath, `${testFile}.tmp`);
      await expect(fs.access(tempPath)).rejects.toThrow();
    });
  });

  describe('write tool state updates', () => {
    it('CRITICAL: marks file as MODIFIED after write', async () => {
      const testFile = 'test.md';
      await fs.writeFile(path.join(testVaultPath, testFile), 'original');

      // Read then write
      await executeToolCall('read', { path: testFile });
      await executeToolCall('write', { path: testFile, content: 'modified' });

      expect(fileStateTracker.getState(testFile)).toBe(FileState.MODIFIED);
    });

    it('marks new files as MODIFIED', async () => {
      const newFile = 'new.md';

      await executeToolCall('write', {
        path: newFile,
        content: 'content',
      });

      expect(fileStateTracker.getState(newFile)).toBe(FileState.MODIFIED);
    });
  });

  describe('tool definitions', () => {
    it('includes write tool in tools array', () => {
      const writeTool = tools.find(t => t.name === 'write');
      expect(writeTool).toBeDefined();
      expect(writeTool?.description).toContain('MUST call read()');
    });

    it('write tool has required parameters', () => {
      const writeTool = tools.find(t => t.name === 'write');
      expect(writeTool?.input_schema.required).toEqual(['path', 'content']);
    });
  });
});

describe('Prepend Frontmatter Tool (M9)', () => {
  let testVaultPath: string;

  beforeEach(async () => {
    testVaultPath = path.join(os.tmpdir(), `gary-test-${Date.now()}`);
    await fs.mkdir(testVaultPath, { recursive: true });
    fileSystemManager.setVaultPath(testVaultPath);
    fileStateTracker.clear();
  });

  afterEach(async () => {
    try {
      await fs.rm(testVaultPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('prepend_frontmatter tool', () => {
    it('CRITICAL: bypasses approval workflow', async () => {
      const testFile = 'test.md';
      await fs.writeFile(path.join(testVaultPath, testFile), 'Content without frontmatter');

      // Should succeed without approval
      const result = await executeToolCall('prepend_frontmatter', { path: testFile });

      expect(result).toContain('Successfully prepended frontmatter');
    });

    it('adds frontmatter to file without it', async () => {
      const testFile = 'test.md';
      const originalContent = 'Some content\nMore content';
      await fs.writeFile(path.join(testVaultPath, testFile), originalContent);

      await executeToolCall('prepend_frontmatter', { path: testFile });

      const updatedContent = await fs.readFile(path.join(testVaultPath, testFile), 'utf-8');
      expect(updatedContent).toMatch(/^---\n---\n/);
      expect(updatedContent).toContain(originalContent);
    });

    it('CRITICAL: skips files that already have frontmatter', async () => {
      const testFile = 'test.md';
      const contentWithFrontmatter = '---\nfoo: bar\n---\nBody content';
      await fs.writeFile(path.join(testVaultPath, testFile), contentWithFrontmatter);

      const result = await executeToolCall('prepend_frontmatter', { path: testFile });

      expect(result).toContain('already has frontmatter');

      // Verify file wasn't modified
      const content = await fs.readFile(path.join(testVaultPath, testFile), 'utf-8');
      expect(content).toBe(contentWithFrontmatter);
    });

    it('CRITICAL: marks file as MODIFIED after prepending', async () => {
      const testFile = 'test.md';
      await fs.writeFile(path.join(testVaultPath, testFile), 'Content');

      await executeToolCall('prepend_frontmatter', { path: testFile });

      expect(fileStateTracker.getState(testFile)).toBe(FileState.MODIFIED);
    });

    it('handles empty files', async () => {
      const testFile = 'empty.md';
      await fs.writeFile(path.join(testVaultPath, testFile), '');

      const result = await executeToolCall('prepend_frontmatter', { path: testFile });

      expect(result).toContain('Successfully prepended frontmatter');

      const content = await fs.readFile(path.join(testVaultPath, testFile), 'utf-8');
      expect(content).toBe('---\n---\n');
    });

    it('errors on non-existent file', async () => {
      const result = await executeToolCall('prepend_frontmatter', { path: 'nonexistent.md' });

      expect(result).toContain('Error');
      expect(result).toContain('does not exist');
    });

    it('handles files with leading whitespace', async () => {
      const testFile = 'whitespace.md';
      await fs.writeFile(path.join(testVaultPath, testFile), '   \n  Content');

      const result = await executeToolCall('prepend_frontmatter', { path: testFile });

      expect(result).toContain('Successfully prepended frontmatter');
    });
  });

  describe('tool definitions', () => {
    it('includes prepend_frontmatter in tools array', () => {
      const tool = tools.find(t => t.name === 'prepend_frontmatter');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('bypasses approval');
    });

    it('prepend_frontmatter has required parameters', () => {
      const tool = tools.find(t => t.name === 'prepend_frontmatter');
      expect(tool?.input_schema.required).toEqual(['path']);
    });
  });
});

describe('Search Tools', () => {
  let testVaultPath: string;

  beforeEach(async () => {
    testVaultPath = path.join(os.tmpdir(), `gary-test-${Date.now()}`);
    await fs.mkdir(testVaultPath, { recursive: true });
    fileSystemManager.setVaultPath(testVaultPath);
  });

  afterEach(async () => {
    try {
      await fs.rm(testVaultPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('find_files tool', () => {
    it('finds files by partial name (case-insensitive)', async () => {
      // Create test files
      await fs.mkdir(path.join(testVaultPath, 'NPCs'), { recursive: true });
      await fs.writeFile(
        path.join(testVaultPath, 'NPCs', 'The Gilded Serpent.md'),
        'NPC content'
      );
      await fs.writeFile(
        path.join(testVaultPath, 'NPCs', 'Dragon Lair.md'),
        'Location content'
      );

      const result = await executeToolCall('find_files', {
        search_term: 'gilded serpent',
      });

      expect(result).toContain('The Gilded Serpent.md');
      expect(result).toContain('NPCs/The Gilded Serpent.md');
      expect(result).not.toContain('Dragon Lair.md');
    });

    it('is case-insensitive', async () => {
      await fs.writeFile(path.join(testVaultPath, 'UPPERCASE.md'), 'content');

      const result = await executeToolCall('find_files', {
        search_term: 'uppercase',
      });

      expect(result).toContain('UPPERCASE.md');
    });

    it('searches recursively', async () => {
      await fs.mkdir(path.join(testVaultPath, 'deep', 'nested'), { recursive: true });
      await fs.writeFile(
        path.join(testVaultPath, 'deep', 'nested', 'hidden.md'),
        'content'
      );

      const result = await executeToolCall('find_files', {
        search_term: 'hidden',
      });

      expect(result).toContain('deep/nested/hidden.md');
    });

    it('returns message when no files found', async () => {
      const result = await executeToolCall('find_files', {
        search_term: 'nonexistent',
      });

      expect(result).toContain('No files found');
      expect(result).toContain('nonexistent');
    });

    it('finds multiple matching files', async () => {
      await fs.writeFile(path.join(testVaultPath, 'Session 1.md'), 'content');
      await fs.writeFile(path.join(testVaultPath, 'Session 2.md'), 'content');
      await fs.writeFile(path.join(testVaultPath, 'Session 3.md'), 'content');

      const result = await executeToolCall('find_files', {
        search_term: 'session',
      });

      expect(result).toContain('Session 1.md');
      expect(result).toContain('Session 2.md');
      expect(result).toContain('Session 3.md');
      expect(result).toContain('Found 3 file(s)');
    });
  });

  describe('search_content tool', () => {
    it('finds files containing keyword', async () => {
      await fs.writeFile(
        path.join(testVaultPath, 'test.md'),
        'This file contains the word dragon in it.'
      );

      const result = await executeToolCall('search_content', {
        keyword: 'dragon',
      });

      expect(result).toContain('test.md');
      expect(result).toContain('Line 1');
      expect(result).toContain('dragon');
    });

    it('is case-insensitive', async () => {
      await fs.writeFile(
        path.join(testVaultPath, 'test.md'),
        'Content with UPPERCASE keyword'
      );

      const result = await executeToolCall('search_content', {
        keyword: 'uppercase',
      });

      expect(result).toContain('test.md');
      expect(result).toContain('UPPERCASE');
    });

    it('searches recursively', async () => {
      await fs.mkdir(path.join(testVaultPath, 'nested'), { recursive: true });
      await fs.writeFile(
        path.join(testVaultPath, 'nested', 'deep.md'),
        'Content with special keyword'
      );

      const result = await executeToolCall('search_content', {
        keyword: 'special',
      });

      expect(result).toContain('nested/deep.md');
      expect(result).toContain('special keyword');
    });

    it('shows line numbers for matches', async () => {
      await fs.writeFile(
        path.join(testVaultPath, 'test.md'),
        'Line 1\nLine 2 has keyword\nLine 3'
      );

      const result = await executeToolCall('search_content', {
        keyword: 'keyword',
      });

      expect(result).toContain('Line 2:');
      expect(result).toContain('has keyword');
    });

    it('limits preview to 3 matches per file', async () => {
      const content = Array(10)
        .fill('match')
        .join('\n');
      await fs.writeFile(path.join(testVaultPath, 'test.md'), content);

      const result = await executeToolCall('search_content', {
        keyword: 'match',
      });

      expect(result).toContain('... 7 more matches');
    });

    it('returns message when no matches found', async () => {
      await fs.writeFile(path.join(testVaultPath, 'test.md'), 'no matches here');

      const result = await executeToolCall('search_content', {
        keyword: 'dragon',
      });

      expect(result).toContain('No files found containing');
      expect(result).toContain('dragon');
    });

    it('handles multiple files with matches', async () => {
      await fs.writeFile(path.join(testVaultPath, 'file1.md'), 'has target');
      await fs.writeFile(path.join(testVaultPath, 'file2.md'), 'also has target');

      const result = await executeToolCall('search_content', {
        keyword: 'target',
      });

      expect(result).toContain('file1.md');
      expect(result).toContain('file2.md');
      expect(result).toContain('Found "target" in 2 file(s)');
    });
  });

  describe('tool definitions', () => {
    it('includes find_files in tools array', () => {
      const tool = tools.find(t => t.name === 'find_files');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('Search for files by name');
      expect(tool?.input_schema.required).toEqual(['search_term']);
    });

    it('includes search_content in tools array', () => {
      const tool = tools.find(t => t.name === 'search_content');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('Search file contents');
      expect(tool?.input_schema.required).toEqual(['keyword']);
    });
  });
});
