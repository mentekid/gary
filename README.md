# Gary - Dungeon Master Assistant

Gary is an AI assistant designed to help Dungeon Masters for D&D 5e create rich, fun adventures.

## Development

### Prerequisites
- Node.js 20+
- npm

### Setup
```bash
npm install
```

### Running in Development Mode

1. Start the dev watchers (compiles main, preload, and renderer in watch mode):
```bash
npm run dev
```

2. In a separate terminal, start Electron:
```bash
npm run start:dev
```

The Vite dev server will run on `http://localhost:5173` (or next available port if 5173 is in use).

### Building for Production

```bash
npm run build
```

This compiles all three processes:
- Main process → `dist/main/`
- Preload script → `dist/preload/`
- Renderer process → `dist/renderer/`

### Running Production Build

```bash
npm start
```

### Available Scripts

**Development:**
- `npm run dev` - Start all dev watchers (main, preload, renderer)
- `npm run start:dev` - Run Electron in development mode

**Building:**
- `npm run build` - Build all processes for production
- `npm start` - Run production build
- `npm run build:main` - Build only main process
- `npm run build:preload` - Build only preload script
- `npm run build:renderer` - Build only renderer process

**Testing:**
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Generate coverage report
- `npm run lint` - Type check all TypeScript

**Verification:**
- `npm run verify` - Run lint + tests + build (recommended before committing)
- `npm run ci` - Same as verify (for CI pipelines)

See [tests/README.md](tests/README.md) for detailed testing documentation.

## Project Structure

```
gary/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts
│   │   ├── window/     # Window management
│   │   └── ipc/        # IPC handlers
│   ├── preload/        # Preload scripts (contextBridge)
│   ├── renderer/       # React UI
│   │   ├── components/
│   │   ├── store/      # Zustand state management
│   │   └── hooks/
│   └── common/         # Shared types
├── dist/               # Compiled output
└── index.html          # HTML entry point
```

## Milestones

### Completed
- **M1**: Electron Hello World ✓
- **M2**: React UI ✓
- **M3**: IPC Communication ✓
- **M4**: File System Integration ✓
- **M5**: Agent SDK Basic Integration ✓
- **M6**: Agent File Tools (list, peek, read) ✓

### What's Next
- **M7**: Write Tool (file creation/modification)
- **M8**: Approval Workflow + Diff Viewer
- **M9**: prepend_frontmatter Tool
- **M10+**: Planning Mode, Polish & Settings

See [spec/implementation-plan.md](spec/implementation-plan.md) for full roadmap.

## Technical Notes

### Architecture Decisions

- **Module System**: CommonJS for main/preload, ESNext for renderer
- **Build Tools**: TypeScript compiler (tsc) for main/preload, Vite for renderer
- **Security**: contextIsolation enabled, nodeIntegration disabled, contextBridge for IPC
- **State Management**: Zustand for React state

## License

MIT
