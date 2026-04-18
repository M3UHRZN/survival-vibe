import { ANIMAL_SPAWNS, RESOURCE_SPAWNS } from "../data/game-data.js";

export function buildResourceSpawns(worldLimit) {
  const rng = createSeededRandom(1307);
  const spawns = [...RESOURCE_SPAWNS];
  const occupied = RESOURCE_SPAWNS.map((spawn) => [spawn.position[0], spawn.position[2]]);

  addScatterSpawns(spawns, occupied, rng, "tree", 28, 7, worldLimit - 3, 3.2, worldLimit);
  addScatterSpawns(spawns, occupied, rng, "rock", 18, 9, worldLimit - 2, 3.1, worldLimit);
  addScatterSpawns(spawns, occupied, rng, "gold", 10, 12, worldLimit - 2, 4.4, worldLimit);

  return spawns;
}

export function buildAnimalSpawns(worldLimit) {
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
    spawns.push({
      type,
      position: [position[0], 0, position[1]],
    });
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
