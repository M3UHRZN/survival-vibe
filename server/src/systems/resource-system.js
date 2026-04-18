import { INTERACTION_RANGE } from "../../../shared/constants/gameplay.js";
import { buildResourceSpawns } from "../../../shared/core/spawn-generator.js";
import { RESOURCE_DEFINITIONS } from "../../../shared/data/resource-spawns.js";
import { SERVER_MESSAGE_TYPES } from "../../../shared/messages/message-types.js";
import { normalizeInteractMessage } from "../../../shared/messages/interact-message.js";
import { ResourceState } from "../state/resource-state.js";

export class ResourceSystem {
  // Populate the room's resources MapSchema with one entry per spawn.
  // Called once in SurvivalRoom.onCreate — before any clients join.
  // Resource ID = array index (same order as client's buildResourceSpawns output).
  initResources(resourceMap) {
    const spawns = buildResourceSpawns();

    spawns.forEach((spawn, index) => {
      const def = RESOURCE_DEFINITIONS[spawn.type];
      if (!def) {
        return;
      }

      const state = new ResourceState();
      state.type = spawn.type;
      state.x = spawn.position[0];
      state.z = spawn.position[2];
      state.active = true;
      state.health = def.maxHealth;
      state.respawnTimer = 0;

      resourceMap.set(String(index), state);
    });
  }

  // Validate and apply a client INTERACT message.
  // Returns true if the hit was applied, false if rejected.
  handleInteract(resourceMap, client, rawPayload, players) {
    const payload = normalizeInteractMessage(rawPayload);

    const key = String(payload.targetId);
    const resource = resourceMap.get(key);
    const player = players.get(client.sessionId);

    if (!resource || !resource.active || !player) {
      client.send(SERVER_MESSAGE_TYPES.ACTION_REJECTED, { reason: "invalid_target" });
      return false;
    }

    // Allow 50% extra interaction range to absorb network latency / position reconciliation.
    const dx = resource.x - player.x;
    const dz = resource.z - player.z;
    if (dx * dx + dz * dz > INTERACTION_RANGE * INTERACTION_RANGE * 1.5) {
      client.send(SERVER_MESSAGE_TYPES.ACTION_REJECTED, { reason: "out_of_range" });
      return false;
    }

    const def = RESOURCE_DEFINITIONS[resource.type];
    resource.health -= payload.nodeDamage;

    if (resource.health <= 0) {
      resource.active = false;
      resource.health = 0;
      resource.respawnTimer = def.respawnTime;
    }

    // Grant base yield to this client.
    // The client multiplies baseAmount by its local yield modifiers (woodYield, globalYield, etc.)
    // until Phase 6 moves progression fully to the server.
    client.send(SERVER_MESSAGE_TYPES.INVENTORY_CHANGED, {
      drop: def.drop,
      baseAmount: 1,
      xp: def.xpPerHit,
      resourceType: resource.type,
    });

    return true;
  }

  // Advance respawn timers for all depleted resources.
  // Called every simulation tick via SurvivalRoom.updateSimulation.
  tick(resourceMap, deltaSeconds) {
    resourceMap.forEach((resource) => {
      if (resource.active || resource.respawnTimer <= 0) {
        return;
      }

      resource.respawnTimer -= deltaSeconds;

      if (resource.respawnTimer <= 0) {
        const def = RESOURCE_DEFINITIONS[resource.type];
        resource.active = true;
        resource.health = def.maxHealth;
        resource.respawnTimer = 0;
      }
    });
  }
}
