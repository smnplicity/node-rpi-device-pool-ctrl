import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { IpcChannels } from "../../poolcontroller/channels";

import { useChannelValue } from "../hooks";

interface ChannelSensorProps {
  channel: IpcChannels;
  icon?: IconProp;
  units?: string;
  size: "xs" | "sm" | "lg";
}

export default function ChannelSensor({
  channel,
  icon,
  units,
  size,
}: ChannelSensorProps) {
  const value = useChannelValue(channel);

  if (size !== "lg") {
    return (
      <div style={{ display: "flex", fontSize: size === "xs" ? "0.9em" : "" }}>
        {icon && (
          <div style={{ flexBasis: 32 }}>
            <FontAwesomeIcon icon={icon} />
          </div>
        )}
        <div style={{ flexBasis: 128, flexGrow: 1 }}>
          {value ?? "unknown"} {value !== null ? units : ""}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexBasis: 140, width: 140 }}>
      <div style={{ fontSize: "2em", fontWeight: "bold", color: "#fff" }}>
        {value ?? "unknown"}
      </div>
      <div style={{ marginLeft: 8, fontSize: "0.8em" }}>
        {value !== null ? units : ""}
      </div>
    </div>
  );
}
