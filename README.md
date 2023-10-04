# Raspberry PI: Pool Controller

![Pool Controller UI](https://github.com/smnplicity/node-rpi-device-pool-ctrl/blob/main/screenshot.png?raw=true)

## Compatible devices

Currently being run on a Raspberry Pi 3 Model A+.

Tested on a Pi Zero W but didn't have adequate specs.

## Installation

1. Clone the repository
2. `npm i`
3. `npm make` (note: for this to work correctly, it needs to be built in arm64 architecture). The .deb file can be founded in out/make/deb/arm64.
4. Install pigpio on the Raspberry PI
5. `sudo apt-get install <pool-ctrl.deb>`

## Configuration

### Modules

File location: ~/.config/pool-ctrl/modules.config.json

The system has been designed to provide different types of devices/sensors for each of the available modules, however, only the ones used by my own pool controller are currently supported.

#### Example

```
{
  "pump":{
    "switch":{
      "type":"tuya",
      "configuration":{
        "ipAddress":"127.0.0.1",
        "deviceId":"<device id>",
        "localKey":"<local key>"
      }
    }
  },
  "chlorinator":{
    "cell":{
      "in1":23,
      "in2":24,
      "descaleCycleDays": 14
    },
    powerConsumption: {
      "address": 64,
      "rShunt": 0.1,
      "maxMa": 10
    }
  },
  "water":{
    "temperature":{
      "type":"ds18b20",
      "configuration":{
        "deviceId":"28-3c46e381ef0a",
        "units":"C",
        "precision":1
      }
    }
  },
  "ambient":{
    "temperature":{
      "type":"dht",
      "configuration":{
        "gpio":25,
        "type":11
      }
    }
  }
}
```

### MQTT integration (optional)

File location: ~/.config/pool-ctrl/mqtt.config.json

For integrating with other systems e.g. Home Assistant.

#### Example

```
{
  "host": "127.0.0.1",
  "port": 1883,
  "username": "<username>",
  "password": "<password>",
  "topicPrefix": "pool-controller"
}
```

#### Channels (based on module configuration):

Channel names will be prefixed with the `topicPrefix` setting provided in the configuration. e.g. chlorinator/output becomes pool-controller/chlorinator/output.
