# Gary - Dungeon Master Assistant

Gary is an AI assistant designed to help Dungeon Masters for D&D 5e create rich, fun adventures.

## Milestone 1: Electron Hello World ✓

This milestone establishes the basic Electron application with TypeScript.

### Project Structure

```
gary/
├── src/
│   └── main/              # Main process (Node.js)
│       ├── index.ts       # Application entry point
│       └── window/
│           └── WindowManager.ts  # Window management
├── dist/
│   └── main/              # Compiled JavaScript output
│       ├── index.html    # Static HTML (copied by build)
│       ├── index.js      # Compiled entry point
│       └── window/       # Compiled window manager
├── index.html            # Static HTML source
├── package.json          # Project metadata and dependencies
├── tsconfig.json         # Base TypeScript configuration
└── tsconfig.main.json    # Main process TypeScript config
```

### Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Run the application:**
   ```bash
   npm start
   ```

4. **Development mode (watch):**
   ```bash
   npm run dev
   ```
   Then in another terminal:
   ```bash
   electron dist/main/index.js
   ```

### What's Included

- **Electron 28**: Desktop application framework
- **TypeScript**: Type-safe code with ES2022 features
- **WindowManager**: Extensible window management class
- **Security**: CSP headers and contextIsolation enabled

### Expected Behavior

When you run `npm start`, an Electron window should open displaying:
- A centered "Hello from Gary! 🎲" message
- Purple gradient background
- Smooth fade-in animation
- Window can be closed normally (close button, Cmd+Q, Alt+F4)

### What's Next

Future milestones will add:
- **M2**: React UI with Vite
- **M3**: IPC communication with preload script
- **M4**: File system integration for Obsidian vaults
- **M5+**: Agent SDK integration and custom tools

## Technical Notes

### Architecture Decisions

- **Module System**: CommonJS (standard for Electron main process)
- **Build Tool**: Native TypeScript compiler (tsc)
- **Directory Structure**: `src/main/` prepared for future `renderer/` and `preload/`
- **Security**: contextIsolation enabled, nodeIntegration disabled

### TypeScript Configuration

The project uses a hierarchical TypeScript configuration:
- `tsconfig.json`: Base configuration with shared settings
- `tsconfig.main.json`: Main process specific settings (extends base)
- Future: `tsconfig.renderer.json` for React (M2), `tsconfig.preload.json` for IPC bridge (M3)

### Window Management

The `WindowManager` class is designed to be extended:
- Currently loads static HTML from project root
- Ready for preload script integration (M3)
- Will support Vite dev server in development mode (M2)

## License

MIT
