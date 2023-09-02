import { useEffect, useState } from "react";

import { ChlorinatorChannels, SystemChannels, SwitchState } from "../../";
import { useChannelValue } from "../hooks";

export default function ChlorinatorOutput() {
  const value = useChannelValue<number>(ChlorinatorChannels.Output);

  const [draftValue, setDraftValue] = useState<number>(0);

  const systemSwitch = useChannelValue<SwitchState>(SystemChannels.Switch);

  let changeDebounce: NodeJS.Timeout | null;

  useEffect(() => {
    if(value !== null) setDraftValue(value);
  }, [value, setDraftValue]);

  const handleCommitChange = () => {
    if (changeDebounce !== null) {
      clearTimeout(changeDebounce);
      changeDebounce = null;
    }

    changeDebounce = setTimeout(() => {
      console.log("changeDebounce", draftValue, value);
      if (draftValue != value) {
        window.electron.ipcRenderer.sendMessage(ChlorinatorChannels.SetOutput, [
          draftValue,
        ]);
      }
    }, 1000);
  };

  return (
    <>
      <span style={{fontSize: "0.75em"}}>0%</span>{" "}
      <input
        type="range"
        min={0}
        max={100}
        value={draftValue}
        disabled={systemSwitch === SwitchState.Off || systemSwitch === null}
        className="slider-large"
        onChange={(e) => setDraftValue(parseInt(e.target.value))}
        onMouseUp={handleCommitChange}
        onTouchEnd={handleCommitChange}
        style={{width: 70}}
      />{" "}
      <span style={{fontSize: "0.75em"}}>100%</span>     
    </>
  );
}
