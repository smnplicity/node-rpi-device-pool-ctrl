import { SwitchState } from "../../types";

export const PUMP_LOG_SCOPE = "Pump";

export type PumpEvent = "switch" | "error";

export interface IPump {
  switch: (value: SwitchState) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (event: PumpEvent, listener: (...args: any[]) => void) => this;
}
