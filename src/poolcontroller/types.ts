import { SensorType } from "@smnplicity/node-dht-sensor";

export enum SwitchState {
  On = "ON",
  Off = "OFF",
}

export const SYSTEM_LOG_SCOPE = "System";

export enum SystemStatus {
  Initializing,
  Available,
  Error,
}

export interface PumpSchedule {
  on: string;
  off: string;
}

export interface TuyaConfiguration {
  ipAddress: string;
  deviceId: string;
  localKey: string;
  version?: string;
}

interface SwitchConfiguration {
  type: "tuya";
  configuration: TuyaConfiguration;
}

export interface PumpConfiguration {
  switch: SwitchConfiguration;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SystemConfiguration {}

interface ChlorinatorCellConfiguration {
  in1: number;
  in2: number;
  descaleCycleDays: number;
}

interface Ina226Configuration {
  address: number;
  rShunt: number;
  maxMa: number;
}

export interface ChlorinatorConfiguration {
  cell: ChlorinatorCellConfiguration;
  powerConsumption?: Ina226Configuration;
}

interface Ds18b20Configuration {
  deviceId: string;
  units: "C" | "F";
}

interface DhtConfiguration {
  gpio: number;
  type: SensorType;
}

export interface WaterTemperatureConfiguration {
  type: "ds18b20";
  configuration: Ds18b20Configuration;
}

export interface WaterConfiguration {
  temperature?: WaterTemperatureConfiguration;
}

export interface MqttGlobalConfiguration {
  host: string;
  port: number;
  username: string;
  password: string;
  topicPrefix?: string;
}

export interface AmbientTemperatureConfiguration {
  type: "dht";
  configuration: DhtConfiguration;
}

export interface AmbientConfiguration {
  temperature?: AmbientTemperatureConfiguration;
}

export interface ModuleConfiguration {
  pump?: PumpConfiguration;
  chlorinator?: ChlorinatorConfiguration;
  water?: WaterConfiguration;
  ambient?: AmbientConfiguration;
}

export interface NetworkConnection {
  iface: string;
  address: string;
  ssid?: string;
  quality?: number;
  signal?: number;
  security?: string;
}
