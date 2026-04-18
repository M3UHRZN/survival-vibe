import { Room } from "colyseus";
import {
  MAX_ROOM_SIZE,
  SERVER_TICK_RATE,
} from "../../../shared/constants/network.js";
import { CLIENT_MESSAGE_TYPES } from "../../../shared/messages/message-types.js";
import { normalizeMoveMessage } from "../../../shared/messages/move-message.js";
import { PlayerState } from "../state/player-state.js";
import { SurvivalState } from "../state/survival-state.js";
import { MovementSystem } from "../systems/movement-system.js";
import { ResourceSystem } from "../systems/resource-system.js";

export class SurvivalRoom extends Room {
  maxClients = MAX_ROOM_SIZE;
  state = new SurvivalState();
  movementSystem = new MovementSystem();
  resourceSystem = new ResourceSystem();
  playerInputs = new Map();

  onCreate(options = {}) {
    this.state.tick = 0;
    this.state.worldSeed = Number.isInteger(options.worldSeed) ? options.worldSeed : 1;

    // Populate server-authoritative resource state before any client joins.
    this.resourceSystem.initResources(this.state.resources);

    // Colyseus 0.17: register message handlers inside onCreate via this.onMessage().
    this.onMessage(CLIENT_MESSAGE_TYPES.MOVE, (client, payload) => {
      const current = this.playerInputs.get(client.sessionId) || normalizeMoveMessage();
      const next = normalizeMoveMessage(payload);

      if (next.seq < current.seq) {
        return;
      }

      this.playerInputs.set(client.sessionId, next);
    });

    this.onMessage(CLIENT_MESSAGE_TYPES.INTERACT, (client, payload) => {
      this.resourceSystem.handleInteract(
        this.state.resources,
        client,
        payload,
        this.state.players,
      );
    });

    this.setSimulationInterval(
      (deltaTime) => this.updateSimulation(deltaTime),
      1000 / SERVER_TICK_RATE,
    );
  }

  onJoin(client, options = {}) {
    const spawn = createSpawnPoint(this.state.players.size);
    const player = new PlayerState();

    player.displayName = sanitizeDisplayName(options.name, this.state.players.size + 1);
    player.x = spawn.x;
    player.y = 0;
    player.z = spawn.z;
    player.rotation = spawn.rotation;

    this.state.players.set(client.sessionId, player);
    this.playerInputs.set(client.sessionId, normalizeMoveMessage());
  }

  onLeave(client) {
    this.state.players.delete(client.sessionId);
    this.playerInputs.delete(client.sessionId);
  }

  updateSimulation(deltaTime) {
    const deltaSeconds = Math.min(deltaTime / 1000, 0.1);

    this.state.players.forEach((player, sessionId) => {
      this.movementSystem.stepPlayer(player, this.playerInputs.get(sessionId), deltaSeconds);
    });

    this.resourceSystem.tick(this.state.resources, deltaSeconds);

    this.state.tick += 1;
  }
}

function createSpawnPoint(index) {
  const angle = (index % 8) * (Math.PI / 4);
  const radius = Math.min(6, 2.4 + index * 0.35);
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  return {
    x,
    z,
    rotation: Math.atan2(x, z),
  };
}

function sanitizeDisplayName(value, fallbackIndex) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return `Survivor ${fallbackIndex}`;
  }

  return value.trim().slice(0, 18);
}
