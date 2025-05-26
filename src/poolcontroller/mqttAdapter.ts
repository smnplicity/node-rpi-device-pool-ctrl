import EventEmitter from "events";

import log from "electron-log";

import mqtt, { MqttClient } from "mqtt";

import { MqttGlobalConfiguration } from "./types";

const logger = log.scope("MQTT");

type MqttAdapterMessageCallback = (message: Buffer) => void;

export type MqttAdapterUnsubscribeCallback = () => Promise<void>;

export default class MqttAdapter {
  private emitter = new EventEmitter();

  private mqttClient?: MqttClient;

  private mqttGlobalConfig: MqttGlobalConfiguration;

  private subscribedTopics = new Set<string>();

  private buffer: Record<string, any> = {};

  constructor(
    mqttGlobalConfig: MqttGlobalConfiguration,
    mqttClient?: MqttClient
  ) {
    this.mqttGlobalConfig = mqttGlobalConfig;
    this.mqttClient = mqttClient;

    this.mqttClient?.on("message", (fullTopic, message) => {
      if (this.subscribedTopics.has(fullTopic)) {
        logger.info(`Received ${fullTopic}: ${message}`);
        this.emitter.emit(fullTopic, message);
      }
    });

    this.mqttClient?.on("disconnect", (data) => {
      logger.warn(
        `Disconnected from ${mqttGlobalConfig.host}:${mqttGlobalConfig.port}. Reason: ${data.reasonCode} - ${data.properties?.reasonString}.`
      );
    });

    this.mqttClient?.on("reconnect", () => {
      logger.info(
        `Reconnected to ${mqttGlobalConfig.host}:${mqttGlobalConfig.port}.`
      );

      for (const topic in this.buffer)
        this.publishInternalAsync(topic, this.buffer[topic]);
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

  publishAsync = (topic: string, message: Buffer | string) =>
    this.publishInternalAsync(topic, message);

  private publishInternalAsync = async (
    topic: string,
    message: Buffer | string
  ) => {
    try {
      if (!this.mqttClient) return;

      this.buffer[topic] = message;

      if (
        !this.mqttClient.connected ||
        this.mqttClient.reconnecting ||
        this.mqttClient.disconnected ||
        this.mqttClient.disconnecting
      )
        return;

      await this.mqttClient.unsubscribeAsync(this.toFullTopic(topic));

      await this.mqttClient.publishAsync(this.toFullTopic(topic), message);

      await this.mqttClient.subscribeAsync(this.toFullTopic(topic));
    } catch (e) {
      logger.error("Couldn't publish to mqtt", e);
    }
  };

  private checkMqttSubscription = async (topic: string) => {
    const fullTopic = this.toFullTopic(topic);

    if (!this.subscribedTopics.has(fullTopic)) {
      await this.mqttClient.subscribe(fullTopic);

      logger.debug(`Subscribed to ${fullTopic}`);

      this.subscribedTopics.add(fullTopic);
    }
  };

  private toFullTopic = (topic: string) => {
    if (!this.mqttGlobalConfig.topicPrefix) return topic;

    return `${this.mqttGlobalConfig.topicPrefix}/${topic}`;
  };
}

const createMqttClientAsync = async (
  mqttGlobalConfig?: MqttGlobalConfiguration
) => {
  let mqttClient: MqttClient | undefined;

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
        reconnectOnConnackError: true,
      },
      true
    );

    logger.info(
      `Connected to ${mqttGlobalConfig.host}:${mqttGlobalConfig.port}.`
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
