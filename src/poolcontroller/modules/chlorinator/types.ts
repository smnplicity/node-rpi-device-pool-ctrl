import { SwitchState } from "../../types";

export const CHLORINATOR_LOG_SCOPE = "Chlorinator";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export default interface IChlorinator {
  switch: (state: SwitchState) => void;
}
