import * as THREE from "three";
import { INTERACTION_RANGE, WORLD_LIMIT } from "../config/game-config.js";
import { buildAnimalSpawns, buildResourceSpawns } from "../core/spawn-generator.js";
import { ANIMAL_DEFINITIONS, RESOURCE_DEFINITIONS } from "../data/game-data.js";
import { AnimalEntity } from "../entities/animal.js";
import { RemotePlayerEntity } from "../entities/remote-player.js";
import { ResourceNode } from "../entities/resource.js";
import { StructureEntity } from "../entities/structure.js";

export class WorldManager {
  constructor(scene, worldLimit = WORLD_LIMIT) {
    this.scene = scene;
    this.worldLimit = worldLimit;

    this.root = new THREE.Group();
    this.root.name = "WorldRoot";

    this.terrainLayer = new THREE.Group();
    this.entityLayer = new THREE.Group();
    this.remotePlayerLayer = new THREE.Group();
    this.structureLayer = new THREE.Group();
    this.fxLayer = new THREE.Group();

    this.root.add(
      this.terrainLayer,
      this.entityLayer,
      this.remotePlayerLayer,
      this.structureLayer,
      this.fxLayer,
    );
    this.scene.add(this.root);

    this.resources = buildResourceSpawns(this.worldLimit).map(
      (spawn, index) => new ResourceNode(spawn, RESOURCE_DEFINITIONS[spawn.type], index),
    );
    this.animals = buildAnimalSpawns(this.worldLimit).map(
      (spawn) => new AnimalEntity(spawn, ANIMAL_DEFINITIONS[spawn.type], this.worldLimit),
    );
    this.remotePlayers = new Map();
    this.structures = [];
    // Set to true once the server sends the first resource state snapshot.
    // When true, resource.update() skips local respawn countdown.
    this.serverDriven = false;

    this.selectionRing = createSelectionRing();
    this.fxLayer.add(this.selectionRing);

    this.buildEnvironment();
    this.populateEntities();
  }

  buildEnvironment() {
    this.terrainLayer.add(createLights());
    this.terrainLayer.add(createSky());
    this.terrainLayer.add(createGround(this.worldLimit));
    this.terrainLayer.add(createBorder(this.worldLimit));
  }

  populateEntities() {
    for (const resource of this.resources) {
      this.entityLayer.add(resource.group);
    }

    for (const animal of this.animals) {
      this.entityLayer.add(animal.group);
    }
  }

  reset() {
    for (const resource of this.resources) {
      resource.reset();
    }

    for (const animal of this.animals) {
      animal.reset();
    }

    this.clearStructures();

    this.selectionRing.visible = false;
  }

  update({ delta, elapsedTime, playerPosition, aggroReduction, canDamagePlayer, onPlayerDamaged }) {
    for (const resource of this.resources) {
      resource.update(delta, elapsedTime, this.serverDriven);
    }

    for (const animal of this.animals) {
      const attack = animal.update({
        delta,
        playerPosition,
        aggroReduction,
        canDamagePlayer,
      });

      if (attack && onPlayerDamaged) {
        onPlayerDamaged(attack);
      }
    }
  }

  updateTargeting(playerPosition, enabled) {
    const target = enabled ? this.findNearestTarget(playerPosition) : null;

    if (!target) {
      this.selectionRing.visible = false;
      return null;
    }

    this.selectionRing.visible = true;
    this.selectionRing.position.set(target.entity.group.position.x, 0.08, target.entity.group.position.z);
    this.selectionRing.scale.setScalar(target.kind === "animal" ? 1.1 : 0.95);
    return target;
  }

  syncRemotePlayers(snapshots, localSessionId, delta, elapsedTime) {
    const activeIds = new Set();

    for (const snapshot of snapshots) {
      if (!snapshot || snapshot.sessionId === localSessionId) {
        continue;
      }

      activeIds.add(snapshot.sessionId);

      let remotePlayer = this.remotePlayers.get(snapshot.sessionId);
      if (!remotePlayer) {
        remotePlayer = new RemotePlayerEntity(snapshot);
        this.remotePlayers.set(snapshot.sessionId, remotePlayer);
        this.remotePlayerLayer.add(remotePlayer.group);
      }

      remotePlayer.sync(snapshot);
    }

    for (const [sessionId, remotePlayer] of this.remotePlayers) {
      if (!activeIds.has(sessionId)) {
        this.remotePlayerLayer.remove(remotePlayer.group);
        this.remotePlayers.delete(sessionId);
        continue;
      }

      remotePlayer.update(delta, elapsedTime);
    }
  }

  // Apply server-replicated resource state to client meshes.
  // Called by GameApp whenever NetworkClient fires onResourceStateChange.
  syncResourceStates(snapshots) {
    this.serverDriven = true;

    for (const [key, snapshot] of snapshots) {
      const index = Number(key);
      const resource = this.resources[index];
      if (resource) {
        resource.syncState(snapshot.active, snapshot.health);
      }
    }
  }

  interact(playerPosition, stats) {
    const target = this.findNearestTarget(playerPosition);
    if (!target) {
      return null;
    }

    if (target.kind === "resource") {
      const result = target.entity.hit(stats.nodeDamage);
      return {
        kind: "resource",
        label: target.entity.label,
        resourceType: target.entity.type,
        drop: target.entity.definition.drop,
        xp: target.entity.definition.xpPerHit,
        depleted: result.depleted,
      };
    }

    const result = target.entity.hit(stats.animalDamage);
    return {
      kind: "animal",
      label: target.entity.label,
      killed: result.killed,
      meat: target.entity.definition.meat,
      xp: result.killed ? target.entity.definition.xpOnDefeat : 0,
    };
  }

  placeStructure(recipe, playerPosition, playerRotation) {
    const position = getPlacementPosition(playerPosition, playerRotation, recipe.placeDistance);

    if (Math.abs(position.x) > this.worldLimit - recipe.placementRadius - 1) {
      return { success: false, message: "Yapi sinirin disina tasiyor." };
    }

    if (Math.abs(position.z) > this.worldLimit - recipe.placementRadius - 1) {
      return { success: false, message: "Yapi sinirin disina tasiyor." };
    }

    if (this.isPlacementBlocked(position, recipe.placementRadius)) {
      return { success: false, message: "Bu alan dolu. Baska bir yonde dene." };
    }

    const structure = new StructureEntity(recipe, position);
    this.structures.push(structure);
    this.structureLayer.add(structure.group);
    return { success: true, structure };
  }

  findNearestTarget(playerPosition, maxDistance = INTERACTION_RANGE) {
    let best = null;
    let bestDistance = maxDistance;

    for (const resource of this.resources) {
      if (!resource.active) {
        continue;
      }

      const distance = resource.distanceTo(playerPosition);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { kind: "resource", entity: resource, label: resource.label };
      }
    }

    for (const animal of this.animals) {
      if (!animal.active) {
        continue;
      }

      const distance = animal.distanceTo(playerPosition);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { kind: "animal", entity: animal, label: animal.label };
      }
    }

    return best;
  }

  clearStructures() {
    for (const structure of this.structures) {
      this.structureLayer.remove(structure.group);
    }
    this.structures.length = 0;
  }

  clearRemotePlayers() {
    for (const remotePlayer of this.remotePlayers.values()) {
      this.remotePlayerLayer.remove(remotePlayer.group);
    }

    this.remotePlayers.clear();
  }

  isPlacementBlocked(position, radius) {
    for (const resource of this.resources) {
      if (!resource.active) {
        continue;
      }

      if (resource.group.position.distanceTo(position) < radius + 1.1) {
        return true;
      }
    }

    for (const animal of this.animals) {
      if (!animal.active) {
        continue;
      }

      if (animal.group.position.distanceTo(position) < radius + 1.2) {
        return true;
      }
    }

    for (const structure of this.structures) {
      if (structure.group.position.distanceTo(position) < radius + structure.radius + 0.45) {
        return true;
      }
    }

    return false;
  }
}

function getPlacementPosition(playerPosition, playerRotation, distance) {
  const forward = new THREE.Vector3(Math.sin(playerRotation), 0, Math.cos(playerRotation));
  return playerPosition.clone().add(forward.multiplyScalar(distance));
}

function createLights() {
  const group = new THREE.Group();
  group.add(new THREE.AmbientLight(0xd5ebff, 0.65));

  const sun = new THREE.DirectionalLight(0xf8fbff, 2.8);
  sun.position.set(16, 22, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  group.add(sun);

  const rim = new THREE.PointLight(0x79f7d3, 30, 40, 2);
  rim.position.set(-10, 5, 4);
  group.add(rim);

  return group;
}

function createSky() {
  const starCount = 240;
  const positions = new Float32Array(starCount * 3);

  for (let index = 0; index < starCount; index += 1) {
    const offset = index * 3;
    positions[offset] = THREE.MathUtils.randFloatSpread(80);
    positions[offset + 1] = THREE.MathUtils.randFloat(10, 40);
    positions[offset + 2] = THREE.MathUtils.randFloatSpread(80);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xb5d2ff,
      size: 0.12,
      transparent: true,
      opacity: 0.75,
    }),
  );
}

function createGround(worldLimit) {
  const group = new THREE.Group();

  const plane = new THREE.Mesh(
    new THREE.CircleGeometry(worldLimit + 6, 128),
    new THREE.MeshStandardMaterial({
      color: 0x102234,
      roughness: 0.95,
      metalness: 0.08,
    }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  group.add(plane);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(worldLimit + 0.8, worldLimit + 1.45, 128),
    new THREE.MeshBasicMaterial({
      color: 0x79f7d3,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  const grid = new THREE.GridHelper(worldLimit * 2, worldLimit * 2, 0x204664, 0x18344d);
  grid.position.y = 0.01;
  grid.material.transparent = true;
  grid.material.opacity = 0.28;
  group.add(grid);

  const edgeMarker = worldLimit - 4;
  for (const [x, z] of [
    [-edgeMarker, -edgeMarker],
    [-edgeMarker, edgeMarker],
    [edgeMarker, -edgeMarker],
    [edgeMarker, edgeMarker],
  ]) {
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.75, 2.6, 6),
      new THREE.MeshStandardMaterial({
        color: 0x204b69,
        emissive: 0x0a1624,
        roughness: 0.54,
        metalness: 0.18,
      }),
    );
    marker.position.set(x, 1.3, z);
    marker.castShadow = true;
    marker.receiveShadow = true;
    group.add(marker);
  }

  return group;
}

function createBorder(worldLimit) {
  const group = new THREE.Group();
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a3b57,
    emissive: 0x081827,
    transparent: true,
    opacity: 0.5,
    roughness: 0.36,
    metalness: 0.2,
  });

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(worldLimit * 2 + 2, 1.5, 0.65),
    wallMaterial,
  );
  top.position.set(0, 0.8, -worldLimit - 0.5);
  group.add(top);

  const bottom = top.clone();
  bottom.position.z = worldLimit + 0.5;
  group.add(bottom);

  const side = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 1.5, worldLimit * 2 + 2),
    wallMaterial,
  );
  side.position.set(-worldLimit - 0.5, 0.8, 0);
  group.add(side);

  const sideB = side.clone();
  sideB.position.x = worldLimit + 0.5;
  group.add(sideB);

  for (const wall of group.children) {
    wall.castShadow = true;
  }

  return group;
}

function createSelectionRing() {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.045, 8, 48),
    new THREE.MeshBasicMaterial({
      color: 0x79f7d3,
      transparent: true,
      opacity: 0.9,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  return ring;
}
