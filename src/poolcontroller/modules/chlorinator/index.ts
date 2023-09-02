import { IpcMain, WebContents } from "electron";

import MqttAdapter from "../../mqttAdapter";

import Store, { STORE_KEYS } from "../../storage";

import { ChlorinatorConfiguration } from "../../types";

import IChlorinator from "./types";
import Chlorinator from "./chlorinator";

const createChlorinator = (
  ipcMain: IpcMain,
  webContents: WebContents,
  config?: ChlorinatorConfiguration,
  mqttAdapter?: MqttAdapter
) => {
  let chlorinator: IChlorinator | null = null;

  const initialOutputValue = Store.get<string, number>(
    STORE_KEYS.ChlorinatorOutput,
    0
  );

  if (config) {
    chlorinator = new Chlorinator(
      config,
      ipcMain,
      webContents,
      initialOutputValue,
      mqttAdapter
    );
  }

  return chlorinator;
};

export default createChlorinator;
