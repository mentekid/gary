# Gary - DM Assistant Implementation Plan

## Overview

Gary is a Dungeon Master assistant desktop app built with:
- **Stack**: TypeScript + Electron + Anthropic Agent SDK
- **UI**: React + Zustand + Tailwind CSS
- **Architecture**: Local-first, reads/writes Obsidian vault markdown files
- **Key Pattern**: Progressive disclosure (peek before read) to manage context window

## Tech Stack Decisions

- **State Management**: Zustand (simple, minimal boilerplate)
- **Styling**: Tailwind CSS (utility-first, fast development)
- **Build Tool**: Vite for renderer, tsc for main process
- **File Tree**: react-arborist (battle-tested, good performance)
- **Testing**: Jest + Testing Library + Playwright

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Renderer Process (React)                │
│  Chat | Diff Viewer | Planner | File Browser   │
│                    ↓↑ IPC                       │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│         Main Process (Node.js)                  │
│  ┌──────────────────────────────────────────┐  │
│  │  AgentController (Agent SDK + Tools)     │  │
│  └─────────────────┬────────────────────────┘  │
│                    ↓                            │
│  ┌──────────────────────────────────────────┐  │
│  │  FileSystemManager + MarkdownParser      │  │
│  └─────────────────┬────────────────────────┘  │
└────────────────────┼────────────────────────────┘
                     ↓
              Obsidian Vault
```

## Project Structure

```
gary/
├── src/
│   ├── main/                    # Node.js process
│   │   ├── index.ts             # Electron entry
│   │   ├── agent/
│   │   │   ├── AgentController.ts
│   │   │   ├── tools/           # list_directory, peek, read, write, prepend_frontmatter
│   │   │   ├── prompts/systemPrompt.ts
│   │   │   └── types.ts
│   │   ├── vault/
│   │   │   ├── FileSystemManager.ts    # File operations + tracking
│   │   │   ├── MarkdownParser.ts       # YAML frontmatter extraction
│   │   │   └── VaultValidator.ts
│   │   ├── ipc/handlers.ts
│   │   └── window/WindowManager.ts
│   ├── renderer/                # React UI
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Chat/ChatPane.tsx
│   │   │   ├── Diff/DiffViewer.tsx
│   │   │   ├── Planner/PlannerForm.tsx
│   │   │   └── FileBrowser/FileTree.tsx
│   │   ├── hooks/
│   │   ├── store/               # Zustand slices
│   │   └── styles/
│   ├── common/types/            # Shared types
│   └── preload/preload.ts       # Context bridge
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/mock-vault/     # Test campaign
├── package.json
├── tsconfig.json
└── README.md
```

## Incremental Implementation Milestones

Each milestone is a small, testable, end-to-end increment. Implement in order.

---

### Milestone 1: Electron Hello World

**Goal**: App starts and shows a hardcoded message

**Scope**:
- Basic Electron setup (main process + window)
- Simple HTML page with "Hello from Gary!" message
- Window opens, message displays, window can be closed
- NO React, NO IPC, NO agent - just Electron basics

**Files to Create**:
1. `package.json` - Project dependencies (electron, typescript, basic scripts)
2. `tsconfig.json` - Base TypeScript config
3. `tsconfig.main.json` - Main process TypeScript config
4. `src/main/index.ts` - Electron main entry point, creates window
5. `src/main/window/WindowManager.ts` - Window creation and management
6. `index.html` - Simple HTML with hardcoded message

**Package.json dependencies**:
- electron
- typescript
- @types/node
- Dev: electron-builder, ts-node

**Testing**: Run app, window opens with "Hello from Gary!" visible

**Done When**: `npm start` opens Electron window with hardcoded message

---

### Milestone 2: Basic React UI (no functionality)

**Goal**: Renderer process with React, displays hardcoded chat UI

**Scope**:
- Add React + Vite for renderer process
- Create basic chat layout (header, message area, input field)
- Show 2-3 hardcoded messages in chat
- Input field exists but does nothing when you type/submit
- NO IPC yet, NO real data flow, just static UI

**Files to Create**:
1. `vite.config.ts` - Vite configuration for renderer
2. `tsconfig.renderer.json` - Renderer process TypeScript config
3. `src/renderer/index.html` - Vite HTML entry point
4. `src/renderer/index.tsx` - React entry point
5. `src/renderer/App.tsx` - Root component
6. `src/renderer/components/Chat/ChatPane.tsx` - Main chat interface
7. `src/renderer/components/Chat/MessageList.tsx` - Displays messages
8. `src/renderer/components/Chat/ChatInput.tsx` - Input field + send button
9. `src/renderer/styles/global.css` - Tailwind setup

**Package.json additions**:
- react, react-dom
- @vitejs/plugin-react
- tailwindcss, autoprefixer, postcss
- @types/react, @types/react-dom

**Testing**: Run app, see chat UI with hardcoded messages, input field visible

**Done When**: Chat UI looks reasonable with hardcoded messages

---

### Milestone 3: IPC Communication (echo server)

**Goal**: User types message → main process → echo back → display

**Scope**:
- Set up IPC bridge with contextBridge
- User types in chat, clicks send
- Message sent to main process via IPC
- Main process echoes back: "You said: {message}"
- Message appears in chat UI
- Conversation history builds up (stored in renderer state)

**Files to Create**:
1. `src/preload/preload.ts` - Context bridge setup
2. `src/main/ipc/handlers.ts` - IPC message handlers (echo function)
3. `src/main/ipc/events.ts` - IPC event type definitions
4. `src/common/types/ipc.ts` - Shared IPC message types
5. `src/renderer/hooks/useIPC.ts` - React hook for IPC calls
6. `src/renderer/store/chatSlice.ts` - Zustand store for chat state

**Package.json additions**:
- zustand (state management)

**IPC Flow**:
```typescript
// Renderer
ipc.send('user-message', { text: 'Hello' })

// Main process handler
handle('user-message', (message) => {
  return { text: `You said: ${message.text}` }
})

// Renderer receives response, adds to chat history
```

**Testing**: Type message, hit send, see echo response in chat

**Done When**: Conversation history works, multiple messages accumulate

---

### Milestone 4: File System Integration (no agent)

**Goal**: UI can browse vault and read files via IPC

**Scope**:
- Add vault selection dialog (opens on app start)
- File browser sidebar shows real directory tree
- Click directory → expand/collapse
- Click file → read content → show in a preview pane (not chat)
- NO agent yet, just testing file system access via IPC

**Files to Create**:
1. `src/main/vault/FileSystemManager.ts` - File operations (list, read)
2. `src/main/vault/VaultValidator.ts` - Check for CAMPAIGN.md (just log warning for now)
3. `src/main/ipc/handlers.ts` - Add handlers for: select-vault, list-directory, read-file
4. `src/renderer/components/FileBrowser/FileTree.tsx` - Tree UI with react-arborist
5. `src/renderer/components/FileBrowser/FilePreview.tsx` - Shows file content
6. `src/renderer/components/Layout/MainLayout.tsx` - Layout with sidebar + main content
7. `src/renderer/store/vaultSlice.ts` - Zustand store for vault state
8. `src/common/types/vault.ts` - Vault and file types

**Package.json additions**:
- react-arborist (file tree)
- gray-matter (YAML frontmatter parsing, for future peek() tool)

**IPC Handlers**:
- `select-vault` → open file dialog → return vault path
- `list-directory` → return array of files/folders
- `read-file` → return file content

**Testing**:
1. App opens, select vault dialog appears
2. Choose a directory
3. File tree populates
4. Click a markdown file → content appears in preview pane

**Done When**: Can browse real vault and read files (no agent involved)

---

### Milestone 5: Agent SDK Basic Integration

**Goal**: Agent SDK connected, user chats with agent (no custom tools yet)

**Scope**:
- Install Anthropic Agent SDK
- Create AgentController in main process
- User types message → sent to agent → agent responds → displayed in chat
- NO custom tools yet (no file access from agent)
- Just testing basic agent conversation

**Files to Create**:
1. `src/main/agent/AgentController.ts` - Agent SDK lifecycle management
2. `src/main/agent/prompts/systemPrompt.ts` - Basic system prompt (no tools yet)
3. `src/main/agent/types.ts` - Agent-specific types
4. `src/main/ipc/handlers.ts` - Add handler for: agent-query
5. `src/renderer/hooks/useAgent.ts` - React hook for agent interaction
6. `src/renderer/store/agentSlice.ts` - Zustand store for agent state

**Package.json additions**:
- @anthropic-ai/sdk (Anthropic SDK)
- Agent SDK dependencies (check docs for exact package name)

**System Prompt (Basic)**:
```
You are Gary, a Dungeon Master assistant for D&D 5e campaigns.
You help DMs plan sessions, create NPCs, and build engaging adventures.
Be creative, helpful, and embrace the whimsical spirit of D&D!
```

**Environment**:
- Need to handle API key (for now, hardcode or environment variable)
- Later milestone: settings UI for API key

**Agent Flow**:
```typescript
// User types message
ipc.send('agent-query', { message: 'Tell me about dragons' })

// Main process
agentController.query(message)
  → stream response chunks
  → send each chunk to renderer via IPC event

// Renderer displays streaming response in chat
```

**Testing**:
1. User asks "Tell me about red dragons"
2. Agent responds with helpful D&D lore
3. Streaming response appears word-by-word in chat

**Done When**: Can have natural conversation with agent (no file tools yet)

---

### Milestone 6: Agent File Tools (list, peek, read)

**Goal**: Agent can explore vault and answer questions about it

**Scope**:
- Implement custom tools: `list_directory`, `peek`, `read`
- Register tools with Agent SDK
- Update system prompt with progressive disclosure instructions
- File browser shows file state icons (not accessed / peeked / read)
- Agent can now answer: "What NPCs are in my campaign?"

**Files to Create**:
1. `src/main/agent/tools/index.ts` - Tool registration
2. `src/main/agent/tools/listDirectory.ts` - List files/folders
3. `src/main/agent/tools/peek.ts` - Return YAML frontmatter only
4. `src/main/agent/tools/read.ts` - Return full file content
5. `src/main/vault/MarkdownParser.ts` - Extract frontmatter for peek()
6. `src/renderer/components/FileBrowser/FileStateIcon.tsx` - Icon component
7. Update `src/main/agent/prompts/systemPrompt.ts` - Add tool instructions

**Tool Schemas** (JSON Schema for Agent SDK):

**list_directory**:
```json
{
  "name": "list_directory",
  "description": "List files and folders in a directory",
  "input_schema": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "Directory path relative to vault root" },
      "recursive": { "type": "boolean", "default": false }
    },
    "required": ["path"]
  }
}
```

**peek**:
```json
{
  "name": "peek",
  "description": "Read only the YAML frontmatter of a markdown file. Use this to quickly check file metadata without reading full content.",
  "input_schema": {
    "type": "object",
    "properties": {
      "file": { "type": "string", "description": "File path relative to vault root" }
    },
    "required": ["file"]
  }
}
```

**read**:
```json
{
  "name": "read",
  "description": "Read the full content of a file. Only use after peeking if the frontmatter indicates the file is relevant.",
  "input_schema": {
    "type": "object",
    "properties": {
      "file": { "type": "string", "description": "File path relative to vault root" }
    },
    "required": ["file"]
  }
}
```

**System Prompt Update**:
```
You are Gary, a Dungeon Master assistant for D&D 5e campaigns.

## Progressive Disclosure (CRITICAL)
Your context window is limited. ALWAYS follow this pattern:
1. Start by reading CAMPAIGN.md in full
2. When you see a file mentioned, PEEK at it first (frontmatter only)
3. Only READ the full file if frontmatter indicates it's relevant

## Tools
- list_directory(path, recursive): Explore vault structure
- peek(file): Read ONLY YAML frontmatter (metadata between --- delimiters)
- read(file): Read full file content (use sparingly!)

## Example Flow
User: "What NPCs are in my campaign?"
You:
1. read("CAMPAIGN.md")
2. list_directory("world/NPCs")
3. peek("world/NPCs/Varen-Ashworth.md")
4. peek("world/NPCs/Lydia-Ashworth.md")
5. (Now I have enough info to answer from frontmatter)
6. Respond: "Your campaign has Varen Ashworth (8-year-old human, kidnapped)
   and Lydia Ashworth (his mother, seeking help)..."

Be creative, helpful, and embrace D&D's whimsical spirit!
```

**File State Tracking**:
```typescript
enum FileState {
  NOT_ACCESSED = 'not_accessed',
  PEEKED = 'peeked',
  READ = 'read',
  MODIFIED = 'modified'  // For later milestone
}
```

**Testing**:
1. User: "What NPCs are in my campaign?"
2. Agent uses list_directory to explore
3. Agent peeks at NPC files
4. Agent responds with summary
5. File browser shows which files were peeked vs read (different icons)

**Create Test Fixture** (`tests/fixtures/mock-vault/`):
```
CAMPAIGN.md
world/
  NPCs/
    Varen-Ashworth.md (with frontmatter)
    Lydia-Ashworth.md (with frontmatter)
  Locations/
    Heartwater.md
sessions/
  Notes/
    Session-5.md
```

**Done When**:
- Agent can explore vault using tools
- Agent respects progressive disclosure (peeks before reading)
- File browser shows accurate file states

---

### Milestone 7: Write Tool (no approval, for testing)

**Goal**: Agent can create/modify files (simplified, no approval yet)

**Scope**:
- Implement `write` tool (basic version, no approval flow)
- Agent can create new files or modify existing ones
- Validation: Must read existing file before modifying it
- File browser shows "modified" state
- User can ask: "Create an NPC named Bartok" → agent creates file

**Files to Create**:
1. `src/main/agent/tools/write.ts` - Write tool implementation (no approval)
2. Update `src/main/vault/FileSystemManager.ts` - Add writeFile method
3. Update system prompt - Add write tool instructions

**Write Tool (Simplified)**:
```typescript
async execute(input: { file: string; content: string }) {
  const exists = await fs.exists(input.file);

  // Validation: Must read before write
  if (exists && !fileSystemManager.wasRead(input.file)) {
    throw new Error(
      "Cannot write to existing file without reading it first. " +
      "Use read(file) before write(file, content)."
    );
  }

  // Write file directly (no approval yet)
  await fileSystemManager.writeFile(input.file, input.content);

  return {
    success: true,
    message: `File ${input.file} ${exists ? 'modified' : 'created'} successfully`
  };
}
```

**System Prompt Update**:
```
## File Writing
- write(file, content): Create or modify a file
- IMPORTANT: You MUST read(file) before write(file) for existing files
- This ensures you have full context before making changes

Example:
User: "Update Varen's status to 'rescued'"
You:
1. peek("world/NPCs/Varen-Ashworth.md") → see it exists
2. read("world/NPCs/Varen-Ashworth.md") → get full content
3. write("world/NPCs/Varen-Ashworth.md", updated_content)
```

**Testing**:
1. User: "Create an NPC named Bartok, a grumpy dwarf blacksmith"
2. Agent creates world/NPCs/Bartok.md with frontmatter + description
3. File appears in file browser with "modified" state
4. Open file → content is correct

**Edge Case Testing**:
1. User: "Update Varen's status to rescued"
2. Agent tries write() without read() first → error
3. Agent corrects: read() then write() → succeeds

**Done When**: Agent can create/modify files, read-before-write validation works

---

### Milestone 8: Approval Workflow + Diff Viewer

**Goal**: Safe file editing with user approval before writing

**Scope**:
- Refactor `write` tool to request approval
- Agent execution pauses when write() is called
- Diff viewer shows before/after content side-by-side
- User clicks "Accept" → file written
- User clicks "Reject" (with optional comment) → agent gets feedback
- File browser still shows "modified" state only after acceptance

**Files to Create/Modify**:
1. Update `src/main/agent/tools/write.ts` - Add approval workflow
2. `src/main/agent/ApprovalManager.ts` - Manages approval pause/resume
3. `src/renderer/components/Diff/DiffViewer.tsx` - Before/after display
4. `src/renderer/components/Diff/ApprovalControls.tsx` - Accept/reject buttons
5. Update `src/common/types/agent.ts` - Add approval message types
6. Update IPC handlers - Add approval request/response

**Approval Flow**:
```
1. Agent calls write(file, content)
2. write() tool pauses execution, sends approval request via IPC:
   {
     type: 'approval-needed',
     file: 'world/NPCs/Bartok.md',
     before: '...',  // null if new file
     after: '...',
     isNew: false
   }
3. Renderer shows DiffViewer modal
4. User clicks Accept or Reject (+ comment)
5. Renderer sends response via IPC:
   {
     type: 'approval-response',
     approved: true,
     comment: null
   }
6. write() tool resumes:
   - If approved: write file, return success
   - If rejected: throw error with user comment
7. Agent sees error message with user feedback, can try again
```

**DiffViewer UI**:
```
┌─────────────────────────────────────────────────────┐
│  File: world/NPCs/Bartok.md                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │     BEFORE      │  │      AFTER       │          │
│  │                 │  │                  │          │
│  │  (empty for     │  │  ---             │          │
│  │   new file)     │  │  Status: Active  │          │
│  │                 │  │  Species: Dwarf  │          │
│  │                 │  │  ---             │          │
│  │                 │  │                  │          │
│  │                 │  │  ## Summary      │          │
│  │                 │  │  Grumpy dwarf... │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                      │
├─────────────────────────────────────────────────────┤
│  [Reject with comment]          [Accept]            │
└─────────────────────────────────────────────────────┘
```

**Testing**:
1. User: "Create an NPC named Bartok"
2. Agent generates content, calls write()
3. Diff viewer appears
4. User clicks Accept → file written
5. File browser shows "modified" state
6. Verify file exists with correct content

**Rejection Flow**:
1. User: "Create an NPC named Bartok"
2. Agent generates content
3. User clicks Reject, adds comment: "Make him friendly, not grumpy"
4. Agent sees error with comment, regenerates content
5. New diff appears
6. User clicks Accept → file written

**Done When**:
- All file writes require approval
- User can accept/reject with feedback
- Agent handles rejection gracefully

---

### Milestone 9: prepend_frontmatter Tool

**Goal**: Agent can add frontmatter to files without it (bypasses approval)

**Scope**:
- New tool: `prepend_frontmatter(file)`
- Used when agent encounters file without YAML frontmatter
- Bypasses approval (maintenance operation)
- Still tracked as "modified" in file browser
- Agent is instructed to use this proactively

**Files to Create**:
1. `src/main/agent/tools/prependFrontmatter.ts` - Prepend frontmatter tool
2. Update system prompt - Add guidance for when to use this tool

**Tool Implementation**:
```typescript
async execute(input: { file: string }) {
  // 1. Read current content
  const content = await fileSystemManager.readFile(input.file);

  // 2. Check if already has frontmatter
  const parsed = grayMatter(content);
  if (Object.keys(parsed.data).length > 0) {
    return { message: "File already has frontmatter, no changes needed" };
  }

  // 3. Generate basic frontmatter based on filename/content
  const frontmatter = generateBasicFrontmatter(input.file, content);

  // 4. Prepend to content
  const newContent = `---\n${frontmatter}\n---\n\n${content}`;

  // 5. Write directly (bypass approval - maintenance operation)
  await fileSystemManager.writeFile(input.file, newContent);

  // 6. Track as modified
  fileSystemManager.setFileState(input.file, FileState.MODIFIED);

  return {
    success: true,
    message: `Added frontmatter to ${input.file}`
  };
}
```

**System Prompt Update**:
```
## Maintaining Files
If you encounter a file without YAML frontmatter (metadata between --- delimiters):
- Use prepend_frontmatter(file) to add it
- This is a maintenance operation and doesn't require user approval
- The frontmatter should include relevant metadata based on the file's content

Example:
1. read("world/NPCs/Old-Character.md") → no frontmatter found
2. prepend_frontmatter("world/NPCs/Old-Character.md")
3. File now has basic frontmatter with Status, Species, etc.
```

**Testing**:
1. Create test file without frontmatter
2. Agent reads it
3. Agent notices no frontmatter
4. Agent uses prepend_frontmatter()
5. No approval dialog (bypasses)
6. File now has frontmatter
7. File browser shows "modified" state

**Done When**: Agent can add frontmatter to legacy files automatically

---

### Milestone 10: Planning Mode

**Goal**: Structured question collection for vague requests

**Scope**:
- Detect when agent asks multiple questions
- Show planning form UI instead of chat messages
- Collect all answers at once
- Submit back to agent as structured input
- Form validation (all questions required)

**Files to Create**:
1. `src/renderer/components/Planner/PlannerForm.tsx` - Planning form UI
2. `src/renderer/components/Planner/QuestionField.tsx` - Individual question input
3. Update system prompt - Add planning mode guidance
4. Update agent message parsing - Detect planning mode

**Planning Mode Detection**:
- Agent's response contains special marker: `<planning-mode>`
- Or heuristic: Multiple questions (3+) with question marks

**System Prompt Update**:
```
## Planning Mode
When the user's request is vague or requires multiple decisions, use planning mode.

To trigger planning mode, structure your response as:
<planning-mode>
1. What should be the tone? (epic, whimsical, dark, etc.)
2. What level range? (1-5, 6-10, 11-15, 16-20)
3. What are the core themes? (betrayal, redemption, mystery, etc.)
</planning-mode>

The user will see a form and answer all questions before you continue.

**When to use planning mode:**
- "Help me create a campaign" → YES (very vague)
- "Create a boss fight" → YES (needs location, difficulty, mechanics)
- "Create an NPC" → MAYBE (if user didn't provide details)
- "Help me plan session 6" → NO (specific, you have context from vault)
- "What NPCs are in my campaign?" → NO (straightforward query)
```

**PlannerForm UI**:
```
┌─────────────────────────────────────────────────────┐
│  Gary needs more information                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. What should be the tone?                         │
│     [___________________________________] *required  │
│                                                      │
│  2. What level range?                                │
│     [___________________________________] *required  │
│                                                      │
│  3. What are the core themes?                        │
│     [___________________________________] *required  │
│                                                      │
├─────────────────────────────────────────────────────┤
│                              [Submit All Answers]    │
└─────────────────────────────────────────────────────┘
```

**Flow**:
1. User: "Help me create a campaign"
2. Agent responds with `<planning-mode>` and questions
3. Renderer detects marker, shows PlannerForm instead of message
4. User fills all fields, clicks Submit
5. Renderer sends structured response back:
   ```
   The user answered your questions:
   1. Tone: whimsical and quirky
   2. Level range: 1-5
   3. Themes: forgetfulness, family bonds, mystery
   ```
6. Agent continues with this context

**Testing**:
1. User: "Help me create a campaign about a dragon"
2. Agent triggers planning mode with 3-4 questions
3. Planning form appears
4. User tries to submit without filling all → validation error
5. User fills all fields → submit succeeds
6. Agent receives answers and continues

**Done When**: Planning mode works for vague requests, validation enforced

---

### Milestone 11: Polish & Settings

**Goal**: Production-ready UX and configuration

**Scope**:
- Settings panel (API key, model selection, theme)
- Keyboard shortcuts (Cmd+K focus chat, Cmd+Enter send)
- Loading states and spinners
- Error handling with retry buttons
- Toast notifications
- CAMPAIGN.md creation wizard if missing
- Confirm before closing if agent is thinking

**Files to Create**:
1. `src/renderer/components/Settings/SettingsPanel.tsx`
2. `src/renderer/components/Settings/APIKeyInput.tsx`
3. `src/renderer/components/Common/LoadingSpinner.tsx`
4. `src/renderer/components/Common/Toast.tsx`
5. `src/renderer/components/Dialogs/ConfirmDialog.tsx`
6. Update `src/main/vault/VaultValidator.ts` - CAMPAIGN.md wizard

**Settings Panel**:
- API Key input (securely stored using electron-store)
- Model selection dropdown (claude-3-5-sonnet-20241022, etc.)
- Theme toggle (light/dark)
- Vault path display + change button

**Error Handling**:
- Network error → Show retry button
- Rate limit → Show wait time countdown + retry
- Invalid API key → Clear message, link to settings

**CAMPAIGN.md Wizard**:
```typescript
// On vault selection
if (!vaultValidator.hasCampaignFile()) {
  showDialog({
    title: "No CAMPAIGN.md found",
    message: "Gary works best with a campaign overview file.",
    buttons: [
      {
        label: "Create Template",
        action: async () => {
          await createTemplateCampaign();
          continue();
        }
      },
      {
        label: "Continue Anyway",
        action: () => continue()
      },
      {
        label: "Choose Different Vault",
        action: () => showVaultPicker()
      }
    ]
  });
}
```

**Keyboard Shortcuts**:
- `Cmd+K` / `Ctrl+K`: Focus chat input
- `Cmd+Enter` / `Ctrl+Enter`: Send message
- `Cmd+,` / `Ctrl+,`: Open settings
- `Esc`: Close modals

**Testing**:
1. Open settings → change API key → restart → key persisted
2. Trigger network error → retry button appears → click → retries
3. Open vault without CAMPAIGN.md → wizard appears → create template
4. Press Cmd+K → chat input focused
5. Agent thinking → try to close window → confirmation dialog

**Done When**: App feels polished, settings work, errors handled gracefully

---

### Milestone 12: Conversation Compaction

**Goal**: Manage context window with conversation summaries

**Scope**:
- Display token count in chat header
- Compact button (when tokens > 50K or similar threshold)
- Confirmation dialog
- Agent generates summary preserving key info
- New conversation starts with summary as context

**Files to Create**:
1. `src/renderer/components/Chat/CompactButton.tsx`
2. `src/renderer/components/Chat/TokenCounter.tsx`
3. Update `src/main/agent/AgentController.ts` - Add compaction method
4. Update system prompt - Add compaction instructions

**Token Counter**:
- Track tokens used (from API response)
- Display in header: "Tokens: 47,823 / 200,000"
- Show warning color when > 75% capacity

**Compact Button**:
- Visible when tokens > 50K
- Click → show confirmation
- Confirmation: "This will summarize the conversation so far. Continue?"
- If confirmed → generate summary → clear chat → start fresh with summary

**Compaction Prompt**:
```
Please summarize this conversation, preserving:
1. User's initial goal
2. User's current goal (if changed)
3. All decisions made about the campaign
4. All files that were created or modified
5. What we need to do next

Format as a concise summary that allows you to continue helping the user.
```

**Flow**:
1. Long conversation, tokens at 60K
2. User clicks Compact button
3. Confirmation dialog
4. Agent generates summary:
   ```
   Summary of previous conversation:
   - User is planning a campaign called "The Forgetful King"
   - We created 3 NPCs: Varen, Lydia, and Bartok
   - Modified CAMPAIGN.md to add Act 2 structure
   - Next: User wants to plan session 6
   ```
5. Chat cleared, summary becomes new context
6. User continues: "Now help me with session 6"
7. Agent has context from summary

**Testing**:
1. Have long conversation with agent
2. Token count increases
3. Click Compact → confirmation appears
4. Confirm → summary generated
5. Chat shows fresh start with summary context
6. Continue conversation → agent remembers key info from summary

**Done When**: Can manage long conversations without losing context

---

## Summary

The plan is structured as **12 incremental milestones**, each with clear "done when" criteria:

1. **Electron Hello World** - App opens with hardcoded message
2. **Basic React UI** - Chat layout with static content
3. **IPC Communication** - Echo server working
4. **File System Integration** - Browse vault, read files (no agent)
5. **Agent SDK Basic** - Chat with agent (no custom tools)
6. **Agent File Tools** - list_directory, peek, read working
7. **Write Tool (no approval)** - Testing file creation/modification
8. **Approval Workflow** - Safe editing with user approval
9. **prepend_frontmatter Tool** - Auto-add frontmatter
10. **Planning Mode** - Structured question collection
11. **Polish & Settings** - Production UX, error handling
12. **Conversation Compaction** - Context window management

---

## Key Technical Constraints

1. **Context Window Management**: Aggressive progressive disclosure, conversation compaction
2. **File Write Safety**: Must read before write, always require approval
3. **Obsidian Compatibility**: Respect `[[link]]` format, don't corrupt vault structure
4. **Agent Prompt Reliability**: Strong system prompt with examples to ensure consistent behavior
5. **Cross-Platform**: Use Node's `path` module, test on macOS/Windows/Linux

## Tool Specifications

### list_directory(path, recursive=false)
- Returns array of file/folder names
- If recursive=true, returns nested structure
- Handles non-existent paths gracefully

### peek(file)
- Returns only YAML frontmatter (content between `---\n` delimiters)
- Use `gray-matter` library for parsing
- Returns empty object if no frontmatter
- Tracks file as "peeked" in FileSystemManager

### read(file)
- Returns full file content
- Tracks file as "read" in FileSystemManager
- Required before write() for existing files

### write(file, content)
- Validates file was read (if existing)
- Requests user approval with diff
- Pauses agent execution until response
- Tracks file as "modified" in FileSystemManager

### prepend_frontmatter(file)
- Adds YAML frontmatter + Summary section to file
- Bypasses approval (maintenance operation)
- Still tracks as "modified" in FileSystemManager

## Testing Strategy

- **Unit Tests**: 90%+ coverage for tools, parsers, file operations
- **Integration Tests**: Agent flows, IPC communication, approval workflow
- **E2E Tests**: Top user journeys (session planning, NPC creation, campaign updates)
- **Fixtures**: Realistic mock vault with campaign structure for all tests

## Critical Files Summary

**Phase v0.1 (Foundation)**:
- `/src/main/vault/FileSystemManager.ts`
- `/src/main/vault/MarkdownParser.ts`
- `/src/main/agent/AgentController.ts`
- `/src/main/agent/tools/{listDirectory,peek,read}.ts`
- `/src/main/agent/prompts/systemPrompt.ts`
- `/src/renderer/App.tsx`
- `/src/renderer/components/Chat/ChatPane.tsx`
- `/src/renderer/components/FileBrowser/FileTree.tsx`

**Phase v0.2 (Approval)**:
- `/src/main/agent/tools/write.ts`
- `/src/main/agent/tools/prependFrontmatter.ts`
- `/src/renderer/components/Diff/DiffViewer.tsx`

**Phase v0.3 (Planning + Polish)**:
- `/src/renderer/components/Planner/PlannerForm.tsx`
- `/src/renderer/components/Chat/CompactButton.tsx`
- `/src/renderer/components/Settings/SettingsPanel.tsx`

## Implementation Approach

Each milestone should be implemented in order, with the implementer starting a fresh session per milestone for clarity. This approach allows for:
- Clear progress tracking
- Easier debugging (smaller scope per session)
- Natural stopping points
- Incremental testing and validation

The user will commit after each milestone completion and start the next milestone in a new session.
