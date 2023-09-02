import { SystemStatus } from "../../poolcontroller/types";
import { SystemChannels } from "../../poolcontroller/channels";
import { useChannelValue } from "../hooks";

interface Props {
  children: React.ReactNode;
}

const Status = ({ children }: Props) => {
  const systemStatus = useChannelValue<SystemStatus>(SystemChannels.Status);

  console.log("Status", systemStatus);

  switch (systemStatus) {
    case SystemStatus.Available:
      return <>{children}</>;
    case SystemStatus.Error:
      return <>Couldn't initialize system. Check the system logs.</>;
    default:
      return <>Initializing...</>;
  }
};

export default Status;
