import Anthropic from '@anthropic-ai/sdk';
import { fileSystemManager } from '../../vault/FileSystemManager';
import { markdownParser } from '../../vault/MarkdownParser';
import { fileStateTracker } from '../../vault/FileStateTracker';
import type { ToolExecutionContext } from '../ToolExecutionContext';
import { hasFrontmatter, prependFrontmatter } from '../../vault/markdownUtils';
import type { PlanningQuestion, PlanningRequest } from '../../../common/types/ipc';

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
    description: 'Create or modify a file. MUST call read() first for existing files. Writes content atomically. For small changes to existing files, prefer edit() over write().',
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
    name: 'edit',
    description: 'Replace specific lines in a file. Lines are 1-indexed and match the L-prefixed numbers shown by read(). MUST call read() first. Requires user approval.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to file',
        },
        start_line: {
          type: 'number',
          description: 'First line to replace (1-indexed, inclusive)',
        },
        end_line: {
          type: 'number',
          description: 'Last line to replace (1-indexed, inclusive)',
        },
        content: {
          type: 'string',
          description: 'Replacement content. To delete lines, pass empty string. To insert, use same line for start and end with original line plus new lines.',
        },
      },
      required: ['path', 'start_line', 'end_line', 'content'],
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
  {
    name: 'find_files',
    description: 'Search for files by name (case-insensitive, recursive). Use when you know part of a filename but not the full path. Example: "gilded serpent" finds "The Gilded Serpent.md".',
    input_schema: {
      type: 'object',
      properties: {
        search_term: {
          type: 'string',
          description: 'Text to search for in file names (case-insensitive)',
        },
      },
      required: ['search_term'],
    },
  },
  {
    name: 'search_content',
    description: 'Search file contents for keyword (case-insensitive, recursive). Returns matching files with context lines. Use to find files containing specific text.',
    input_schema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Keyword to search for in file contents (case-insensitive)',
        },
      },
      required: ['keyword'],
    },
  },
  {
    name: 'ask_planning_questions',
    description: 'Ask the user multiple required questions for planning. Use when you need structured input before proceeding. All questions must be answered.',
    input_schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          description: 'Array of questions to ask the user',
          items: {
            type: 'string',
          },
          minItems: 1,
        },
      },
      required: ['questions'],
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
    case 'edit':
      return await editTool(toolInput.path, toolInput.start_line, toolInput.end_line, toolInput.content, context);
    case 'prepend_frontmatter':
      return await prependFrontmatterTool(toolInput.path);
    case 'find_files':
      return await findFilesTool(toolInput.search_term);
    case 'search_content':
      return await searchContentTool(toolInput.keyword);
    case 'ask_planning_questions':
      return await askPlanningQuestionsTool(toolInput.questions, context);
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

    // Prefix each line with L{n}| for unambiguous line references
    const lines = content.split('\n');
    const numbered = lines.map((line, i) => `L${i + 1}|${line}`).join('\n');

    return numbered;
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
    // Debug logging for content tracking
    console.log('[WRITE_TOOL] Called with:', {
      path,
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 100) || '(empty)',
      hasContext: !!context,
    });

    // Validate content is provided
    if (!content) {
      return `Error: No content provided for write to ${path}. You must provide the full file content in the 'content' parameter.`;
    }

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

      const approvalRequest = {
        toolUseId,
        filePath: path,
        beforeContent,
        afterContent: content,
      };

      console.log('[WRITE_TOOL] Creating approval request:', {
        toolUseId,
        filePath: path,
        beforeContentLength: beforeContent?.length || 0,
        afterContentLength: approvalRequest.afterContent?.length || 0,
        afterContentPreview: approvalRequest.afterContent?.substring(0, 100) || '(empty)',
      });

      context.requestApproval(approvalRequest);

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

async function editTool(
  path: string,
  startLine: number,
  endLine: number,
  content: string,
  context?: ToolExecutionContext
): Promise<string> {
  try {
    // Validate file exists
    const fileExists = await fileSystemManager.fileExists(path);
    if (!fileExists) {
      return `Error: File ${path} does not exist. edit() can only modify existing files.`;
    }

    // Validation: Must read existing files before editing
    const currentState = fileStateTracker.getState(path);
    if (currentState === 'not_accessed' || currentState === 'peeked') {
      return `Error: Must read() file ${path} before editing. Current state: ${currentState}`;
    }

    // Validate line numbers
    if (startLine < 1) {
      return `Error: start_line must be >= 1, got ${startLine}`;
    }
    if (endLine < startLine) {
      return `Error: end_line (${endLine}) must be >= start_line (${startLine})`;
    }

    // Read current file content
    const beforeContent = await fileSystemManager.readFile(path);
    const lines = beforeContent.split('\n');

    if (startLine > lines.length) {
      return `Error: start_line (${startLine}) is beyond end of file (${lines.length} lines)`;
    }
    if (endLine > lines.length) {
      return `Error: end_line (${endLine}) is beyond end of file (${lines.length} lines)`;
    }

    // Build new content: lines before + replacement + lines after
    const linesBefore = lines.slice(0, startLine - 1);
    const linesAfter = lines.slice(endLine);
    const replacementLines = content === '' ? [] : content.split('\n');
    const afterContent = [...linesBefore, ...replacementLines, ...linesAfter].join('\n');

    // Submit through approval workflow (same as write)
    if (context) {
      const toolUseId = `edit_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const approvalRequest = {
        toolUseId,
        filePath: path,
        beforeContent,
        afterContent,
      };

      context.requestApproval(approvalRequest);
      return '__APPROVAL_PENDING__';
    }

    // No approval context — write directly
    const bytesWritten = await fileSystemManager.writeFile(path, afterContent);
    fileStateTracker.markModified(path);
    return `Successfully edited ${path} (lines ${startLine}-${endLine}), ${bytesWritten} bytes written`;
  } catch (error: any) {
    return `Error editing file: ${error.message}`;
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
  console.log('[COMPLETE_WRITE] Called with:', {
    path,
    contentLength: content?.length || 0,
    contentPreview: content?.substring(0, 100) || '(empty)',
    approved,
    feedback,
  });

  if (!approved) {
    return `Write operation rejected by user. Feedback: ${feedback || 'No feedback provided'}`;
  }

  try {
    // Write file atomically
    const bytesWritten = await fileSystemManager.writeFile(path, content);

    // Mark file as modified
    fileStateTracker.markModified(path);

    console.log('[COMPLETE_WRITE] Successfully wrote file:', {
      path,
      bytesWritten,
    });

    return `Successfully wrote ${bytesWritten} bytes to ${path}`;
  } catch (error: any) {
    console.error('[COMPLETE_WRITE] Error writing file:', error);
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
    fileStateTracker.markRead(path);

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

/**
 * Find files by name (case-insensitive, recursive)
 * Example: "gilded serpent" finds "The Gilded Serpent.md"
 */
async function findFilesTool(searchTerm: string): Promise<string> {
  try {
    // Get all files recursively
    const entries = await fileSystemManager.listDirectory('', true);

    // Filter to files only and search case-insensitively
    const searchLower = searchTerm.toLowerCase();
    const matches = entries.filter(
      (entry) =>
        entry.type === 'file' && entry.name.toLowerCase().includes(searchLower)
    );

    if (matches.length === 0) {
      return `No files found matching "${searchTerm}"`;
    }

    // Format results
    const results = matches
      .map((file) => `${file.path}`)
      .sort()
      .join('\n');

    return `Found ${matches.length} file(s) matching "${searchTerm}":\n${results}`;
  } catch (error: any) {
    return `Error searching files: ${error.message}`;
  }
}

/**
 * Search file contents for keyword (case-insensitive, recursive)
 * Returns matching files with context lines
 */
async function searchContentTool(keyword: string): Promise<string> {
  try {
    // Get all files recursively
    const entries = await fileSystemManager.listDirectory('', true);
    const files = entries.filter((entry) => entry.type === 'file');

    const keywordLower = keyword.toLowerCase();
    const matches: Array<{ path: string; lines: string[] }> = [];

    // Search each file
    for (const file of files) {
      try {
        const content = await fileSystemManager.readFile(file.path);
        const lines = content.split('\n');
        const matchingLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(keywordLower)) {
            // Include line number and context
            const lineNum = i + 1;
            matchingLines.push(`  Line ${lineNum}: ${lines[i].trim()}`);
          }
        }

        if (matchingLines.length > 0) {
          matches.push({ path: file.path, lines: matchingLines });
        }
      } catch {
        // Skip files that can't be read (binary, permissions, etc.)
        continue;
      }
    }

    if (matches.length === 0) {
      return `No files found containing "${keyword}"`;
    }

    // Format results
    const results = matches
      .map((match) => {
        const preview =
          match.lines.length > 3
            ? match.lines.slice(0, 3).join('\n') + `\n  ... ${match.lines.length - 3} more matches`
            : match.lines.join('\n');
        return `${match.path}:\n${preview}`;
      })
      .join('\n\n');

    return `Found "${keyword}" in ${matches.length} file(s):\n\n${results}`;
  } catch (error: any) {
    return `Error searching content: ${error.message}`;
  }
}

/**
 * Ask the user multiple planning questions (M10)
 * Pauses execution until user provides answers
 */
async function askPlanningQuestionsTool(
  questions: string[],
  context?: ToolExecutionContext
): Promise<string> {
  if (!context) {
    return 'Error: Planning requires execution context';
  }

  if (!questions || questions.length === 0) {
    return 'Error: Must provide at least one question';
  }

  // Generate unique IDs for questions
  const planningQuestions: PlanningQuestion[] = questions.map((q, idx) => ({
    id: `q_${idx}`,
    question: q,
  }));

  const toolUseId = `planning_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const planningRequest: PlanningRequest = {
    toolUseId,
    questions: planningQuestions,
  };

  context.requestPlanning(planningRequest);
  return '__PLANNING_PENDING__';
}
