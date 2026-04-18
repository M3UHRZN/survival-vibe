// Deterministic animal spawn generator — mirrors the resource version in spawn-generator.js.
// Both server and client must call this to produce the same spawn list so that
// animal IDs (array indices) match across the network.

import { ANIMAL_SPAWNS } from "../data/animal-spawns.js";
import { WORLD_LIMIT } from "../constants/gameplay.js";

export function buildAnimalSpawns(worldLimit = WORLD_LIMIT) {
  const rng = createSeededRandom(4401);
  const spawns = [...ANIMAL_SPAWNS];
  const occupied = ANIMAL_SPAWNS.map((spawn) => [spawn.position[0], spawn.position[2]]);

  addScatterSpawns(spawns, occupied, rng, "cow", 5, 8, worldLimit - 4, 4.5, worldLimit);
  addScatterSpawns(spawns, occupied, rng, "sheep", 5, 7, worldLimit - 4, 4.2, worldLimit);
  addScatterSpawns(spawns, occupied, rng, "wolf", 4, 10, worldLimit - 3, 5.4, worldLimit);
  addScatterSpawns(spawns, occupied, rng, "bear", 2, 14, worldLimit - 3, 7.8, worldLimit);

  return spawns;
}

function addScatterSpawns(spawns, occupied, rng, type, count, minRadius, maxRadius, minDistance, worldLimit) {
  for (let index = 0; index < count; index += 1) {
    const position = pickScatterPosition(occupied, rng, minRadius, maxRadius, minDistance, worldLimit);
    if (!position) {
      continue;
    }

    occupied.push(position);
    spawns.push({ type, position: [position[0], 0, position[1]] });
  }
}

function pickScatterPosition(occupied, rng, minRadius, maxRadius, minDistance, worldLimit) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = minRadius + (maxRadius - minRadius) * rng();
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    if (Math.abs(x) > worldLimit - 2 || Math.abs(z) > worldLimit - 2) {
      continue;
    }

    let clear = true;
    for (const [occupiedX, occupiedZ] of occupied) {
      const dx = occupiedX - x;
      const dz = occupiedZ - z;
      if (dx * dx + dz * dz < minDistance * minDistance) {
        clear = false;
        break;
      }
    }

    if (clear) {
      return [Number(x.toFixed(2)), Number(z.toFixed(2))];
    }
  }

  return null;
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
