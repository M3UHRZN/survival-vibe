// Server-authoritative animal AI system.
// Ported from client/src/entities/animal.js — all AI state-machine logic runs here.
// Colyseus replication broadcasts position/rotation/health to every client each tick.

import { INTERACTION_RANGE, WORLD_LIMIT } from "../../../shared/constants/gameplay.js";
import { buildAnimalSpawns } from "../../../shared/core/animal-spawn-generator.js";
import { ANIMAL_DEFINITIONS } from "../../../shared/data/animal-spawns.js";
import { SERVER_MESSAGE_TYPES } from "../../../shared/messages/message-types.js";
import { normalizeInteractMessage } from "../../../shared/messages/interact-message.js";
import { AnimalState } from "../state/animal-state.js";

export class AnimalSystem {
  // Internal per-animal simulation data that does NOT need replication.
  // Keys match the animalMap keys ("0", "1", …).
  _sim = new Map();

  // Populate the room's animals MapSchema from the shared spawn list.
  // Call once in SurvivalRoom.onCreate before any clients join.
  initAnimals(animalMap) {
    const spawns = buildAnimalSpawns();

    spawns.forEach((spawn, index) => {
      const def = ANIMAL_DEFINITIONS[spawn.type];
      if (!def) {
        return;
      }

      const state = new AnimalState();
      state.type = spawn.type;
      state.x = spawn.position[0];
      state.z = spawn.position[2];
      state.rotation = 0;
      state.health = def.maxHealth;
      state.active = true;
      state.aiState = "wander";
      state.respawnTimer = 0;

      animalMap.set(String(index), state);

      this._sim.set(String(index), {
        homeX: spawn.position[0],
        homeZ: spawn.position[2],
        velocityX: 0,
        velocityZ: 0,
        wanderTargetX: spawn.position[0],
        wanderTargetZ: spawn.position[2],
        wanderTimer: 0,
        fleeTimer: 0,
        attackCooldown: 0,
      });
    });
  }

  // Simulate all animals for one tick.
  // room is passed so we can send DAMAGE_TAKEN directly to the attacked client.
  tick(animalMap, players, room, deltaSeconds) {
    animalMap.forEach((animal, key) => {
      if (!animal.active) {
        animal.respawnTimer -= deltaSeconds;

        if (animal.respawnTimer <= 0) {
          const def = ANIMAL_DEFINITIONS[animal.type];
          const sim = this._sim.get(key);
          animal.active = true;
          animal.health = def.maxHealth;
          animal.respawnTimer = 0;
          animal.aiState = "wander";
          animal.x = sim.homeX;
          animal.z = sim.homeZ;
          sim.velocityX = 0;
          sim.velocityZ = 0;
          sim.attackCooldown = 0;
          sim.fleeTimer = 0;
          sim.wanderTimer = 0;
        }

        return;
      }

      const sim = this._sim.get(key);
      if (!sim) {
        return;
      }

      const def = ANIMAL_DEFINITIONS[animal.type];
      sim.attackCooldown = Math.max(0, sim.attackCooldown - deltaSeconds);

      const closest = findClosestPlayer(players, animal.x, animal.z);

      if (def.behavior === "flee") {
        updateFlee(animal, sim, def, closest, deltaSeconds);
      } else {
        const attack = updateAggressive(animal, sim, def, closest, deltaSeconds);

        if (attack) {
          const target = room.clients.find((c) => c.sessionId === attack.sessionId);
          if (target) {
            target.send(SERVER_MESSAGE_TYPES.DAMAGE_TAKEN, {
              damage: def.damage,
              label: def.label,
            });
          }
        }
      }

      // Apply velocity
      animal.x += sim.velocityX * deltaSeconds;
      animal.z += sim.velocityZ * deltaSeconds;

      // Clamp to world boundary
      const limit = WORLD_LIMIT - 1;
      animal.x = Math.max(-limit, Math.min(limit, animal.x));
      animal.z = Math.max(-limit, Math.min(limit, animal.z));

      // Update facing rotation if moving
      const speedSq = sim.velocityX * sim.velocityX + sim.velocityZ * sim.velocityZ;
      if (speedSq > 0.02) {
        animal.rotation = Math.atan2(sim.velocityX, sim.velocityZ);
      }
    });
  }

  // Validate and apply a player INTERACT (attack) against an animal.
  handleInteract(animalMap, client, rawPayload, players) {
    const payload = normalizeInteractMessage(rawPayload);

    const key = String(payload.targetId);
    const animal = animalMap.get(key);
    const player = players.get(client.sessionId);

    if (!animal || !animal.active || !player) {
      client.send(SERVER_MESSAGE_TYPES.ACTION_REJECTED, { reason: "invalid_target" });
      return false;
    }

    // Allow 50 % extra range to absorb network latency.
    const dx = animal.x - player.x;
    const dz = animal.z - player.z;
    if (dx * dx + dz * dz > INTERACTION_RANGE * INTERACTION_RANGE * 1.5) {
      client.send(SERVER_MESSAGE_TYPES.ACTION_REJECTED, { reason: "out_of_range" });
      return false;
    }

    const animalDamage = payload.animalDamage;
    const def = ANIMAL_DEFINITIONS[animal.type];

    animal.health -= animalDamage;

    // Trigger flee / aggro reaction
    const sim = this._sim.get(key);
    if (sim) {
      sim.fleeTimer = 3.2;
      if (def.behavior === "aggressive") {
        animal.aiState = "chase";
      }
    }

    if (animal.health > 0) {
      // Still alive — no loot yet
      return true;
    }

    // Animal killed
    animal.active = false;
    animal.health = 0;
    animal.respawnTimer = def.respawnTime;
    animal.aiState = "dead";

    // Reuse INVENTORY_CHANGED to grant meat + xp.
    // baseAmount = def.meat so client applies meatYield bonus on top.
    client.send(SERVER_MESSAGE_TYPES.INVENTORY_CHANGED, {
      drop: "meat",
      baseAmount: def.meat,
      xp: def.xpOnDefeat,
      resourceType: null,
      animalType: animal.type,
    });

    return true;
  }
}

// ─── AI helpers (pure functions, no class state) ───────────────────────────

function findClosestPlayer(players, animalX, animalZ) {
  let closestDistSq = Infinity;
  let closestSessionId = null;
  let closestX = 0;
  let closestZ = 0;

  players.forEach((player, sessionId) => {
    const dx = player.x - animalX;
    const dz = player.z - animalZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < closestDistSq) {
      closestDistSq = distSq;
      closestSessionId = sessionId;
      closestX = player.x;
      closestZ = player.z;
    }
  });

  if (closestSessionId === null) {
    return null;
  }

  return {
    sessionId: closestSessionId,
    x: closestX,
    z: closestZ,
    dist: Math.sqrt(closestDistSq),
  };
}

function updateFlee(animal, sim, def, closest, delta) {
  if (closest && (closest.dist < def.fleeRange || sim.fleeTimer > 0)) {
    animal.aiState = "flee";
    sim.fleeTimer = Math.max(sim.fleeTimer - delta, 0);

    let dirX = animal.x - closest.x;
    let dirZ = animal.z - closest.z;
    const len = Math.sqrt(dirX * dirX + dirZ * dirZ);

    if (len < 0.05) {
      dirX = 1;
      dirZ = 0;
    } else {
      dirX /= len;
      dirZ /= len;
    }

    const targetVX = dirX * def.fleeSpeed;
    const targetVZ = dirZ * def.fleeSpeed;
    const lerpT = 1 - Math.exp(-10 * delta);
    sim.velocityX += (targetVX - sim.velocityX) * lerpT;
    sim.velocityZ += (targetVZ - sim.velocityZ) * lerpT;
    return;
  }

  updateWander(animal, sim, def, delta);
}

// Returns { sessionId } if the animal attacks a player this tick, otherwise null.
function updateAggressive(animal, sim, def, closest, delta) {
  const aggroRange = def.aggroRange;

  if (closest && (closest.dist < aggroRange || animal.aiState === "chase")) {
    animal.aiState = "chase";

    const dirX = closest.x - animal.x;
    const dirZ = closest.z - animal.z;
    const len = Math.sqrt(dirX * dirX + dirZ * dirZ);

    if (len > 0.001) {
      const nx = dirX / len;
      const nz = dirZ / len;
      const lerpT = 1 - Math.exp(-8 * delta);
      sim.velocityX += (nx * def.chaseSpeed - sim.velocityX) * lerpT;
      sim.velocityZ += (nz * def.chaseSpeed - sim.velocityZ) * lerpT;
    }

    if (closest.dist < def.attackRange && sim.attackCooldown <= 0) {
      sim.attackCooldown = def.attackCooldown;
      return { sessionId: closest.sessionId };
    }

    return null;
  }

  // Player left aggro range — revert to wander
  if (animal.aiState === "chase") {
    animal.aiState = "wander";
  }

  updateWander(animal, sim, def, delta);
  return null;
}

function updateWander(animal, sim, def, delta) {
  if (animal.aiState !== "chase") {
    animal.aiState = "wander";
  }

  sim.wanderTimer -= delta;

  const dx = sim.wanderTargetX - animal.x;
  const dz = sim.wanderTargetZ - animal.z;
  const distSq = dx * dx + dz * dz;

  if (sim.wanderTimer <= 0 || distSq < 0.8) {
    sim.wanderTimer = 1.4 + Math.random() * 2.2;
    pickWanderTarget(sim, def);
  }

  const dx2 = sim.wanderTargetX - animal.x;
  const dz2 = sim.wanderTargetZ - animal.z;
  const distSq2 = dx2 * dx2 + dz2 * dz2;

  if (distSq2 > 0.01) {
    const len = Math.sqrt(distSq2);
    const lerpT = 1 - Math.exp(-4 * delta);
    sim.velocityX += ((dx2 / len) * def.walkSpeed - sim.velocityX) * lerpT;
    sim.velocityZ += ((dz2 / len) * def.walkSpeed - sim.velocityZ) * lerpT;
  } else {
    sim.velocityX *= 0.92;
    sim.velocityZ *= 0.92;
  }
}

function pickWanderTarget(sim, def) {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * def.roamRadius;
  sim.wanderTargetX = sim.homeX + Math.cos(angle) * distance;
  sim.wanderTargetZ = sim.homeZ + Math.sin(angle) * distance;
}
