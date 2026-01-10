import Anthropic from '@anthropic-ai/sdk';
import { fileSystemManager } from '../../vault/FileSystemManager';
import { markdownParser } from '../../vault/MarkdownParser';
import { fileStateTracker } from '../../vault/FileStateTracker';
import type { ToolExecutionContext } from '../ToolExecutionContext';
import { hasFrontmatter, prependFrontmatter } from '../../vault/markdownUtils';

// Tool definitions for Anthropic API
export const tools: Anthropic.Tool[] = [
  {
    name: 'list_directory',
    description: 'List files and folders in a directory. Use to discover vault structure.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path from vault root (empty string for root)',
          default: '',
        },
        recursive: {
          type: 'boolean',
          description: 'Recursively list subdirectories',
          default: false,
        },
      },
      required: [],
    },
  },
  {
    name: 'peek',
    description: 'Read ONLY the YAML frontmatter (metadata) of a markdown file. Fast - use before read.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to markdown file',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'read',
    description: 'Read FULL content of a file. Use only when you need detailed information.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to file',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write',
    description: 'Create or modify a file. MUST call read() first for existing files. Writes content atomically.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to file',
        },
        content: {
          type: 'string',
          description: 'Full file content to write',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'prepend_frontmatter',
    description: 'Add empty YAML frontmatter to files that lack it. Maintenance operation, bypasses approval.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to markdown file',
        },
      },
      required: ['path'],
    },
  },
];

// Execute a tool call
export async function executeToolCall(
  toolName: string,
  toolInput: any,
  context?: ToolExecutionContext
): Promise<any> {
  switch (toolName) {
    case 'list_directory':
      return await listDirectoryTool(toolInput.path || '', toolInput.recursive || false);
    case 'peek':
      return await peekTool(toolInput.path);
    case 'read':
      return await readTool(toolInput.path);
    case 'write':
      return await writeTool(toolInput.path, toolInput.content, context);
    case 'prepend_frontmatter':
      return await prependFrontmatterTool(toolInput.path);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function listDirectoryTool(path: string, recursive: boolean): Promise<string> {
  try {
    const entries = await fileSystemManager.listDirectory(path, recursive);
    const formatted = entries
      .map(entry => `${entry.type === 'directory' ? '[DIR]' : '[FILE]'} ${entry.path}`)
      .join('\n');
    return formatted || 'Directory is empty';
  } catch (error: any) {
    return `Error listing directory: ${error.message}`;
  }
}

async function peekTool(path: string): Promise<string> {
  try {
    const content = await fileSystemManager.readFile(path);
    const frontmatter = markdownParser.extractFrontmatter(content);

    // Track that we peeked this file
    fileStateTracker.markPeeked(path);

    if (Object.keys(frontmatter).length === 0) {
      return `File ${path} has no YAML frontmatter`;
    }

    return JSON.stringify(frontmatter, null, 2);
  } catch (error: any) {
    return `Error reading file: ${error.message}`;
  }
}

async function readTool(path: string): Promise<string> {
  try {
    const content = await fileSystemManager.readFile(path);

    // Track that we read this file
    fileStateTracker.markRead(path);

    return content;
  } catch (error: any) {
    return `Error reading file: ${error.message}`;
  }
}

async function writeTool(
  path: string,
  content: string,
  context?: ToolExecutionContext
): Promise<string> {
  try {
    // Check if file exists
    const fileExists = await fileSystemManager.fileExists(path);

    // Validation: Must read existing files before writing
    if (fileExists) {
      const currentState = fileStateTracker.getState(path);
      if (currentState === 'not_accessed' || currentState === 'peeked') {
        return `Error: Must read() file ${path} before writing. Current state: ${currentState}`;
      }
    }

    // M8: Request approval before writing
    if (context) {
      const beforeContent = fileExists
        ? await fileSystemManager.readFile(path)
        : null;

      // Generate unique tool use ID (will be provided by agent controller)
      const toolUseId = `write_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      context.requestApproval({
        toolUseId,
        filePath: path,
        beforeContent,
        afterContent: content,
      });

      // Return marker - agent controller will handle approval
      return '__APPROVAL_PENDING__';
    }

    // Write file atomically (no approval context, write directly)
    const bytesWritten = await fileSystemManager.writeFile(path, content);

    // Mark file as modified
    fileStateTracker.markModified(path);

    return `Successfully wrote ${bytesWritten} bytes to ${path}`;
  } catch (error: any) {
    return `Error writing file: ${error.message}`;
  }
}

/**
 * Complete a write operation after user approval (M8)
 * Called by AgentController after approval is received
 */
export async function completeWrite(
  path: string,
  content: string,
  approved: boolean,
  feedback?: string
): Promise<string> {
  if (!approved) {
    return `Write operation rejected by user. Feedback: ${feedback || 'No feedback provided'}`;
  }

  try {
    // Write file atomically
    const bytesWritten = await fileSystemManager.writeFile(path, content);

    // Mark file as modified
    fileStateTracker.markModified(path);

    return `Successfully wrote ${bytesWritten} bytes to ${path}`;
  } catch (error: any) {
    return `Error writing file: ${error.message}`;
  }
}

/**
 * Prepend frontmatter to a file (M9)
 * Maintenance operation - bypasses approval workflow
 */
async function prependFrontmatterTool(path: string): Promise<string> {
  try {
    // Must read file first
    const fileExists = await fileSystemManager.fileExists(path);
    if (!fileExists) {
      return `Error: File ${path} does not exist`;
    }

    const content = await fileSystemManager.readFile(path);

    // Check if already has frontmatter
    if (hasFrontmatter(content)) {
      return `File ${path} already has frontmatter, no changes made`;
    }

    // Prepend frontmatter
    const updatedContent = prependFrontmatter(content);

    // Write directly (bypass approval - maintenance operation)
    const bytesWritten = await fileSystemManager.writeFile(path, updatedContent);

    // Mark file as modified
    fileStateTracker.markModified(path);

    return `Successfully prepended frontmatter to ${path} (${bytesWritten} bytes total)`;
  } catch (error: any) {
    return `Error prepending frontmatter: ${error.message}`;
  }
}
