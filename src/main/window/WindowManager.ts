import { BrowserWindow } from 'electron';
import * as path from 'path';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  async createWindow(): Promise<BrowserWindow> {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        // Future extension point for preload script (Milestone 3):
        // preload: path.join(__dirname, '../preload/preload.js'),
      },
    });

    // Load the index.html file from dist/
    const htmlPath = path.join(__dirname, '../index.html');
    await this.mainWindow.loadFile(htmlPath);

    // Open DevTools in development (optional)
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }

    // Handle window close
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  getWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}
