// Both spawn generators live in shared/ so server and client produce identical spawn lists.
// Resource ID = array index in buildResourceSpawns output.
// Animal ID   = array index in buildAnimalSpawns output.
export { buildResourceSpawns } from "@shared/core/spawn-generator.js";
export { buildAnimalSpawns } from "@shared/core/animal-spawn-generator.js";
