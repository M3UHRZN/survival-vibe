// Resource definitions and fixed spawn positions shared between client and server.
// Index in RESOURCE_SPAWNS == server-side resource ID, so do not reorder entries.

export const RESOURCE_DEFINITIONS = {
  tree: {
    label: "Tree",
    drop: "wood",
    maxHealth: 4,
    xpPerHit: 8,
    respawnTime: 14,
  },
  rock: {
    label: "Rock",
    drop: "stone",
    maxHealth: 5,
    xpPerHit: 9,
    respawnTime: 16,
  },
  gold: {
    label: "Gold Vein",
    drop: "gold",
    maxHealth: 6,
    xpPerHit: 12,
    respawnTime: 20,
  },
};

export const RESOURCE_SPAWNS = [
  { type: "tree", position: [-11, 0, -8] },
  { type: "tree", position: [-8, 0, 5] },
  { type: "tree", position: [-1, 0, -10] },
  { type: "tree", position: [8, 0, -7] },
  { type: "tree", position: [10, 0, 8] },
  { type: "tree", position: [2, 0, 10] },
  { type: "rock", position: [-10, 0, 0] },
  { type: "rock", position: [-4, 0, 9] },
  { type: "rock", position: [6, 0, -2] },
  { type: "rock", position: [11, 0, 2] },
  { type: "gold", position: [-2, 0, 3] },
  { type: "gold", position: [4, 0, -10] },
  { type: "gold", position: [9, 0, 10] },
];
