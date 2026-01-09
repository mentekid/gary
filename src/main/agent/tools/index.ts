import Anthropic from '@anthropic-ai/sdk';
import { fileSystemManager } from '../../vault/FileSystemManager';
import { markdownParser } from '../../vault/MarkdownParser';
import { fileStateTracker } from '../../vault/FileStateTracker';

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
];

// Execute a tool call
export async function executeToolCall(toolName: string, toolInput: any): Promise<any> {
  switch (toolName) {
    case 'list_directory':
      return await listDirectoryTool(toolInput.path || '', toolInput.recursive || false);
    case 'peek':
      return await peekTool(toolInput.path);
    case 'read':
      return await readTool(toolInput.path);
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
