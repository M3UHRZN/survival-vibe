import * as THREE from "three";
import { stampShadows } from "../utils/scene-utils.js";

export class ResourceNode {
  constructor(spawn, definition, id = 0) {
    this.id = id;
    this.type = spawn.type;
    this.definition = definition;
    this.group = new THREE.Group();
    this.group.position.set(spawn.position[0], 0, spawn.position[2]);
    this.home = this.group.position.clone();
    this.health = definition.maxHealth;
    this.active = true;
    this.respawnRemaining = 0;

    buildResourceMesh(this.group, spawn.type);
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
    this.group.rotation.set(0, 0, 0);
  }

  update(delta, elapsedTime, serverDriven = false) {
    if (!this.active) {
      if (!serverDriven) {
        // Local respawn countdown — only used in offline / single-player fallback.
        // When connected, the server drives respawn via state replication.
        this.respawnRemaining -= delta;
        if (this.respawnRemaining <= 0) {
          this.reset();
        }
      }
      return;
    }

    if (this.type === "gold") {
      this.group.rotation.y += delta * 0.45;
      return;
    }

    this.group.rotation.z = Math.sin(elapsedTime * 1.5 + this.home.x) * 0.02;
  }

  // Apply server-replicated state.  Called by WorldManager.syncResourceStates().
  syncState(serverActive, serverHealth) {
    if (serverActive && !this.active) {
      // Resource respawned — restore full visual state.
      this.reset();
    } else if (!serverActive && this.active) {
      // Resource depleted by server.
      this.active = false;
      this.group.visible = false;
    }

    this.health = serverHealth;
  }

  hit(damage) {
    this.health -= damage;
    if (this.health > 0) {
      return { depleted: false };
    }

    this.active = false;
    this.group.visible = false;
    this.respawnRemaining = this.definition.respawnTime;
    return { depleted: true };
  }

  distanceTo(position) {
    return this.group.position.distanceTo(position);
  }
}

function buildResourceMesh(group, type) {
  if (type === "tree") {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.3, 1.4, 8),
      new THREE.MeshStandardMaterial({
        color: 0x8b6238,
        roughness: 0.8,
      }),
    );
    trunk.position.y = 0.7;
    group.add(trunk);

    const leavesMaterial = new THREE.MeshStandardMaterial({
      color: 0x77c66e,
      emissive: 0x13301d,
      roughness: 0.52,
      metalness: 0.04,
    });

    for (const [x, y, z, scale] of [
      [0, 1.8, 0, 1.2],
      [-0.36, 1.45, 0.18, 0.92],
      [0.34, 1.42, -0.1, 0.92],
    ]) {
      const cluster = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.8 * scale, 0),
        leavesMaterial,
      );
      cluster.position.set(x, y, z);
      group.add(cluster);
    }

    return;
  }

  if (type === "rock") {
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x7e8fa3,
      emissive: 0x151b22,
      roughness: 0.88,
      metalness: 0.06,
    });

    for (const [x, y, z, scale] of [
      [0, 0.55, 0, 1],
      [-0.34, 0.42, 0.18, 0.78],
      [0.4, 0.36, -0.08, 0.68],
    ]) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.66 * scale, 0),
        rockMaterial,
      );
      rock.position.set(x, y, z);
      group.add(rock);
    }

    return;
  }

  const base = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.78, 0),
    new THREE.MeshStandardMaterial({
      color: 0x444f61,
      roughness: 0.9,
      metalness: 0.02,
    }),
  );
  base.position.y = 0.66;
  group.add(base);

  const crystalMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd061,
    emissive: 0x705512,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.64,
  });

  for (const [x, y, z, scale] of [
    [0.06, 1.15, 0.14, 0.6],
    [-0.25, 0.96, -0.1, 0.42],
    [0.26, 0.9, -0.22, 0.4],
  ]) {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(scale, 0),
      crystalMaterial,
    );
    crystal.position.set(x, y, z);
    group.add(crystal);
  }
}
