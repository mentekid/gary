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
        preload: path.join(__dirname, '../../preload/preload/preload.js'),
      },
    });

    // Load Vite dev server in development, built files in production
    if (process.env.NODE_ENV === 'development') {
      await this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      const htmlPath = path.join(__dirname, '../../renderer/index.html');
      await this.mainWindow.loadFile(htmlPath);
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
