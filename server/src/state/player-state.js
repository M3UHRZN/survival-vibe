import { schema } from "@colyseus/schema";

export const PlayerState = schema({
  displayName: "string",
  x: "number",
  y: "number",
  z: "number",
  rotation: "number",
});
