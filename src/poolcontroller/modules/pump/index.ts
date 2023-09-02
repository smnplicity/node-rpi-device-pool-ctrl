import { IpcMain, WebContents } from "electron";
import log from "electron-log";

import MqttAdapter from "../../mqttAdapter";

import { PumpConfiguration } from "../../types";

import PumpWithTuyaSwitch from "./pumpWithTuyaSwitch";

import { IPump, PUMP_LOG_SCOPE } from "./types";

export default IPump;

export const createPumpAsync = async (
  ipcMain: IpcMain,
  webContents: WebContents,
  pumpConfig?: PumpConfiguration,
  mqttAdapter?: MqttAdapter
): Promise<IPump | null> => {
  if (!pumpConfig) return null;

  const logger = log.scope(PUMP_LOG_SCOPE);

  // eslint-disable-next-line default-case
  switch (pumpConfig.switch.type) {
    case "tuya":
      try {
        return new PumpWithTuyaSwitch(
          ipcMain,
          webContents,
          pumpConfig.switch.configuration,
          mqttAdapter
        );
      } catch (e) {
        logger.error("Couldn't connect to the tuya device.", e);
      }

      break;
  }

  return null;
};
