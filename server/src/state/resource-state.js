import { schema } from "@colyseus/schema";

// Colyseus-replicated state for a single resource node.
// Replicated fields: type, x, z (static after init), active, health, respawnTimer.
export const ResourceState = schema({
  type: "string",
  x: "number",
  z: "number",
  active: "boolean",
  health: "number",
  respawnTimer: "number",
});
