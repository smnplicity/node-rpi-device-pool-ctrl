import { useEffect, useState } from "react";

import JSONPretty from "react-json-pretty";
import "react-json-pretty/themes/monikai.css";

import { ConfigurationChannels } from "../../../../poolcontroller/channels";
import { ModuleConfiguration } from "../../../../poolcontroller/types";

const Configuration = () => {
  const [moduleConfiguration, setModuleConfiguration] =
    useState<ModuleConfiguration | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.electron.ipcRenderer.on(
      ConfigurationChannels.ModuleConfiguration,
      (config: ModuleConfiguration) => {
        setModuleConfiguration(config);
      }
    );

    window.electron.ipcRenderer.sendMessage(
      ConfigurationChannels.ModuleConfiguration
    );
  }, [setModuleConfiguration]);
  return (
    <div style={{ flex: 1 }}>
      <JSONPretty data={moduleConfiguration}></JSONPretty>
    </div>
  );
};

export default Configuration;
