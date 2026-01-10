import * as fs from 'fs/promises';
import * as path from 'path';
import { BrowserWindow } from 'electron';
import { FileEntry } from '../../common/types/vault';
import { IPC_EVENTS } from '../ipc/events';
import type { FileCreatedEvent, DirectoryCreatedEvent } from '../../common/types/ipc';

export class FileSystemManager {
  private vaultPath: string = '';

  setVaultPath(vaultPath: string): void {
    this.vaultPath = vaultPath;
  }

  getVaultPath(): string {
    return this.vaultPath;
  }

  resolvePath(relativePath: string): string {
    return path.join(this.vaultPath, relativePath);
  }

  async isValidVaultPath(vaultPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(vaultPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const absolutePath = this.resolvePath(relativePath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(relativePath: string): Promise<string> {
    const absolutePath = this.resolvePath(relativePath);
    try {
      return await fs.readFile(absolutePath, 'utf-8');
    } catch (err: any) {
      if (err.code === 'EACCES') {
        throw new Error(`Permission denied: Cannot read ${relativePath}`);
      } else if (err.code === 'ENOENT') {
        throw new Error(`File not found: ${relativePath}`);
      } else {
        throw new Error(`Failed to read file: ${err.message}`);
      }
    }
  }

  async listDirectory(
    relativePath: string = '',
    recursive: boolean = false
  ): Promise<FileEntry[]> {
    const absolutePath = this.resolvePath(relativePath);

    try {
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      const fileEntries: FileEntry[] = [];

      for (const entry of entries) {
        const entryRelativePath = path.join(relativePath, entry.name);
        const entryAbsolutePath = path.join(absolutePath, entry.name);

        const fileEntry: FileEntry = {
          name: entry.name,
          path: entryRelativePath,
          type: entry.isDirectory() ? 'directory' : 'file',
        };

        // Add extension for files
        if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (ext) {
            fileEntry.extension = ext.slice(1); // Remove the leading dot
          }
        }

        // Add metadata
        try {
          const stats = await fs.stat(entryAbsolutePath);
          fileEntry.size = stats.size;
          fileEntry.modified = stats.mtimeMs;
        } catch {
          // Ignore stat errors, continue without metadata
        }

        fileEntries.push(fileEntry);

        // Recursively list subdirectories
        if (recursive && entry.isDirectory()) {
          const subEntries = await this.listDirectory(
            entryRelativePath,
            true
          );
          fileEntries.push(...subEntries);
        }
      }

      return fileEntries;
    } catch (err: any) {
      if (err.code === 'EACCES') {
        throw new Error(`Permission denied: Cannot read ${relativePath || 'vault root'}`);
      } else if (err.code === 'ENOENT') {
        throw new Error(`Directory not found: ${relativePath || 'vault root'}`);
      } else {
        throw new Error(`Failed to read directory: ${err.message}`);
      }
    }
  }

  /**
   * Write content to a file atomically (M7)
   * Creates parent directories if needed
   * Uses temp file + rename for atomicity
   * Emits FILE_CREATED and DIRECTORY_CREATED events for UI updates
   */
  async writeFile(relativePath: string, content: string): Promise<number> {
    // Validate path is within vault (security check)
    const absolutePath = this.resolvePath(relativePath);
    const resolvedAbsolutePath = path.resolve(absolutePath);
    const resolvedVaultPath = path.resolve(this.vaultPath);

    if (!resolvedAbsolutePath.startsWith(resolvedVaultPath)) {
      throw new Error(`Invalid path: ${relativePath} is outside vault`);
    }

    try {
      // Check if file existed before write
      const fileExistedBefore = await this.fileExists(relativePath);

      // Track which directories need to be created
      const newDirectories: string[] = [];
      const dirPath = path.dirname(relativePath);

      if (dirPath && dirPath !== '.') {
        // Check which parent directories need to be created
        const pathParts = dirPath.split('/');
        let currentPath = '';

        for (const part of pathParts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          const dirExists = await this.fileExists(currentPath);

          if (!dirExists) {
            newDirectories.push(currentPath);
          }
        }
      }

      // Create parent directories if needed
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });

      // Write to temp file first (atomic operation)
      const tempPath = `${absolutePath}.tmp`;
      await fs.writeFile(tempPath, content, 'utf-8');

      // Atomic rename
      await fs.rename(tempPath, absolutePath);

      // Emit events for UI updates
      if (!fileExistedBefore) {
        // Emit directory created events
        for (const newDir of newDirectories) {
          this.emitDirectoryCreated(newDir);
        }

        // Emit file created event
        const fileEntry = await this.createFileEntry(relativePath);
        this.emitFileCreated(relativePath, fileEntry);
      }

      // Return bytes written
      return Buffer.byteLength(content, 'utf-8');
    } catch (err: any) {
      if (err.code === 'EACCES') {
        throw new Error(`Permission denied: Cannot write to ${relativePath}`);
      } else if (err.code === 'ENOSPC') {
        throw new Error(`No space left on device for ${relativePath}`);
      } else {
        throw new Error(`Failed to write file: ${err.message}`);
      }
    }
  }

  /**
   * Create a FileEntry for a given relative path
   */
  private async createFileEntry(relativePath: string): Promise<FileEntry> {
    const absolutePath = this.resolvePath(relativePath);
    const stats = await fs.stat(absolutePath);
    const fileName = path.basename(relativePath);

    return {
      name: fileName,
      path: relativePath,
      type: stats.isDirectory() ? 'directory' : 'file',
      extension: path.extname(fileName).slice(1),
      size: stats.size,
      modified: stats.mtimeMs,
    };
  }

  /**
   * Emit file created event to renderer
   */
  private emitFileCreated(filePath: string, fileEntry: FileEntry): void {
    const windows = BrowserWindow.getAllWindows();
    const event: FileCreatedEvent = { filePath, fileEntry };

    for (const window of windows) {
      window.webContents.send(IPC_EVENTS.FILE_CREATED, event);
    }
  }

  /**
   * Emit directory created event to renderer
   */
  private emitDirectoryCreated(dirPath: string): void {
    const windows = BrowserWindow.getAllWindows();
    const event: DirectoryCreatedEvent = { dirPath };

    for (const window of windows) {
      window.webContents.send(IPC_EVENTS.DIRECTORY_CREATED, event);
    }
  }
}

// Singleton instance
export const fileSystemManager = new FileSystemManager();
