import { AmbientChannels, WaterChannels } from "../../../poolcontroller/channels";

import ChlorinatorOutput from "../../components/chlorinatorOutput";
import ChannelSensor from "../../components/channelSensor";
import Pump from "./components/pump";
import Chlorinator from "./components/chlorinator";

export default function Dashboard() {
  return (
    <>
      <div style={{ display: "flex" }}>
        <div className="container">
          <div className="header">Pump</div>
          <Pump />
        </div>

        <div className="container">
          <div className="header">Chlorinator</div>
          <Chlorinator />
        </div>

        <div className="container">
          <div className="header">Water</div>
          <ChannelSensor
            channel={WaterChannels.Temperature}
            units="° C"
            size="lg"
          />
        </div>

        <div className="container">
          <div className="header">Ambient</div>
          <ChannelSensor
            channel={AmbientChannels.Temperature}
            units="° C"
            size="lg"
          />

          <ChannelSensor
            channel={AmbientChannels.Humidity}
            units="% RH"
            size="sm"
          />
        </div>
      </div>
    </>
  );
}
