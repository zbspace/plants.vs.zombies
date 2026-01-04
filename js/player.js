import { scene } from './scene.js';

export const playerGroup = new THREE.Group();

export function initPlayer() {
  // Base
  const baseGeo = new THREE.CylinderGeometry(1.5, 2, 0.5, 8);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.3,
    metalness: 0.8,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.25;
  playerGroup.add(base);

  // Turret
  const turretGeo = new THREE.BoxGeometry(1.5, 1.2, 2);
  const turretMat = new THREE.MeshStandardMaterial({
    color: 0x00d2ff,
    emissive: 0x0044aa,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.9,
  });
  const turret = new THREE.Mesh(turretGeo, turretMat);
  turret.position.y = 1.0;
  playerGroup.add(turret);

  // Barrels
  const barrelGeo = new THREE.CylinderGeometry(0.2, 0.2, 2.5);
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
  
  const barrelLeft = new THREE.Mesh(barrelGeo, barrelMat);
  barrelLeft.rotation.x = Math.PI / 2;
  barrelLeft.position.set(-0.6, 1.0, -1.2);
  playerGroup.add(barrelLeft);

  const barrelRight = new THREE.Mesh(barrelGeo, barrelMat);
  barrelRight.rotation.x = Math.PI / 2;
  barrelRight.position.set(0.6, 1.0, -1.2);
  playerGroup.add(barrelRight);

  playerGroup.position.set(0, 0, 5);
  scene.add(playerGroup);
}
