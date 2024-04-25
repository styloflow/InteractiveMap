const { app, BrowserWindow, Menu, MenuItem, shell } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    width: 1600,
    height: 900
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.setMenu(null);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  const { Menu, MenuItem } = require('electron')

  const menu = new Menu()
  menu.append(new MenuItem({
    label: 'Info',
    submenu: [
      {
        label: 'Help',
        accelerator: 'F1',
        click: () => {mainWindow.webContents.executeJavaScript(`
            document.getElementById('mainNav').style.visibility = 'visible';
        `)}
      },
      {
        label: 'Discord',
        accelerator: 'F2',
        click: () => {shell.openExternal('https://discord.gg/xvbSacDdeA');}
      },
      {
        label: 'Donate <3',
        click: () => {shell.openExternal('https://ko-fi.com/1beard20');}
      },
      {
        label: 'v1.06',
        click: () => { shell.openExternal('https://cartographyassets.com/assets/10868/interactive-mapper/') }
      }
    ]
  }))

  menu.append(new MenuItem({
    label: 'Settings',
    submenu: [
      {
        label: 'Zoom Buttons',
        accelerate: 'F3',
        click: () => {mainWindow.webContents.executeJavaScript(`toggleZoomControl();`)}
      },
      {
        label: 'Toggle Darkmode',
        accelerator: 'F4',
        click: () => {mainWindow.webContents.executeJavaScript(`toggleLightMode();`)}
      },
      {
        label: 'Data Folder',
        accelerator: 'F5',
        click: () => {shell.openPath(__dirname)}
      },
      {
        label: 'Markers Images Folder',
        accelerator: 'F6',
        click: () => {shell.openPath(path.join(__dirname, 'images/markers/'))}
      },
      {
        label: 'Debug',
        accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Alt+Shift+I',
        click: () => { mainWindow.webContents.openDevTools(); }
      }
    ]
  }))

  Menu.setApplicationMenu(menu)
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// try {
//   require('electron-reloader')(module)
// } catch (_) { }