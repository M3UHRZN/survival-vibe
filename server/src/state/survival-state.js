import { schema } from "@colyseus/schema";
import { PlayerState } from "./player-state.js";

export const SurvivalState = schema({
  players: { map: PlayerState },
  tick: "number",
  worldSeed: "number",
});
