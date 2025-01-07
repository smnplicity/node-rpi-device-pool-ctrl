import { IpcMain, WebContents } from "electron";
import log from "electron-log";

import schedule from "node-schedule";

import { ConfigurationChannels, SystemChannels } from "./channels";

import MqttAdapter, { createMqttAdapterAsync } from "./mqttAdapter";
import {
  ModuleConfiguration,
  MqttGlobalConfiguration,
  PumpSchedule,
  SYSTEM_LOG_SCOPE,
  SwitchState,
  SystemStatus,
} from "./types";

import IPump, { createPumpAsync } from "./modules/pump";
import createChlorinator from "./modules/chlorinator";
import IChlorinator from "./modules/chlorinator/types";
import createWaterTemperatureMonitor from "./modules/water/temperature";
import createAmbientTemperatureMonitor from "./modules/ambient/temperature";

import ConfigurationProvider, {
  ConfigurationType,
} from "./configurationProvider";
import { createWifiConnectivityListener } from "./modules/network";

const logger = log.scope(SYSTEM_LOG_SCOPE);

export default class PoolController {
  private ipcMain: IpcMain;
  private webContents: WebContents;

  private status = SystemStatus.Initializing;

  private switch = SwitchState.Off;

  private pump: IPump | null = null;
  private chlorinator: IChlorinator | null = null;

  private schedulePumpOn?: schedule.Job;
  private schedulePumpOff?: schedule.Job;

  constructor(ipcMain: IpcMain, webContents: WebContents) {
    this.ipcMain = ipcMain;
    this.webContents = webContents;
  }

  start = async () => {
    this.webContents.send(SystemChannels.Status, this.status);

    const moduleConfigProvider = new ConfigurationProvider<ModuleConfiguration>(
      this.ipcMain,
      this.webContents,
      ConfigurationType.Modules,
      ConfigurationChannels.ModuleConfiguration,
      ConfigurationChannels.SetModuleConfiguration
    );

    const moduleConfig = moduleConfigProvider.get();

    const mqttConfigProvider =
      new ConfigurationProvider<MqttGlobalConfiguration>(
        this.ipcMain,
        this.webContents,
        ConfigurationType.Mqtt
      );

    const mqttConfig = mqttConfigProvider.get();

    createWifiConnectivityListener(this.ipcMain, this.webContents);

    const mqttAdapter = await createMqttAdapterAsync(mqttConfig);

    this.chlorinator = createChlorinator(
      this.ipcMain,
      this.webContents,
      moduleConfig.chlorinator,
      mqttAdapter
    );

    let pump: IPump | null = null;

    if (moduleConfig.pump)
      pump = await createPumpAsync(
        this.ipcMain,
        this.webContents,
        moduleConfig.pump,
        mqttAdapter
      );

    if (pump !== null) {
      pump.on("switch", async (value: SwitchState) => {
        this.switch = value;

        if (mqttAdapter)
          await mqttAdapter.publishAsync(SystemChannels.Switch, value);

        this.webContents.send(SystemChannels.Switch, value);

        if (this.chlorinator) this.chlorinator.switch(value);

        if (this.status === SystemStatus.Initializing) {
          this.status = SystemStatus.Available;
          this.webContents.send(SystemChannels.Status, this.status);
        }
      });

      pump.on("connected", () => this.ensurePumpScheduler(mqttAdapter));

      this.pump = pump;
    } else {
      this.switch = SwitchState.On;
      this.status = SystemStatus.Available;
      this.webContents.send(SystemChannels.Status, this.status);
    }

    if (moduleConfig.water?.temperature) {
      createWaterTemperatureMonitor(
        this.ipcMain,
        this.webContents,
        moduleConfig.water.temperature,
        mqttAdapter
      );
    }

    if (moduleConfig.ambient?.temperature) {
      createAmbientTemperatureMonitor(
        this.webContents,
        moduleConfig.ambient.temperature,
        mqttAdapter
      );
    }

    if (mqttAdapter) {
      mqttAdapter.on(SystemChannels.SetSwitch, (message) => {
        const receivedValue = message.toString() as SwitchState;
        if (pump) pump.switch(receivedValue);
      });
    }

    this.ipcMain.on(SystemChannels.Switch, (event) => {
      event.sender.send(SystemChannels.Switch, this.switch);
    });

    this.ipcMain.on(SystemChannels.SetSwitch, (_, args) => {
      const value = args[0] as SwitchState;

      if (pump) pump.switch(value);
    });

    this.ipcMain.on(SystemChannels.Status, (event) => {
      event.sender.send(SystemChannels.Status, this.status);
    });
  };

  stop = () => {
    this.chlorinator?.switch(SwitchState.Off);
  };

  private ensurePumpScheduler = (mqttAdapter: MqttAdapter) => {
    if (!this.schedulePumpOn) {
      mqttAdapter.on(SystemChannels.Schedule, (data) => {
        const scheduleTimes = JSON.parse(data.toString()) as PumpSchedule;

        const pad = (val: string) => {
          const s = `0${val}`;
          return s.substring(s.length - 2);
        };

        const scheduleOnParts = scheduleTimes.on.split(":");
        const scheduleOnHour = pad(scheduleOnParts[0]);
        const scheduleOnMinutes = pad(scheduleOnParts[1]);

        const scheduleOffParts = scheduleTimes.off.split(":");
        const scheduleOffHour = pad(scheduleOffParts[0]);
        const scheduleOffMinutes = pad(scheduleOffParts[1]);

        logger.info(
          `Pump scheduled to run between ${scheduleOnHour}:${scheduleOnMinutes} and ${scheduleOffHour}:${scheduleOffMinutes}.`
        );

        if (this.schedulePumpOn) {
          this.schedulePumpOn.reschedule(
            `${scheduleOnMinutes} ${scheduleOnHour}`
          );
        } else {
          this.schedulePumpOn = schedule.scheduleJob(
            `${scheduleOnMinutes} ${scheduleOnHour} * * *`,
            () => {
              logger.info("Scheduled to turn pool pump on.");
              this.pump.switch(SwitchState.On, true);
            }
          );
        }

        if (this.schedulePumpOff) {
          this.schedulePumpOn.reschedule(
            `${scheduleOffMinutes} ${scheduleOffHour}`
          );
        } else {
          this.schedulePumpOff = schedule.scheduleJob(
            `${scheduleOffMinutes} ${scheduleOffHour} * * *`,
            () => {
              logger.info("Scheduled to turn pool pump off.");
              this.pump.switch(SwitchState.Off, true);
            }
          );
        }
      });
    }
  };
}
