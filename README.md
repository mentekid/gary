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

- `npm run dev` - Start all dev watchers (main, preload, renderer)
- `npm run start:dev` - Run Electron in development mode
- `npm run build` - Build all processes for production
- `npm start` - Run production build
- `npm run build:main` - Build only main process
- `npm run build:preload` - Build only preload script
- `npm run build:renderer` - Build only renderer process

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

### Milestone 1: Electron Hello World ✓
Basic Electron application with TypeScript.

### Milestone 2: React UI ✓
React + Vite renderer process with Tailwind CSS.

### Milestone 3: IPC Communication (In Progress)
Echo server with IPC bridge for renderer ↔ main process communication.

### What's Next
- **M4**: File system integration for Obsidian vaults
- **M5+**: Agent SDK integration and custom tools

## Technical Notes

### Architecture Decisions

- **Module System**: CommonJS for main/preload, ESNext for renderer
- **Build Tools**: TypeScript compiler (tsc) for main/preload, Vite for renderer
- **Security**: contextIsolation enabled, nodeIntegration disabled, contextBridge for IPC
- **State Management**: Zustand for React state

## License

MIT
