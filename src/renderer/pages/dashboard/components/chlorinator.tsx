import { faBoltLightning } from "@fortawesome/free-solid-svg-icons";

import { ChlorinatorChannels } from "../../../../poolcontroller/channels";
import ChannelSensor from "../../../components/channelSensor";
import ChlorinatorOutput from "../../../components/chlorinatorOutput";

export default function Chlorinator() {
  return (
    <>
			<ChannelSensor
        channel={ChlorinatorChannels.kW}
        units="kW"
        size="lg"
        icon={faBoltLightning}
      />

      <div style={{ display: "flex", marginTop: 8 }}>
        <ChannelSensor channel={ChlorinatorChannels.Voltage} units="v" size="xs" />

        <div style={{ marginLeft: 8 }}>
          <ChannelSensor channel={ChlorinatorChannels.mA} units="mA" size="xs" />
        </div>
      </div>

			<div style={{fontSize: "0.8em"}}>Output</div>

      <ChlorinatorOutput />
    </>
  );
}
