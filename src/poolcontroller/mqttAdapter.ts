import EventEmitter from "events";

import log from "electron-log";

import mqtt, { AsyncMqttClient } from "async-mqtt";

import { MqttGlobalConfiguration } from "./types";

const logger = log.scope("MQTT");

type MqttAdapterMessageCallback = (message: Buffer) => void;

export type MqttAdapterUnsubscribeCallback = () => Promise<void>;

export default class MqttAdapter {
  private emitter = new EventEmitter();

  private mqttClient?: AsyncMqttClient;

  private mqttGlobalConfig: MqttGlobalConfiguration;

  private subscribedTopics = new Set<string>();

  constructor(
    mqttGlobalConfig: MqttGlobalConfiguration,
    mqttClient?: AsyncMqttClient
  ) {
    this.mqttGlobalConfig = mqttGlobalConfig;
    this.mqttClient = mqttClient;

    this.mqttClient?.on("message", (fullTopic, message, packet) => {
      if (packet.retain) return;

      if (this.subscribedTopics.has(fullTopic))
        this.emitter.emit(fullTopic, message);
    });
  }

  on = (topic: string, listener: MqttAdapterMessageCallback) => {
    this.checkMqttSubscription(topic);

    this.emitter.on(this.toFullTopic(topic), listener);

    return this;
  };

  off = (topic: string, listener: MqttAdapterMessageCallback) => {
    this.emitter.off(this.toFullTopic(topic), listener);

    return this;
  };

  publishAsync = async (topic: string, message: Buffer | string) => {
    try {
      const mqttClient = await this.getMqttClientAsync();

      if (!mqttClient) return;

      if (!mqttClient.connected) return;

      await mqttClient.unsubscribe(this.toFullTopic(topic));

      await mqttClient.publish(this.toFullTopic(topic), message);

      await mqttClient.subscribe(this.toFullTopic(topic));
    } catch (e) {
      logger.error("Couldn't publish to mqtt", e);
    }
  };

  private checkMqttSubscription = async (topic: string) => {
    const fullTopic = this.toFullTopic(topic);

    const mqttClient = await this.getMqttClientAsync();

    if (!this.subscribedTopics.has(fullTopic)) {
      await mqttClient.subscribe(fullTopic);

      logger.debug(`Subscribed to ${fullTopic}`);

      this.subscribedTopics.add(fullTopic);
    }
  };

  private getMqttClientAsync = async () => {
    if (!this.mqttClient) {
      // retry the connection, and resubscribe if needed.
    }

    return this.mqttClient;
  };

  private toFullTopic = (topic: string) => {
    if (!this.mqttGlobalConfig.topicPrefix) return topic;

    return `${this.mqttGlobalConfig.topicPrefix}/${topic}`;
  };

  private fromFullTopic = (topic: string) => {
    if (!this.mqttGlobalConfig.topicPrefix) return topic;

    return topic.replace(`${this.mqttGlobalConfig.topicPrefix}/`, "");
  };
}

const createMqttClientAsync = async (
  mqttGlobalConfig?: MqttGlobalConfiguration
) => {
  let mqttClient: AsyncMqttClient | undefined;

  if (!mqttGlobalConfig) return mqttClient;

  try {
    mqttClient = await mqtt.connectAsync(
      mqttGlobalConfig.host,
      {
        host: mqttGlobalConfig.host,
        port: mqttGlobalConfig.port,
        username: mqttGlobalConfig.username,
        password: mqttGlobalConfig.password,
        protocol: "mqtt",
      },
      true
    );

    logger.info(
      `Connected to ${mqttGlobalConfig.host}:${mqttGlobalConfig.port}`
    );

    mqttClient.on("error", (e) => {
      logger.error(e);
    });
  } catch (e) {
    logger.error(e);
  }

  return mqttClient;
};

export const createMqttAdapterAsync = async (
  mqttGlobalConfig?: MqttGlobalConfiguration
) => {
  if (!mqttGlobalConfig) return null;

  const client = await createMqttClientAsync(mqttGlobalConfig);

  return new MqttAdapter(mqttGlobalConfig, client);
};
