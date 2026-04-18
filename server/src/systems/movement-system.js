import {
  MOVE_VECTOR_FORWARD,
  MOVE_VECTOR_RIGHT,
  PLAYER_BASE_MOVE_SPEED,
  SPRINT_MULTIPLIER,
  WORLD_LIMIT,
} from "../../../shared/constants/gameplay.js";

export class MovementSystem {
  constructor({ worldLimit = WORLD_LIMIT, padding = 1 } = {}) {
    this.worldLimit = worldLimit;
    this.padding = padding;
  }

  stepPlayer(player, inputState, deltaSeconds) {
    if (!player || !inputState) {
      return;
    }

    const speed = PLAYER_BASE_MOVE_SPEED * (inputState.sprint ? SPRINT_MULTIPLIER : 1);
    const movementX =
      MOVE_VECTOR_RIGHT[0] * inputState.horizontal + MOVE_VECTOR_FORWARD[0] * inputState.vertical;
    const movementZ =
      MOVE_VECTOR_RIGHT[2] * inputState.horizontal + MOVE_VECTOR_FORWARD[2] * inputState.vertical;

    player.x = clampToWorld(player.x + movementX * speed * deltaSeconds, this.worldLimit, this.padding);
    player.z = clampToWorld(player.z + movementZ * speed * deltaSeconds, this.worldLimit, this.padding);

    if (Math.abs(movementX) > 0.0001 || Math.abs(movementZ) > 0.0001) {
      player.rotation = Math.atan2(movementX, movementZ);
    }
  }
}

function clampToWorld(value, worldLimit, padding) {
  const max = worldLimit - padding;
  return Math.max(-max, Math.min(max, value));
}
