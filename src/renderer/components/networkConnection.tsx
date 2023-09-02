import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWifi } from "@fortawesome/free-solid-svg-icons";

import { SystemChannels } from "../../poolcontroller/channels";
import { NetworkConnection } from "../../poolcontroller/types";
import { useChannelValue } from "../hooks"

export default function NetworkConnection() {
    const connection = useChannelValue<NetworkConnection>(SystemChannels.Network);

    if(connection === null) return null;

    let color = "#ffffff";

    if(connection.quality > 75)
        color = "green";
    else if(connection.quality > 30)
        color = "yellow";
    else if(connection.quality > 0)
        color = "orange";
    else
        color = "#ffffff";

    return <><FontAwesomeIcon icon={faWifi} style={{color: color}} /> </>;
}