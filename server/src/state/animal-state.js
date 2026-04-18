import { schema } from "@colyseus/schema";

// Colyseus-replicated state for a single animal NPC.
// x, z, rotation — position/facing replicated every tick for client interpolation.
// aiState        — "wander" | "flee" | "chase" | "dead" (for client animation cues).
// health, active, respawnTimer — lifecycle state.
export const AnimalState = schema({
  type: "string",
  x: "number",
  z: "number",
  rotation: "number",
  health: "number",
  active: "boolean",
  aiState: "string",
  respawnTimer: "number",
});
