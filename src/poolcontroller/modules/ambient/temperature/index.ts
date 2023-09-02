import { WebContents } from "electron";
import log from "electron-log";

import dht, { SensorType } from "@smnplicity/node-dht-sensor";

import { AmbientTemperatureConfiguration } from "../../../types";
import { AmbientChannels } from "../../../channels";
import MqttAdapter from "../../../mqttAdapter";

import { AMBIENT_TEMP_LOG_SCOPE } from "./types";

const logger = log.scope(AMBIENT_TEMP_LOG_SCOPE);

const createAmbientTemperatureMonitor = (
  webContents: WebContents,
  configuration: AmbientTemperatureConfiguration,
  mqttAdapter?: MqttAdapter
) => {
  const logger = log.scope(AMBIENT_TEMP_LOG_SCOPE);

  logger.info(
    `Begin monitoring ambient temperature with ${configuration.type}`
  );

  switch (configuration.type) {
    case "dht": {
      pollDht(
        webContents,
        configuration.configuration.gpio,
        configuration.configuration.type,
        mqttAdapter
      );

      break;
    }
  }
};

const pollDht = async (
  webContents: WebContents,
  gpio: number,
  type: SensorType,
  mqttAdapter?: MqttAdapter,
  errorReported?: boolean
) => {
  try {
    const value = await dht.promises.read(type, gpio);

    errorReported = false;

    webContents.send(AmbientChannels.Temperature, value.temperature.toFixed(1));
    webContents.send(AmbientChannels.Humidity, value.humidity.toFixed(1));

    if (mqttAdapter) {
      await mqttAdapter.publishAsync(
        AmbientChannels.Temperature,
        value.temperature.toFixed(1)
      );
      await mqttAdapter.publishAsync(
        AmbientChannels.Humidity,
        value.humidity.toFixed(1)
      );
    }

    setTimeout(
      () => pollDht(webContents, gpio, type, mqttAdapter, errorReported),
      10000
    );
  } catch (e) {
    if (!errorReported) {
      errorReported = true;
      logger.error(e);
    }
    setTimeout(
      () => pollDht(webContents, gpio, type, mqttAdapter, errorReported),
      5000
    );
  }
};

export default createAmbientTemperatureMonitor;
