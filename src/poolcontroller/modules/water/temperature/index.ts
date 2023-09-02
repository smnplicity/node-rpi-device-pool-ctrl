import { IpcMain, WebContents, ipcMain } from "electron";
import log from "electron-log";

import DS18B20 from "@node-rpi-gpio/ds18b20";

import { WaterTemperatureConfiguration } from "../../../types";
import { WaterChannels } from "../../../channels";
import MqttAdapter from "../../../mqttAdapter";

import { WATER_TEMP_LOG_SCOPE } from "./types";

const createWaterTemperatureMonitor = (
  ipcMain: IpcMain,
  webContents: WebContents,
  configuration: WaterTemperatureConfiguration,
  mqttAdapter?: MqttAdapter
) => {
  const logger = log.scope(WATER_TEMP_LOG_SCOPE);

  logger.info(`Begin monitoring water temperature with ${configuration.type}`);

  let value: number | null = null;

  ipcMain.on(WaterChannels.Temperature, (event) =>
    event.sender.send(WaterChannels.Temperature, value)
  );

  switch (configuration.type) {
    case "ds18b20": {
      const ds18b20 = new DS18B20(configuration.configuration)
        .on("error", (err: string | Error) => {
          logger.error(err);
        })
        .on("change", (changedValue: number) => {
          value = changedValue;

          webContents.send(WaterChannels.Temperature, value);

          if (mqttAdapter && value)
            mqttAdapter.publishAsync(
              WaterChannels.Temperature,
              value.toString()
            );
        })
        .connect();

      break;
    }
  }
};

export default createWaterTemperatureMonitor;
