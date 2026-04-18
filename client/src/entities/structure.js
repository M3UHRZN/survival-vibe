import * as THREE from "three";
import { stampShadows } from "../utils/scene-utils.js";

export class StructureEntity {
  constructor(recipe, position) {
    this.recipe = recipe;
    this.radius = recipe.placementRadius;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = `Structure:${recipe.label}`;

    buildStructureMesh(this.group, recipe);
    stampShadows(this.group);
  }
}

function buildStructureMesh(group, recipe) {
  switch (recipe.id) {
    case "campfire":
      buildCampfire(group);
      break;
    case "storage-crate":
      buildStorageCrate(group);
      break;
    case "workbench":
      buildWorkbench(group);
      break;
    case "snare-trap":
      buildSnareTrap(group);
      break;
    case "smelter":
      buildSmelter(group);
      break;
    default:
      buildPlaceholder(group);
      break;
  }
}

function buildCampfire(group) {
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x7f8da0,
    roughness: 0.86,
    metalness: 0.04,
  });
  const logMaterial = new THREE.MeshStandardMaterial({
    color: 0x7f5432,
    roughness: 0.78,
  });

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), stoneMaterial);
    stone.position.set(Math.cos(angle) * 0.6, 0.18, Math.sin(angle) * 0.6);
    group.add(stone);
  }

  for (const rotation of [Math.PI / 4, -Math.PI / 4]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.4, 8), logMaterial);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = rotation;
    log.position.y = 0.22;
    group.add(log);
  }

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.26, 0.6, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffb35f,
      emissive: 0xff6b2f,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    }),
  );
  flame.position.y = 0.55;
  group.add(flame);

  const light = new THREE.PointLight(0xff8f45, 6, 8, 2);
  light.position.set(0, 0.9, 0);
  group.add(light);
}

function buildStorageCrate(group) {
  const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a643f,
    roughness: 0.72,
  });
  const bandMaterial = new THREE.MeshStandardMaterial({
    color: 0x9aa7b7,
    roughness: 0.22,
    metalness: 0.58,
  });

  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.9), woodMaterial);
  crate.position.y = 0.45;
  group.add(crate);

  for (const x of [-0.42, 0.42]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.92, 0.94), bandMaterial);
    band.position.set(x, 0.46, 0);
    group.add(band);
  }
}

function buildWorkbench(group) {
  const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a643f,
    roughness: 0.72,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0xb0bfce,
    roughness: 0.24,
    metalness: 0.62,
  });

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 1), woodMaterial);
  top.position.y = 1.1;
  group.add(top);

  for (const [x, z] of [
    [-0.78, -0.35],
    [-0.78, 0.35],
    [0.78, -0.35],
    [0.78, 0.35],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), woodMaterial);
    leg.position.set(x, 0.55, z);
    group.add(leg);
  }

  const vice = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.24, 0.26), metalMaterial);
  vice.position.set(0.45, 1.3, 0);
  group.add(vice);
}

function buildSnareTrap(group) {
  const ropeMaterial = new THREE.MeshStandardMaterial({
    color: 0xceb98b,
    roughness: 0.9,
  });
  const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0x75543a,
    roughness: 0.76,
  });

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.04, 8, 24),
    ropeMaterial,
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  for (const [x, z] of [
    [-0.4, -0.4],
    [-0.4, 0.4],
    [0.4, -0.4],
    [0.4, 0.4],
  ]) {
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 6), woodMaterial);
    peg.position.set(x, 0.45, z);
    group.add(peg);
  }
}

function buildSmelter(group) {
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x606a77,
    roughness: 0.92,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x8fa2b4,
    roughness: 0.28,
    metalness: 0.44,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.08, 1.5, 10), stoneMaterial);
  base.position.y = 0.75;
  group.add(base);

  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.1, 10), stoneMaterial);
  chimney.position.set(0.45, 1.7, 0);
  group.add(chimney);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.1), metalMaterial);
  mouth.position.set(0, 0.7, 0.98);
  group.add(mouth);

  const core = new THREE.PointLight(0xff9b4d, 5, 6, 2);
  core.position.set(0, 0.85, 0.45);
  group.add(core);
}

function buildPlaceholder(group) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x79f7d3 }),
  );
  mesh.position.y = 0.5;
  group.add(mesh);
}
