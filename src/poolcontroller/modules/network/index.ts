import { networkInterfaces } from "os";

import { IpcMain, WebContents, net } from "electron";
import log from "electron-log";

import wifi from "node-wifi";

import { NetworkConnection } from "../../types";
import { SystemChannels } from "../../channels";

const logger = log.scope("Network");

export const createWifiConnectivityListener = (
  ipcMain: IpcMain,
  webContents: WebContents
) => {
  let networkConnection: NetworkConnection | null = null;

  const interfaces = networkInterfaces();

  wifi.init({ iface: null });

  const poll = () => {
    try {
      wifi.getCurrentConnections((error, currentConnections) => {
        if (error) logger.error(error);
        else if (currentConnections.length > 0) {
          const connection = currentConnections[0];

          const iface = (connection as any).iface as string;

          if (iface) {
            const wifiInterfaceInfos = interfaces[iface];

            const ipv4 = wifiInterfaceInfos.filter(
              (x) => x.family === "IPv4"
            )[0];

            const nextNetworkConnection = {
              iface: iface,
              address: ipv4.address,
              ssid: connection.ssid,
              quality: connection.quality,
              signal: connection.signal_level,
              security: connection.security,
            };

            if (
              JSON.stringify(nextNetworkConnection) !==
              JSON.stringify(networkConnection)
            ) {
              webContents.send(SystemChannels.Network, networkConnection);
              networkConnection = nextNetworkConnection;
            }
          }
        }

        setTimeout(poll, 5000);
      });
    } catch (e) {
      logger.error(e);
    }
  };

  poll();

  ipcMain.on(SystemChannels.Network, (event) => {
    if (networkConnection !== null)
      event.sender.send(SystemChannels.Network, networkConnection);
  });
};
