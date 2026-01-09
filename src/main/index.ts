import { app, BrowserWindow } from 'electron';
import { WindowManager } from './window/WindowManager';

const windowManager = new WindowManager();

// Create window when app is ready
app.on('ready', async () => {
  await windowManager.createWindow();
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, re-create window when dock icon is clicked and no windows are open
app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await windowManager.createWindow();
  }
});
