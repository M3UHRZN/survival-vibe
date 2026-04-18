import { schema } from "@colyseus/schema";
import { PlayerState } from "./player-state.js";
import { ResourceState } from "./resource-state.js";
import { AnimalState } from "./animal-state.js";

export const SurvivalState = schema({
  players: { map: PlayerState },
  resources: { map: ResourceState },
  animals: { map: AnimalState },
  tick: "number",
  worldSeed: "number",
});
