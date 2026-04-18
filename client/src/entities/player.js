import * as THREE from "three";
import {
  MOVE_VECTOR_FORWARD,
  MOVE_VECTOR_RIGHT,
  SPRINT_MULTIPLIER,
  WORLD_LIMIT,
} from "../config/game-config.js";
import { clampXZ } from "../utils/scene-utils.js";

export class PlayerController {
  constructor(worldLimit = WORLD_LIMIT) {
    this.worldLimit = worldLimit;
    this.group = new THREE.Group();
    this.velocity = new THREE.Vector3();

    this.moveForward = new THREE.Vector3(...MOVE_VECTOR_FORWARD);
    this.moveRight = new THREE.Vector3(...MOVE_VECTOR_RIGHT);
    this.movementInput = new THREE.Vector3();
    this.targetVelocity = new THREE.Vector3();

    const { body, toolPivot } = buildPlayerMesh(this.group);
    this.body = body;
    this.toolPivot = toolPivot;
  }

  get position() {
    return this.group.position;
  }

  reset() {
    this.group.position.set(0, 0, 0);
    this.group.rotation.y = 0;
    this.velocity.set(0, 0, 0);
    this.updateTool(0);
  }

  update({ delta, elapsedTime, input, mode, moveSpeed, swingTime }) {
    if (mode !== "playing") {
      this.velocity.multiplyScalar(0.88);
      this.group.position.addScaledVector(this.velocity, delta);
      this.updateTool(swingTime);
      return;
    }

    const { horizontal, vertical } = input.getMovementAxes();
    this.movementInput.set(0, 0, 0);
    this.movementInput.addScaledVector(this.moveRight, horizontal);
    this.movementInput.addScaledVector(this.moveForward, vertical);

    if (this.movementInput.lengthSq() > 0) {
      this.movementInput.normalize();
    }

    const speed = moveSpeed * (input.isSprinting() ? SPRINT_MULTIPLIER : 1);
    const blend = 1 - Math.exp(-(this.movementInput.lengthSq() > 0 ? 18 : 10) * delta);

    this.targetVelocity.copy(this.movementInput).multiplyScalar(speed);
    this.velocity.lerp(this.targetVelocity, blend);

    this.group.position.addScaledVector(this.velocity, delta);
    clampXZ(this.group.position, this.worldLimit, 1);

    if (this.velocity.lengthSq() > 0.05) {
      this.group.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
    }

    this.body.rotation.z =
      Math.sin(elapsedTime * 10) * 0.04 * Math.min(1, this.velocity.length() * 0.2);

    this.updateTool(swingTime);
  }

  updateTool(swingTime) {
    if (swingTime > 0) {
      const progress = 1 - swingTime / 0.2;
      this.toolPivot.rotation.z = -1.2 + Math.sin(progress * Math.PI) * 1.65;
      return;
    }

    this.toolPivot.rotation.z = -0.35;
  }
}

export function buildPlayerMesh(group, palette = {}) {
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.45, 0.85, 4, 8),
    new THREE.MeshStandardMaterial({
      color: palette.bodyColor ?? 0x7bd7ff,
      emissive: palette.bodyEmissive ?? 0x0d3551,
      emissiveIntensity: 0.45,
      roughness: 0.32,
      metalness: 0.18,
    }),
  );
  body.castShadow = true;
  body.position.y = 1.05;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 20, 20),
    new THREE.MeshStandardMaterial({
      color: 0xf7f7f2,
      roughness: 0.4,
      metalness: 0.02,
    }),
  );
  head.castShadow = true;
  head.position.set(0, 1.95, 0);
  group.add(head);

  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.5, 0.24),
    new THREE.MeshStandardMaterial({
      color: palette.backpackColor ?? 0x385776,
      roughness: 0.48,
      metalness: 0.14,
    }),
  );
  backpack.castShadow = true;
  backpack.position.set(0, 1.1, -0.33);
  group.add(backpack);

  const toolPivot = new THREE.Group();
  toolPivot.position.set(0.45, 1.35, 0.05);
  group.add(toolPivot);

  const toolHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.82, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x8c6239, roughness: 0.7 }),
  );
  toolHandle.castShadow = true;
  toolHandle.position.y = -0.22;
  toolPivot.add(toolHandle);

  const toolHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.18, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0xa5b3c8,
      roughness: 0.22,
      metalness: 0.6,
    }),
  );
  toolHead.castShadow = true;
  toolHead.position.set(0.14, 0.14, 0);
  toolPivot.add(toolHead);

  return { body, toolPivot };
}
