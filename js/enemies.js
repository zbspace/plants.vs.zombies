import { state } from './state.js';
import { scene } from './scene.js';
import { MAX_ENEMIES } from './constants.js';
import { createStripeTexture } from './utils.js';
import { updateUI } from './ui.js';
import { updateGrid } from './physics.js';

const dummy = new THREE.Object3D();
const enemyGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const enemyTexture = createStripeTexture();
const enemyMat = new THREE.MeshStandardMaterial({
  map: enemyTexture,
  color: 0xffffff,
  roughness: 0.7,
  metalness: 0.1,
  emissive: 0x001133,
  emissiveIntensity: 0.5,
});

export const enemyMesh = new THREE.InstancedMesh(enemyGeo, enemyMat, MAX_ENEMIES);
enemyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
enemyMesh.castShadow = true;
enemyMesh.receiveShadow = true;
scene.add(enemyMesh);

export function spawnEnemy() {
  if (state.activeEnemies >= MAX_ENEMIES) return;

  const idx = state.activeEnemies;
  state.enemyX[idx] = (Math.random() - 0.5) * 30;
  state.enemyZ[idx] = -60;
  state.enemyHP[idx] = 3 + Math.floor(state.level * 0.5);
  state.enemySpeed[idx] = 0.02 + Math.random() * 0.02;
  state.enemyStatus[idx] = 0;
  state.enemyStatusTimer[idx] = 0;

  state.activeEnemies++;
}

export function removeEnemy(index) {
  if (index >= state.activeEnemies) return;

  state.activeEnemies--;
  const last = state.activeEnemies;

  if (index !== last) {
    state.enemyX[index] = state.enemyX[last];
    state.enemyZ[index] = state.enemyZ[last];
    state.enemyHP[index] = state.enemyHP[last];
    state.enemySpeed[index] = state.enemySpeed[last];
    state.enemyStatus[index] = state.enemyStatus[last];
    state.enemyStatusTimer[index] = state.enemyStatusTimer[last];
  }
}

export function updateEnemies(playerPos, now) {
  let nearestDist = Infinity;
  let targetIdx = -1;

  for (let i = 0; i < state.activeEnemies; i++) {
    // Status Effects
    let speedMultiplier = 1.0;
    if (state.enemyStatus[i] === 2) speedMultiplier = 0.5; // Freeze

    if (state.enemyStatus[i] === 1) { // Burn
      if (now % 60 === 0) {
        state.enemyHP[i]--;
      }
    }

    if (state.enemyStatusTimer[i] > 0) {
      state.enemyStatusTimer[i]--;
      if (state.enemyStatusTimer[i] <= 0) state.enemyStatus[i] = 0;
    }

    // Movement
    const dx = playerPos.x - state.enemyX[i];
    const dz = playerPos.z - state.enemyZ[i];
    const dist = Math.sqrt(dx * dx + dz * dz);

    const vx = (dx / dist) * state.enemySpeed[i] * speedMultiplier;
    const vz = (dz / dist) * state.enemySpeed[i] * speedMultiplier;

    state.enemyX[i] += vx;
    state.enemyZ[i] += vz;

    // Player Collision
    if (dist < 3) {
      state.health -= 10;
      updateUI();
      removeEnemy(i);
      i--;
      if (state.health <= 0) {
        state.gameOver = true;
        alert("游戏结束! 分数: " + state.score);
        location.reload();
      }
      continue;
    }

    if (dist < nearestDist) {
      nearestDist = dist;
      targetIdx = i;
    }
  }

  // Update Grid
  updateGrid();

  // Cleanup Dead
  for (let i = state.activeEnemies - 1; i >= 0; i--) {
    if (state.enemyHP[i] <= 0) {
      removeEnemy(i);
    }
  }

  // Visuals
  enemyMesh.count = state.activeEnemies;
  for (let i = 0; i < state.activeEnemies; i++) {
    dummy.position.set(state.enemyX[i], 0.6, state.enemyZ[i]);
    dummy.rotation.z = Math.sin(now * 0.01 + i) * 0.1;
    if (state.enemyStatus[i] === 2) dummy.rotation.z = 0;
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    enemyMesh.setMatrixAt(i, dummy.matrix);

    const color = new THREE.Color(0xffffff);
    if (state.enemyStatus[i] === 1) color.setHex(0xff4400);
    else if (state.enemyStatus[i] === 2) color.setHex(0x00ffff);
    enemyMesh.setColorAt(i, color);
  }
  enemyMesh.instanceMatrix.needsUpdate = true;
  if (enemyMesh.instanceColor) enemyMesh.instanceColor.needsUpdate = true;

  return targetIdx;
}
