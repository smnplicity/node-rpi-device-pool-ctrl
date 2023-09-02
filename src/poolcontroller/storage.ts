import Store from "electron-store";

export interface ChlorinatorSettings {
  pin: number | null;
  output: number | null;
  activeCellStart: string | null;
}

export interface Settings {
  chlorinator: ChlorinatorSettings | null;
}

export const STORE_KEYS = {
  ChlorinatorPin: "chlorinator.pin",
  ChlorinatorOutput: "chlorinator.output",
  ChlorinatorActiveCellStart: "chlorinator.activeCellStart",
};

const store = new Store<Settings>();

export default store;
