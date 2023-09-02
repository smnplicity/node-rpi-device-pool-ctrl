import { faBoltLightning } from "@fortawesome/free-solid-svg-icons";

import { PumpChannels } from "../../../../poolcontroller/channels";
import ChannelSensor from "../../../components/channelSensor";

export default function Pump() {
  return (
    <>
      <ChannelSensor
        channel={PumpChannels.kW}
        units="kW"
        size="lg"
        icon={faBoltLightning}
      />

      <div style={{ display: "flex", marginTop: 8 }}>
        <ChannelSensor channel={PumpChannels.Voltage} units="v" size="xs" />

        <div style={{ marginLeft: 8 }}>
          <ChannelSensor channel={PumpChannels.mA} units="mA" size="xs" />
        </div>
      </div>
    </>
  );
}
