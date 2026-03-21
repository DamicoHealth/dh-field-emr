const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const database = require('./database');
const ipcHandlers = require('./ipc-handlers');
const sync = require('./sync');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  buildMenu();
}

function buildMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Encounter',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new-encounter')
        },
        { type: 'separator' },
        {
          label: 'Export CSV',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu-export-csv')
        },
        {
          label: 'Backup Database to Desktop',
          accelerator: 'CmdOrCtrl+B',
          click: async () => {
            const records = database.getAllRecords();
            const desktop = app.getPath('desktop');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const backupPath = path.join(desktop, `DH-EMR-Backup-${timestamp}.json`);
            fs.writeFileSync(backupPath, JSON.stringify(records, null, 2), 'utf8');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Backup Complete',
              message: `Backup saved to Desktop:\n${path.basename(backupPath)}`,
              detail: `${records.length} records backed up.`
            });
          }
        },
        {
          label: 'Restore from JSON Backup',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Restore from JSON Backup',
              filters: [{ name: 'JSON Files', extensions: ['json'] }],
              properties: ['openFile']
            });
            if (!result.canceled && result.filePaths.length > 0) {
              try {
                const data = fs.readFileSync(result.filePaths[0], 'utf8');
                const importedRecords = JSON.parse(data);
                if (!Array.isArray(importedRecords)) throw new Error('Invalid format');
                const confirm = await dialog.showMessageBox(mainWindow, {
                  type: 'warning',
                  title: 'Confirm Restore',
                  message: `This will import ${importedRecords.length} records from the backup.`,
                  detail: 'Existing records with the same ID will be overwritten.',
                  buttons: ['Cancel', 'Restore'],
                  defaultId: 0,
                  cancelId: 0
                });
                if (confirm.response === 1) {
                  for (const record of importedRecords) {
                    database.saveRecord(record);
                  }
                  mainWindow.webContents.send('records-restored');
                  dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Restore Complete',
                    message: `${importedRecords.length} records restored successfully.`
                  });
                }
              } catch (err) {
                dialog.showMessageBox(mainWindow, {
                  type: 'error',
                  title: 'Restore Failed',
                  message: 'Could not restore from the selected file.',
                  detail: err.message
                });
              }
            }
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  database.init(app.getPath('appData'));

  // Restore device identity from config
  const savedDeviceId = database.getConfig('setting:deviceId');
  if (savedDeviceId) database.setDeviceId(savedDeviceId);

  createWindow();
  ipcHandlers.register(mainWindow);
  sync.init(mainWindow);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    ipcHandlers.register(mainWindow);
    sync.init(mainWindow);
  }
});

app.on('will-quit', () => {
  sync.stop();
  database.close();
});
