import { Oval } from "react-loader-spinner";

import { SystemStatus } from "../../poolcontroller/types";
import { SystemChannels } from "../../poolcontroller/channels";
import { useChannelValue } from "../hooks";

interface Props {
  children: React.ReactNode;
}

const Status = ({ children }: Props) => {
  const systemStatus = useChannelValue<SystemStatus>(SystemChannels.Status);

  switch (systemStatus) {
    case SystemStatus.Available:
      return <>{children}</>;
    case SystemStatus.Error:
      return <>Couldn't initialize system. Check the system logs.</>;
    default:
      return (<div style={{
        flexGrow: 1,
        textAlign: "center",
        alignItems: "center",
        display: "flex",
        alignContent: "center",
        justifyContent: "center"
        }}>
        <Oval
          height={80}
          width={80}
          color="#fff"
          visible={true}
          secondaryColor="#aaa"
          strokeWidth={2}
          strokeWidthSecondary={2}
        
        />
        <p style={{marginLeft: "16px"}}>Initializing system...</p>
      </div>);
  }
};

export default Status;
