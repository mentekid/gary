# Gary - DM Assistant Implementation Plan

## Overview

Gary is a Dungeon Master assistant desktop app for D&D 5e campaigns.

**Stack:**
- TypeScript + Electron
- React + Zustand + Tailwind CSS
- Anthropic SDK (direct API access)
- Local-first: reads/writes Obsidian vault markdown files

**Key Pattern**: Progressive disclosure (peek before read) to manage context window

## Architecture

```
┌─────────────────────────────────────────────┐
│      Renderer (React)                       │
│  Chat | Diff | Planner | File Browser      │
│                  ↓↑ IPC                     │
├─────────────────────────────────────────────┤
│      Main Process (Node.js)                 │
│  AgentController → Tools → FileSystem       │
└─────────────────┬───────────────────────────┘
                  ↓
           Obsidian Vault
```

**Tech Decisions:**
- **State**: Zustand (minimal boilerplate)
- **Styling**: Tailwind CSS
- **Build**: Vite (renderer), tsc (main/preload)
- **File Tree**: react-arborist
- **Testing**: Vitest + Testing Library (~40% coverage on critical paths)

## Implementation Status

### ✅ Completed (Milestones 1-6)

**M1: Electron Hello World** - Basic app setup
**M2: React UI** - Chat interface with Tailwind
**M3: IPC Communication** - Renderer ↔ main process bridge
**M4: File System Integration** - Vault selection, file tree display
**M5: Agent Integration** - Chat with Claude using Anthropic SDK
**M6: Agent File Tools** - `list_directory`, `peek`, `read` tools with progressive disclosure

**Key Features Implemented:**
- Message streaming with newline injection after tool use
- File state tracking (NOT_ACCESSED → PEEKED → READ → MODIFIED)
- Tree building with recursive sorting (directories first)
- Markdown frontmatter parsing with gray-matter
- Agentic loop with max turns protection

### 🚧 In Progress

**Testing & Tech Debt** (Current):
- ✅ Vitest configured for main + renderer processes
- ✅ Critical path tests (AgentController, FileStateTracker, tree building, markdown parser)
- ✅ Dead code removed (unused types, legacy prompts)
- ✅ Verification pipeline: `npm run verify` (lint → test → build)
- ⏭️ Agents SDK migration skipped (current low-level SDK appropriate for use case)

### ✅ Completed (Milestones 7-12)

**M7: Write Tool** ✅
- Agent can create/modify files with approval workflow
- Validation: Must read existing files before writing
- File state updates to MODIFIED
- Tool tests cover critical edge cases

**M8: Approval Workflow + Diff Viewer** ✅
- Safe file editing with user approval
- Side-by-side diff viewer shows before/after
- User accepts/rejects with optional feedback
- Agent receives feedback and can retry
- Paused execution pattern with Promise-based workflow

**M9: prepend_frontmatter Tool** ✅
- Auto-adds frontmatter to files without it
- Bypasses approval (maintenance operation)
- Properly tracks file state (marks as READ)

**M10: Planning Mode** ✅
- Structured question collection via `ask_planning_questions` tool
- Form UI with validation (all questions required)
- Collects all answers at once
- Returns formatted Q&A to agent

**M11: Polish & Stability** ✅
- Error messages with retry buttons
- Confirm before close when agent is thinking (beforeunload listener)
- Missing CAMPAIGN.md handled gracefully with system note

**M12: Conversation Compaction** ✅
- Token counter with progress bar (0-100%) in header
- Compact button always visible, blocks at >75% usage
- Summary generated via Claude API call
- Collapsible summary message component with "summarized above this line" marker
- Fresh context after compaction

### 📋 Planned (Future)

**M13: Bells and Whistles**
- Settings panel (API key, model selection)
- Open / Open Recent / New dialogue at startup - creates new vault and remembers recent campaigns
- Stateful sessions: Dump entire session to file before compaction and reference file in compacted result
- Resumable sessions: Dump entire session to file when exiting, give user ability to resume
- File viewer: Allow user to open a file (read only) from the side pane into a new tab (chat tab always first, additional tabs optional)

## Tool Specifications

### list_directory(path, recursive=false)
Returns file/folder entries. Use to explore vault structure.

### peek(file)
Returns YAML frontmatter only (between `---` delimiters). Use before reading full content.

### read(file)
Returns full file content. Required before write() for existing files.

### write(file, content)
Creates or modifies file. Requires read() first for existing files. Requests user approval (M8+).

### prepend_frontmatter(file)
Adds YAML frontmatter to files without it. Maintenance operation, bypasses approval (M9+).

## Progressive Disclosure Pattern

**Critical for context management:**

1. List directory structure first
2. Peek at frontmatter (metadata only)
3. Only read full content if frontmatter indicates relevance

**Example:**
```
User: "What NPCs are in my campaign?"
Agent:
1. list_directory("world/NPCs")
2. peek("world/NPCs/Varen.md") → {Status: "Kidnapped", Age: 8}
3. peek("world/NPCs/Lydia.md") → {Status: "Active", Role: "Queen"}
4. Respond with summary (no full reads needed!)
```

## File State Tracking

States: `NOT_ACCESSED` → `PEEKED` → `READ` → `MODIFIED`

**Priority rules:**
- PEEKED doesn't override READ or MODIFIED
- READ doesn't override MODIFIED
- MODIFIED can override anything

## Testing Strategy

**Current coverage**: ~40-50% (focused on critical paths)

**Test types:**
- Unit tests for state machines, algorithms, parsers
- Mocked Anthropic SDK and Electron APIs
- Test fixtures: `tests/fixtures/mock-vault/` (realistic campaign data)

**Run tests:**
```bash
npm test              # Watch mode
npm run test:run      # Once
npm run verify        # Lint + test + build
```

See [tests/README.md](../tests/README.md) for details.

## Key Constraints

1. **Context Window**: Aggressive progressive disclosure, conversation compaction
2. **File Safety**: Read before write, approval required
3. **Obsidian Compatibility**: Respect `[[link]]` format, don't corrupt vault
4. **Cross-Platform**: Use Node's `path` module
5. **Testing**: Critical paths must have test coverage before shipping

## Next Steps

With M1-M12 complete:

1. **Ready for use**: Gary can now assist with D&D campaign planning
2. **Optional enhancements** (M13): Settings panel, session persistence, file viewer
3. **Continue testing**: Run `npm run verify` before any changes

## Summary of Implementation

**Total files modified**: ~30 files across 3 processes (main, preload, renderer)

**Key achievements**:
- Complete approval workflow with diff viewer
- Planning mode for structured question collection
- Token counting with context management
- Conversation compaction with collapsible summaries
- Progressive disclosure pattern for efficient context usage
- Comprehensive test coverage (56 tests passing)

**Current state**: Fully functional D&D assistant with all core features implemented.
