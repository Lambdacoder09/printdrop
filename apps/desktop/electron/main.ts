import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 650,
    title: 'PrintDrop - Counter Workstation',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    backgroundColor: '#1c1917',
    show: false,
  });

  const devUrl = 'http://localhost:5175';
  mainWindow.loadURL(devUrl).catch(() => {
    mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'));
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Windows Printing Handler
ipcMain.handle('print-document', async (event, options) => {
  if (!mainWindow) return { success: false, error: 'Window not active' };
  return new Promise((resolve) => {
    mainWindow?.webContents.print(
      {
        silent: false,
        printBackground: true,
        copies: options?.copies || 1,
        color: options?.color !== false,
      },
      (success, failureReason) => {
        resolve({ success, failureReason });
      }
    );
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
