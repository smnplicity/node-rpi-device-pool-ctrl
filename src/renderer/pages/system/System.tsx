import { SystemChannels } from "../../../poolcontroller/channels";
import { NetworkConnection } from "../../../poolcontroller/types";

import { useChannelValue } from "../../hooks";

import Configuration from "./components/configuration";

const System = () => {
  const networkConnection = useChannelValue<NetworkConnection>(SystemChannels.Network);

  return (
    <div style={{ display: "flex", flexDirection: "row", padding: 16 }}>
      <div style={{ flex: 0, flexBasis: 400 }}>
        <h4>Network</h4>
        {networkConnection !== null && 
        <>        
          <div>Interface: {networkConnection.iface}</div>
          <div>IP: {networkConnection.address}</div>
          <div>SSID: {networkConnection.ssid}</div>
          <div>Security: {networkConnection.security}</div>
          <div>Quality: {networkConnection.quality}</div>
          <div>Signal: {networkConnection.signal} dBm</div>
        </>}
      </div>
      <div style={{ flex: 1 }}>
        <div>Configuration</div>
        <Configuration />
      </div>
    </div>
  );
};

export default System;
