import * as THREE from "three";
import { WORLD_LIMIT } from "../config/game-config.js";
import { clampXZ, stampShadows } from "../utils/scene-utils.js";

export class AnimalEntity {
  constructor(spawn, definition, worldLimit = WORLD_LIMIT) {
    this.type = spawn.type;
    this.definition = definition;
    this.worldLimit = worldLimit;
    this.group = new THREE.Group();
    this.group.position.set(spawn.position[0], 0, spawn.position[2]);
    this.home = this.group.position.clone();

    this.health = definition.maxHealth;
    this.active = true;
    this.respawnRemaining = 0;
    this.wanderTarget = this.group.position.clone();
    this.wanderTimer = 0;
    this.fleeTimer = 0;
    this.attackCooldown = 0;
    this.state = "idle";
    this.velocity = new THREE.Vector3();
    this.scratch = new THREE.Vector3();

    buildAnimalMesh(this.group, spawn.type);
    stampShadows(this.group);
  }

  get label() {
    return this.definition.label;
  }

  reset() {
    this.health = this.definition.maxHealth;
    this.active = true;
    this.respawnRemaining = 0;
    this.group.visible = true;
    this.group.position.copy(this.home);
    this.velocity.set(0, 0, 0);
    this.wanderTarget.copy(this.home);
    this.wanderTimer = 0;
    this.fleeTimer = 0;
    this.attackCooldown = 0;
    this.state = "idle";
  }

  update({ delta, playerPosition, aggroReduction, canDamagePlayer }) {
    if (!this.active) {
      this.respawnRemaining -= delta;
      if (this.respawnRemaining <= 0) {
        this.reset();
      }
      return null;
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    const distanceToPlayer = this.group.position.distanceTo(playerPosition);

    if (this.definition.behavior === "flee") {
      this.updateFleeState(delta, playerPosition, distanceToPlayer);
    } else {
      const attack = this.updateAggressiveState(
        delta,
        playerPosition,
        distanceToPlayer,
        aggroReduction,
        canDamagePlayer,
      );
      if (attack) {
        return attack;
      }
    }

    this.group.position.addScaledVector(this.velocity, delta);
    clampXZ(this.group.position, this.worldLimit, 1);

    if (this.velocity.lengthSq() > 0.02) {
      this.group.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
    }

    return null;
  }

  hit(damage) {
    this.health -= damage;
    this.fleeTimer = 3.2;

    if (this.definition.behavior === "aggressive") {
      this.state = "chase";
    }

    if (this.health > 0) {
      return { killed: false };
    }

    this.active = false;
    this.group.visible = false;
    this.respawnRemaining = this.definition.respawnTime;
    return { killed: true };
  }

  distanceTo(position) {
    return this.group.position.distanceTo(position);
  }

  updateFleeState(delta, playerPosition, distanceToPlayer) {
    if (distanceToPlayer < this.definition.fleeRange || this.fleeTimer > 0) {
      this.state = "flee";
      this.fleeTimer = Math.max(this.fleeTimer - delta, 0);
      this.scratch.copy(this.group.position).sub(playerPosition).setY(0);

      if (this.scratch.lengthSq() < 0.05) {
        this.scratch.set(THREE.MathUtils.randFloatSpread(1), 0, THREE.MathUtils.randFloatSpread(1));
      }

      this.scratch.normalize().multiplyScalar(this.definition.fleeSpeed);
      this.velocity.lerp(this.scratch, 1 - Math.exp(-10 * delta));
      return;
    }

    this.updateWander(delta);
  }

  updateAggressiveState(delta, playerPosition, distanceToPlayer, aggroReduction, canDamagePlayer) {
    const aggroRange = this.definition.aggroRange * (1 - aggroReduction);

    if (distanceToPlayer < aggroRange || this.state === "chase") {
      this.state = "chase";
      this.scratch.copy(playerPosition).sub(this.group.position).setY(0);

      if (this.scratch.lengthSq() > 0.001) {
        this.scratch.normalize().multiplyScalar(this.definition.chaseSpeed);
        this.velocity.lerp(this.scratch, 1 - Math.exp(-8 * delta));
      }

      if (
        canDamagePlayer &&
        distanceToPlayer < this.definition.attackRange &&
        this.attackCooldown <= 0
      ) {
        this.attackCooldown = this.definition.attackCooldown;
        return {
          damage: this.definition.damage,
          label: this.definition.label,
        };
      }

      return null;
    }

    this.updateWander(delta);
    return null;
  }

  updateWander(delta) {
    this.state = "wander";
    this.wanderTimer -= delta;

    if (this.wanderTimer <= 0 || this.group.position.distanceToSquared(this.wanderTarget) < 0.8) {
      this.wanderTimer = THREE.MathUtils.randFloat(1.4, 3.6);
      this.pickWanderTarget();
    }

    this.scratch.copy(this.wanderTarget).sub(this.group.position).setY(0);

    if (this.scratch.lengthSq() > 0.01) {
      this.scratch.normalize().multiplyScalar(this.definition.walkSpeed);
      this.velocity.lerp(this.scratch, 1 - Math.exp(-4 * delta));
      return;
    }

    this.velocity.multiplyScalar(0.92);
  }

  pickWanderTarget() {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * this.definition.roamRadius;
    this.wanderTarget
      .copy(this.home)
      .add(new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance));
  }
}

function buildAnimalMesh(group, type) {
  const bodyColors = {
    cow: 0xe7e3d5,
    sheep: 0xf5f5f1,
    wolf: 0x9199a7,
    bear: 0x6e5340,
  };

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.7, 0.7),
    new THREE.MeshStandardMaterial({
      color: bodyColors[type],
      emissive: type === "wolf" || type === "bear" ? 0x241208 : 0x0f1012,
      emissiveIntensity: type === "wolf" || type === "bear" ? 0.18 : 0.08,
      roughness: 0.6,
      metalness: 0.06,
    }),
  );
  body.position.y = 0.72;
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 0.4), body.material);
  head.position.set(0.72, 0.92, 0);
  group.add(head);

  const legMaterial = new THREE.MeshStandardMaterial({
    color: type === "bear" ? 0x4f3c2f : 0x403224,
    roughness: 0.8,
  });

  for (const [x, z] of [
    [-0.36, -0.2],
    [-0.36, 0.2],
    [0.36, -0.2],
    [0.36, 0.2],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.58, 0.14), legMaterial);
    leg.position.set(x, 0.3, z);
    group.add(leg);
  }

  if (type === "cow" || type === "sheep") {
    const hornColor = type === "cow" ? 0x41392d : 0xe9ecef;
    const ears = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.12, 0.55),
      new THREE.MeshStandardMaterial({ color: hornColor, roughness: 0.5 }),
    );
    ears.position.set(0.76, 1.08, 0);
    group.add(ears);
  }

  if (type === "wolf" || type === "bear") {
    const snout = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.18, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x222933, roughness: 0.5 }),
    );
    snout.position.set(0.96, 0.84, 0);
    group.add(snout);
  }

  group.scale.setScalar(type === "bear" ? 1.45 : type === "sheep" ? 0.9 : 1);
}
