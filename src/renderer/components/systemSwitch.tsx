import { useEffect, useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPowerOff } from "@fortawesome/free-solid-svg-icons";

import { SystemChannels, SwitchState, SystemStatus } from "../..";
import { useChannelValue } from "../hooks";

function SystemSwitch() {
  const [executing, setExecuting] = useState(false);
  const [on, setOn] = useState(false);

  const systemStatus = useChannelValue<SystemStatus>(SystemChannels.Status);

  const channelSwitchValue = useChannelValue<string>(SystemChannels.Switch);

  useEffect(() => {
    if(systemStatus === SystemStatus.Available) {
      setOn(channelSwitchValue === SwitchState.On);
      setExecuting(false);
    }
  }, [systemStatus, channelSwitchValue, setOn, setExecuting]);

  const handleToggle = () => {
    if (executing) return;

    setExecuting(true);

    window.electron.ipcRenderer.sendMessage(SystemChannels.SetSwitch, [
      on ? SwitchState.Off : SwitchState.On,
    ]);
  };

  return (
    <div className="touch-button">
      <div>
        <FontAwesomeIcon
          icon={faPowerOff}
          onClick={handleToggle}
          size="2xl"
          color={systemStatus !== SystemStatus.Available ? "gray" : (on ? "orange" : "")}
        />
      </div>
      <div>{systemStatus !== SystemStatus.Available ? "" : (on ? "On" : "Off")}</div>
    </div>
  );
}

export default SystemSwitch;
