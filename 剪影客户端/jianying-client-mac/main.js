const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
    // 创建浏览器窗口
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false
        },
        // macOS 使用 .icns 图标（electron-builder 自动从 icon.png 生成）
        show: false // 先隐藏窗口，等加载完成后显示
    });

    // 加载应用的 index.html
    mainWindow.loadFile('index.html');

    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // 开发环境下自动打开开发者工具
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
    });

    // 隐藏默认菜单栏（生产环境无菜单，开发环境保留开发者工具）
    const { Menu } = require('electron');
    if (process.env.NODE_ENV === 'development') {
        const template = [
            {
                label: '视图',
                submenu: [
                    { label: '重新加载', accelerator: 'CmdOrCtrl+R', click: (item, fw) => { if (fw) fw.reload(); } },
                    { label: '开发者工具', accelerator: 'Cmd+Option+I', click: (item, fw) => { if (fw) fw.webContents.toggleDevTools(); } }
                ]
            }
        ];
        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    } else {
        Menu.setApplicationMenu(null);
    }
}

// 处理文件夹选择对话框的IPC请求
ipcMain.handle('show-folder-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog({
        title: options.title || '选择文件夹',
        properties: ['openDirectory'],
        defaultPath: options.defaultPath || ''
    });
    return result;
});

// 这段程序将会在 Electron 结束初始化和创建浏览器窗口的时候调用
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(createWindow);

// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
    // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
    // 否则绝大部分应用及其菜单栏会保持激活。
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// 在这个文件中，你可以续写应用剩下主进程代码。
// 也可以拆分成几个文件，然后用 require 导入。