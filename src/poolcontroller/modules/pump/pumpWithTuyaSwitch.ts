import EventEmitter from "events";

import { IpcMain, WebContents } from "electron";
import log from "electron-log";

import TuyAPI, { DPSObject } from "tuyapi";

import MqttAdapter from "../../mqttAdapter";

import { PumpChannels } from "../../channels";

import { SwitchState, TuyaConfiguration } from "../../types";

import { IPump, PumpEvent, PUMP_LOG_SCOPE } from "./types";

const logger = log.scope(PUMP_LOG_SCOPE);

// Mapping:
// 1: switch on/off
// 18: mA
// 19: kW (divide it by 10)
// 20: voltage (divide by 10)
enum DpsIndex {
  Switch = 1,
  mA = 18,
  kW = 19,
  Voltage = 20,
}

export default class PumpWithTuyaSwitch extends EventEmitter implements IPump {
  private webContents: WebContents;

  private mqttAdapter?: MqttAdapter;

  private device: TuyAPI;

  private dpsObject: DPSObject | null = null;

  private loggedError = false;

  private disconnectNotifyTimeout: NodeJS.Timeout | null = null;

  private connecting: boolean = false;

  private scheduled?: boolean;

  constructor(
    ipcMain: IpcMain,
    webContents: WebContents,
    configuration: TuyaConfiguration,
    mqttAdapter?: MqttAdapter
  ) {
    super();

    this.webContents = webContents;

    this.mqttAdapter = mqttAdapter;

    const tuyaConfig = configuration;

    this.device = new TuyAPI({
      ip: tuyaConfig.ipAddress,
      id: tuyaConfig.deviceId,
      key: tuyaConfig.localKey,
      version: tuyaConfig.version ?? "3.3",
      issueGetOnConnect: true,
      issueRefreshOnConnect: true,
      issueRefreshOnPing: true,
    })
      .on("connected", () => {
        this.clearDisconnectTimeout();

        this.loggedError = false;

        logger.info("Connected.");

        this.emit("connected");
      })
      .on("disconnected", () => {
        logger.error("Disconnected.");

        this.clearDisconnectTimeout();

        this.disconnectNotifyTimeout = setTimeout(() => {
          this.emit("switch", SwitchState.Off);

          this.dpsObject = null;

          this.webContents.send(PumpChannels.kW, null);
          this.webContents.send(PumpChannels.Voltage, null);
          this.webContents.send(PumpChannels.mA, null);

          this.clearDisconnectTimeout();
        }, 10000);

        this.connect();
      })
      .on("data", this.analyseUpdate)
      .on("dp-refresh", this.analyseUpdate)
      .on("error", (error) => {
        if (!this.loggedError) {
          this.loggedError = true;

          logger.error(error);
        }
      });

    ipcMain
      .on(PumpChannels.Voltage, (event) => {
        if (this.dpsObject !== null) {
          const value = this.getDpsValue<number>(DpsIndex.Voltage);

          if (value !== null) event.sender.send(PumpChannels.Voltage, value);
        }
      })
      .on(PumpChannels.mA, (event) => {
        if (this.dpsObject !== null) {
          const value = this.getDpsValue<number>(DpsIndex.mA);

          if (value !== null) event.sender.send(PumpChannels.mA, value);
        }
      })
      .on(PumpChannels.kW, (event) => {
        if (this.dpsObject !== null) {
          const value = this.getDpsValue<number>(DpsIndex.kW);

          if (value !== null) event.sender.send(PumpChannels.kW, value);
        }
      });

    this.connect();
  }

  switch = (value: SwitchState, scheduled?: boolean) => {
    this.scheduled = scheduled;

    const currentValue = this.getDpsValue<string>(DpsIndex.Switch);

    if (value === currentValue) return;

    this.device.set({ dps: DpsIndex.Switch, set: value === SwitchState.On });
  };

  on = (
    channel: PumpEvent,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (...args: any[]) => void
  ) => {
    super.on(channel, listener);

    return this;
  };

  private clearDisconnectTimeout = () => {
    if (this.disconnectNotifyTimeout) {
      clearTimeout(this.disconnectNotifyTimeout);
      this.disconnectNotifyTimeout = null;
    }
  };

  private connect = async () => {
    if (this.connecting) return;

    this.connecting = true;

    while (this.connecting) {
      try {
        const res = await this.device.find();

        if (!res) {
          log.error("Couldn't find device. Trying again.");
          continue;
        }

        var connected = await this.device.connect();

        if (!connected) {
          log.error("Failed to connect. Trying again.");
          continue;
        }

        this.connecting = false;
      } catch (e) {
        log.error("Couldn't connect.", e);
      }
    }
  };

  private analyseUpdate = (incoming: DPSObject) => {
    try {
      if (this.dpsObject === null) this.dpsObject = { dps: {} };

      Object.keys(incoming.dps).forEach((key) => {
        const idx = parseInt(key);

        const equal = this.compareDpsValues(idx, incoming);

        if (equal) return;

        switch (idx) {
          case DpsIndex.Switch: {
            const newValue = this.getDpsValue<SwitchState>(idx, incoming);

            super.emit("switch", newValue);

            break;
          }
          case DpsIndex.kW: {
            const newValue = this.getDpsValue<number>(idx, incoming);

            this.webContents.send(PumpChannels.kW, newValue);

            if (this.mqttAdapter)
              this.mqttAdapter.publishAsync(
                PumpChannels.kW,
                newValue.toString()
              );

            break;
          }
          case DpsIndex.mA: {
            const newValue = this.getDpsValue<number>(idx, incoming);

            this.webContents.send(PumpChannels.mA, newValue);

            if (this.mqttAdapter)
              this.mqttAdapter.publishAsync(
                PumpChannels.mA,
                newValue.toString()
              );

            break;
          }
          case DpsIndex.Voltage: {
            const newValue = this.getDpsValue<number>(idx, incoming);

            this.webContents.send(PumpChannels.Voltage, newValue);

            if (this.mqttAdapter)
              this.mqttAdapter.publishAsync(
                PumpChannels.Voltage,
                newValue.toString()
              );

            break;
          }
        }

        this.dpsObject.dps[key] = incoming.dps[key];
      });
    } catch (e) {
      logger.error("analyseUpdate", e);
    }
  };

  private compareDpsValues = (index: DpsIndex, incoming: DPSObject) => {
    if (this.dpsObject === null) return false;

    const currentValue = this.dpsObject.dps[index];
    const newValue = incoming.dps[index];

    return currentValue === newValue;
  };

  private getDpsValue = <T>(index: DpsIndex, dpsObject?: DPSObject) => {
    const resolved = this.resolveDpsObject(dpsObject);

    if (resolved === null) return null;

    if (resolved.dps[index] === undefined) return null;

    switch (index) {
      case DpsIndex.Switch:
        return ((resolved.dps[index] as boolean) === true
          ? SwitchState.On
          : SwitchState.Off) as unknown as T;
      case DpsIndex.kW:
        return ((resolved.dps[index] as number) / 10000.0).toFixed(
          2
        ) as unknown as T;
      case DpsIndex.Voltage:
        return ((resolved.dps[index] as number) / 10.0).toFixed(
          1
        ) as unknown as T;
      case DpsIndex.mA:
        return resolved.dps[index] as number as unknown as T;
    }
  };

  private resolveDpsObject = (dpsObject?: DPSObject) =>
    dpsObject ?? this.dpsObject;
}
