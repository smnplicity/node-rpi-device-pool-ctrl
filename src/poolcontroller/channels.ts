export enum SystemChannels {
  Status = "system/status",
  Switch = "system/switch",
  SetSwitch = "system/switch/set",
  Network = "system/network",
}

export enum ConfigurationChannels {
  ModuleConfiguration = "configuration/modules",
  SetModuleConfiguration = "configuration/modules/update",
}

export enum PumpChannels {
  kW = "pump/kW",
  mA = "pump/mA",
  Voltage = "pump/voltage",
}

export enum ChlorinatorChannels {
  Output = "chlorinator/output",
  SetOutput = "chlorinator/output/set",
  kW = "chlorinator/power/kW",
  mA = "chlorinator/power/mA",
  Voltage = "chlorinator/power/voltage",
}

export enum WaterChannels {
  Temperature = "water/temperature",
  FlowRate = "water/flow-rate",
  pH = "water/ph",
  ORP = "water/orp",
}

export enum AmbientChannels {
  Temperature = "ambient/temperature",
  Humidity = "ambient/humidity",
}

export type IpcChannels =
  | SystemChannels
  | ConfigurationChannels
  | PumpChannels
  | ChlorinatorChannels
  | WaterChannels
  | AmbientChannels;
