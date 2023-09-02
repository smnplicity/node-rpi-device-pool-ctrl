import { app, BrowserWindow, ipcMain } from "electron";
import log from "electron-log";
import unhandled from "electron-unhandled";

import isDev from "electron-is-dev";

import PoolController from "../poolcontroller";

// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

//app.setPath("userData", "/usr/local/etc/pool-ctrl");

if (!isDev) app.disableHardwareAcceleration();

if (require("electron-squirrel-startup")) {
  app.quit();
}

unhandled({
  logger: (error: Error) => {
    log.error("Unhandled error: ", error);
  },
  showDialog: false,
});

let mainWindow: BrowserWindow | null = null;

let poolCtrl: PoolController | null = null;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 600,
    fullscreen: !isDev,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (isDev) mainWindow.webContents.openDevTools();

  mainWindow.on("ready-to-show", async () => {
    if (!mainWindow) {
      throw new Error("mainWindow is not defined");
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });
};

const createPoolController = (): void => {
  if (!mainWindow) return;

  poolCtrl = new PoolController(ipcMain, mainWindow.webContents);
  poolCtrl.start();
};

//app.commandLine.appendSwitch("--no-sandbox");

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    createPoolController();
    app.on("activate", () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
