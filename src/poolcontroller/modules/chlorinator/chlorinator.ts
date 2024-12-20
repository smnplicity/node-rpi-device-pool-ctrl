import { IpcMain, WebContents } from "electron";
import log from "electron-log";

import { DateTime } from "luxon";

import INA226, {
  Ina226ConnectInfo,
  Ina226DataChange,
} from "@node-rpi-gpio/ina226";

import { ChlorinatorChannels } from "../../channels";

import { ChlorinatorConfiguration, SwitchState } from "../../types";
import Store, { STORE_KEYS } from "../../storage";
import MqttAdapter from "../../mqttAdapter";
import { GpioMode, pwmWrite, setMode } from "../../gpioInterop";

import IChlorinator, { CHLORINATOR_LOG_SCOPE } from "./types";

const logger = log.scope(CHLORINATOR_LOG_SCOPE);

export default class Chlorinator implements IChlorinator {
  private ipcMain: IpcMain;

  private webContents: WebContents;

  private mqttAdapter?: MqttAdapter;

  private outputGpio: number | null;

  private in1: number;

  private in2: number;

  private outputValue: number;
  private pumpSwitchState: SwitchState;

  constructor(
    config: ChlorinatorConfiguration,
    ipcMain: IpcMain,
    webContents: WebContents,
    initialOutputValue: number,
    mqttAdapter?: MqttAdapter
  ) {
    this.ipcMain = ipcMain;
    this.webContents = webContents;
    this.mqttAdapter = mqttAdapter;

    this.outputValue = initialOutputValue;

    this.ipcMain
      .on(ChlorinatorChannels.SetOutput, async (_, args) =>
        this.setOutput(args[0] as number)
      )
      .on(ChlorinatorChannels.Output, (event) =>
        event.sender.send(ChlorinatorChannels.Output, this.outputValue)
      );

    if (this.mqttAdapter) {
      this.mqttAdapter.on(ChlorinatorChannels.SetOutput, (message) =>
        this.setOutput(parseFloat(message.toString()))
      );
    }

    this.webContents.send(ChlorinatorChannels.Output, this.outputValue);

    if (config.powerConsumption) {
      const ina226 = new INA226(config.powerConsumption)
        .on("connect", (connectInfo: Ina226ConnectInfo) => {
          logger.info(`INA226 connected: ${JSON.stringify(connectInfo)}`);
        })
        .on("debug", (data: any) => {
          //logger.debug(`INA226: ${data}`);
        })
        .on("error", (error: Error) => {
          logger.error("INA226", error);
        })
        .on("change", (data: Ina226DataChange) => {
          const kw = Number((Math.abs(data.power) / 1000.0).toFixed(2));
          const current = Math.abs(data.current);

          this.webContents.send(ChlorinatorChannels.Voltage, data.busVoltage);
          this.webContents.send(ChlorinatorChannels.kW, kw);
          this.webContents.send(ChlorinatorChannels.mA, current);

          if (this.mqttAdapter) {
            this.mqttAdapter.publishAsync(
              ChlorinatorChannels.Voltage,
              data.busVoltage.toString()
            );
            this.mqttAdapter.publishAsync(
              ChlorinatorChannels.kW,
              kw.toString()
            );
            this.mqttAdapter.publishAsync(
              ChlorinatorChannels.mA,
              current.toString()
            );
          }
        })
        .connect();
    }

    this.beginCycle(config);
  }

  switch = (state: SwitchState) => {
    this.pumpSwitchState = state;

    const switchedValue = state === SwitchState.On ? this.outputValue : 0;

    if (this.mqttAdapter) {
      this.mqttAdapter.publishAsync(
        ChlorinatorChannels.Output,
        switchedValue.toString()
      );
    }

    this.pwmWrite(switchedValue);
  };

  private setOutput = (rawValue: number) => {
    const value = Math.min(100, Math.max(0, rawValue));

    logger.debug(`${this.outputValue} to ${value} (raw: ${rawValue})`);

    if (value === this.outputValue) return;

    this.outputValue = value;

    try {
      Store.set(STORE_KEYS.ChlorinatorOutput, this.outputValue);
    } catch (e) {
      logger.error("Couldn't persist output value to store.", e);
    }

    this.webContents.send(ChlorinatorChannels.Output, this.outputValue);

    if (this.mqttAdapter) {
      this.mqttAdapter.publishAsync(
        ChlorinatorChannels.Output,
        this.outputValue.toString()
      );
    }

    this.pwmWrite(value);
  };

  private beginCycle = (config: ChlorinatorConfiguration) => {
    this.in1 = config.cell.in1;
    this.in2 = config.cell.in2;

    setMode(this.in1, GpioMode.Output);
    pwmWrite(this.in1, 0);

    setMode(this.in2, GpioMode.Output);
    pwmWrite(this.in2, 0);

    this.outputGpio = Store.get<string, number>(STORE_KEYS.ChlorinatorPin, 1);

    setInterval(() => {
      try {
        const cellStartDate = Store.get<string, string>(
          STORE_KEYS.ChlorinatorActiveCellStart,
          DateTime.utc().toFormat("yyyy-MM-dd")
        );

        const max = DateTime.fromFormat(cellStartDate, "yyyy-MM-dd").plus({
          days: config.cell.descaleCycleDays,
        });

        let switchCells = max <= DateTime.utc();

        if (switchCells) {
          const outputGpio = this.outputGpio === 1 ? 2 : 1;

          Store.set(STORE_KEYS.ChlorinatorPin, outputGpio);
          Store.set(
            STORE_KEYS.ChlorinatorActiveCellStart,
            DateTime.utc().toFormat("yyyy-MM-dd")
          );

          this.outputGpio = outputGpio;

          this.pwmWrite(this.outputValue);
        }
      } catch (e) {
        logger.error("Couldn't check cycle.", e);
      }
    }, 1000 * 60 * 60); // Check every hour.
  };

  private pwmWrite = (value: number) => {
    try {
      if (this.pumpSwitchState === SwitchState.Off && value > 0) return;

      // NEVER go to 100% of the output capability - prevent possible heat issues.
      const max = 255 * 0.8;

      const dutyCycle = Math.round(
        Math.min(max, Math.max(0, max * (value / 100.0)))
      );

      const on = this.outputGpio === 1 ? this.in1 : this.in2;
      const off = this.outputGpio === 1 ? this.in2 : this.in1;

      logger.debug(`Setting ${on} to pwm duty cycle value ${dutyCycle}`);

      pwmWrite(off, 0);
      pwmWrite(on, dutyCycle);
    } catch (e) {
      logger.error("Couldn't set duty cycle.", e);
    }
  };
}
