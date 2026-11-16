const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
let ptp;
try {
  ptp = require('pdf-to-printer');
} catch (e) {
  console.warn('pdf-to-printer not available in current environment:', e.message);
}

let mainWindow = null;

function checkDevServer(url, timeout = 1000) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeout, () => {
      req.abort();
      resolve(false);
    });
  });
}

// Token Storage Path (%LOCALAPPDATA%/PrintDrop/device_token.json)
function getTokenFilePath() {
  const localAppData = process.env.LOCALAPPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : path.join(process.env.HOME, '.config'));
  const dir = path.join(localAppData, 'PrintDrop');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'device_token.json');
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 650,
    title: 'PrintDrop - Counter Workstation',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
    backgroundColor: '#0c0a09',
    autoHideMenuBar: true,
    show: false,
  });

  const devUrl = 'http://localhost:5175';
  const isDevActive = await checkDevServer(devUrl, 800);

  if (isDevActive) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// -------------------------------------------------------------
// IPC: Device Token Management (%LOCALAPPDATA%)
// -------------------------------------------------------------
ipcMain.handle('get-device-token', async () => {
  try {
    const filePath = getTokenFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return { success: true, tokenData: JSON.parse(data) };
    }
    return { success: true, tokenData: null };
  } catch (err) {
    console.error('Error reading device token:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-device-token', async (event, tokenData) => {
  try {
    const filePath = getTokenFilePath();
    fs.writeFileSync(filePath, JSON.stringify(tokenData, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    console.error('Error saving device token:', err);
    return { success: false, error: err.message };
  }
});

// -------------------------------------------------------------
// IPC: Hardware Printers Discovery
// -------------------------------------------------------------
ipcMain.handle('get-printers', async () => {
  try {
    if (ptp && typeof ptp.getPrinters === 'function') {
      const printers = await ptp.getPrinters();
      return { success: true, printers };
    }
    // Fallback using Electron's webContents if available
    if (mainWindow) {
      const list = await mainWindow.webContents.getPrintersAsync();
      return {
        success: true,
        printers: list.map((p) => ({
          name: p.name,
          deviceId: p.name,
          isDefault: p.isDefault,
        })),
      };
    }
    return { success: true, printers: [] };
  } catch (err) {
    console.error('Failed to get printers:', err);
    return { success: false, error: err.message, printers: [] };
  }
});

// -------------------------------------------------------------
// IPC: Direct Silent PDF Printing to Physical Printer
// -------------------------------------------------------------
ipcMain.handle('print-pdf-direct', async (event, options) => {
  const { pdfBase64, printer, copies, monochrome, pages } = options || {};
  if (!pdfBase64) {
    return { success: false, error: 'No PDF data provided' };
  }

  const tempDir = app.getPath('temp');
  const tempFile = path.join(tempDir, `printdrop_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);

  try {
    const buffer = Buffer.from(pdfBase64, 'base64');
    fs.writeFileSync(tempFile, buffer);

    if (ptp && typeof ptp.print === 'function') {
      const printOptions = {};
      if (printer) printOptions.printer = printer;
      if (copies && copies > 1) printOptions.copies = copies;
      if (monochrome !== undefined) printOptions.monochrome = monochrome;
      if (pages && pages.trim() && pages.toLowerCase() !== 'all') printOptions.pages = pages.trim();

      await ptp.print(tempFile, printOptions);

      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // ignore deletion error
      }

      return { success: true };
    } else {
      // Fallback: If pdf-to-printer binary is not available, launch printable window
      if (mainWindow) {
        const fallbackWin = new BrowserWindow({
          show: false,
          webPreferences: { plugins: true },
        });
        await fallbackWin.loadURL(`file://${tempFile}`);
        await new Promise((resolve) => {
          fallbackWin.webContents.print(
            {
              silent: false,
              deviceName: printer || '',
              copies: copies || 1,
              color: !monochrome,
            },
            (success, failureReason) => {
              fallbackWin.close();
              try { fs.unlinkSync(tempFile); } catch (e) {}
              resolve({ success, failureReason });
            }
          );
        });
        return { success: true };
      }
      return { success: false, error: 'Printer subsystem unavailable' };
    }
  } catch (err) {
    console.error('Direct print failed:', err);
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch (e) {}
    return { success: false, error: err.message };
  }
});

// Fallback HTML Printing Handler
ipcMain.handle('print-document', async (event, options) => {
  if (!mainWindow) return { success: false, error: 'Window not active' };
  return new Promise((resolve) => {
    mainWindow.webContents.print(
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
