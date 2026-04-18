import { schema } from "@colyseus/schema";
import { PlayerState } from "./player-state.js";
import { ResourceState } from "./resource-state.js";

export const SurvivalState = schema({
  players: { map: PlayerState },
  resources: { map: ResourceState },
  tick: "number",
  worldSeed: "number",
});
