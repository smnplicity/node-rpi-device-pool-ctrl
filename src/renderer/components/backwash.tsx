import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWater } from "@fortawesome/free-solid-svg-icons";

export default function Backwash() {
  return (
    <div className="touch-button">
      <div>
        <FontAwesomeIcon icon={faWater} size="2xl" />
      </div>
      Backwash
    </div>
  );
}
