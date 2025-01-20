import { EOL } from "os";

import { execSync } from "child_process";

import log from "electron-log";

const logger = log.scope("GPIO");

//
// Interop sucks but pigpio requires sudo to function.
//

export enum GpioMode {
  Input = "r",
  Output = "w",
}

export enum GpioLevel {
  Low = 0,
  High = 1,
}

export const getMode = (gpio: number) => {
  const output = run(gpio, "mg");

  return output === "0" ? GpioMode.Input : GpioMode.Output;
};

export const setMode = (gpio: number, mode: GpioMode) => {
  run(gpio, "m", [mode]);
};

export const getLevel = (gpio: number) => {
  const output = run(gpio, "r");

  return output === "0" ? GpioLevel.Low : GpioLevel.High;
};

export const setLevel = (gpio: number, level: GpioLevel) => {
  run(gpio, "w", [level.toString()]);
};

export const getPwmRange = (gpio: number) => {
  const output = run(gpio, "prg");

  try {
    return parseInt(output);
  } catch {
    return 255;
  }
};

export const pwmWrite = (gpio: number, dutyCycle: number) => {
  const output = run(gpio, "p", [Math.round(dutyCycle).toString()]);

  if (output !== "") {
    const errorLines = output.split(EOL);

    throw new Error(errorLines[1]);
  }
};

const run = (gpio: number, cmd: string, params?: string[]) => {
  try {
    const fullCmd = `pigs ${cmd} ${gpio} ${params ? params.join(" ") : ""}`;

    logger.debug(fullCmd);

    const res = execSync(fullCmd);

    return res?.byteLength > 0 ? res.toString() : "";
  } catch (e: unknown) {
    let error: Error = new Error("Unknown error.");

    if (e instanceof Error) error = e;
    else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = e as any;

      if (err.pid && err.error) error = err.error as Error;
      else if (err) error = new Error(err.toString());
    }

    throw error;
  }
};
