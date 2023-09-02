import { useEffect, useState } from "react";
import { IpcChannels } from "../poolcontroller/channels";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useChannelValue = <T = any>(channel: IpcChannels) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.electron.ipcRenderer.on(channel, (arg: any) => {
      setValue(arg as T);
    });

    window.electron.ipcRenderer.sendMessage(channel);
  }, [channel, setValue]);

  return value;
};
