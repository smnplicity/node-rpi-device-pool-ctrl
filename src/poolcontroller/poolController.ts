import { IpcMain, WebContents } from "electron";
import log from "electron-log";

import { ConfigurationChannels, SystemChannels } from "./channels";

import { createMqttAdapterAsync } from "./mqttAdapter";
import {
  ModuleConfiguration,
  MqttGlobalConfiguration,
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

export default class PoolController {
  private ipcMain: IpcMain;
  private webContents: WebContents;

  private status = SystemStatus.Initializing;

  private switch = SwitchState.Off;

  private pump: IPump | null = null;
  private chlorinator: IChlorinator | null = null;

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
}
