import EventEmitter from "events";

import fs from "fs";
import path from "path";

import { IpcMain, WebContents, app } from "electron";
import log from "electron-log";

import { SYSTEM_LOG_SCOPE } from "./types";

const logger = log.scope(SYSTEM_LOG_SCOPE);

export enum ConfigurationType {
  Modules,
  Mqtt,
}

export default class ConfigurationProvider<TConfig> extends EventEmitter {
  private filePath: string;

  private config: TConfig;

  constructor(
    ipcMain: IpcMain,
    webContents: WebContents,
    type: ConfigurationType,
    getChannel?: string,
    setChannel?: string
  ) {
    super();

    let file: string;

    switch (type) {
      case ConfigurationType.Mqtt:
        file = "mqtt.config.json";
        break;
      default:
        file = "modules.config.json";
        break;
    }

    this.filePath = path.join(app.getPath("userData"), file);

    if (fs.existsSync(this.filePath)) this.deserialize();

    fs.watch(this.filePath, () =>
      setTimeout(() => {
        this.deserialize();
        if (getChannel) webContents.send(getChannel, this.config);
        this.emit("change", this.config);
      }, 1000)
    );

    if (getChannel)
      ipcMain.on(getChannel, () => {
        webContents.send(getChannel, this.config);
      });

    if (setChannel)
      ipcMain.on(setChannel, (_, args) => {
        const newConfig = args[0] as TConfig;

        this.serialize(newConfig);
      });
  }

  get = () => this.config;

  on = (
    channel: "change",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (...args: any[]) => void
  ) => {
    super.on(channel, listener);

    return this;
  };

  private deserialize = () => {
    const json = fs.readFileSync(this.filePath).toString();

    this.config = JSON.parse(json) as TConfig;
  };

  private serialize = (newConfig: TConfig) => {
    try {
      const json = JSON.stringify(newConfig);

      fs.writeFileSync(this.filePath, json);

      this.config = newConfig;
    } catch (e) {
      logger.error(e);
    }
  };
}
