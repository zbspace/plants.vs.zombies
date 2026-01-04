import { state } from './state.js';
import { scene } from './scene.js';
import { MAX_BULLETS } from './constants.js';
import { playerGroup } from './player.js';
import { spatialGrid, getGridKey } from './physics.js';
import { createExplosion } from './particles.js';
import { gainXP } from './skills.js';
import { removeEnemy } from './enemies.js';

const dummy = new THREE.Object3D();
const bulletGeo = new THREE.CapsuleGeometry(0.15, 0.6, 4, 8);
bulletGeo.rotateX(Math.PI / 2);

const bulletMat = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  transparent: true,
  opacity: 0.9,
});

export const bulletMesh = new THREE.InstancedMesh(bulletGeo, bulletMat, MAX_BULLETS);
bulletMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(bulletMesh);

export function spawnBullet(targetPos, angleOffset = 0, overrideType = 0) {
  if (state.activeBullets >= MAX_BULLETS) return;

  const idx = state.activeBullets;
  state.bulletX[idx] = playerGroup.position.x;
  state.bulletZ[idx] = playerGroup.position.z - 1.5;

  let type = overrideType;
  let pierce = 1;

  if (type === 2) {
      pierce = 5 + state.pierceCount; 
  }

  state.bulletType[idx] = type;
  state.bulletPierce[idx] = pierce;

  const start = new THREE.Vector3(playerGroup.position.x, 0, playerGroup.position.z);
  const end = new THREE.Vector3(targetPos.x, 0, targetPos.z);
  const dir = end.sub(start).normalize();

  if (angleOffset !== 0) {
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);
  }

  state.bulletVX[idx] = dir.x * state.bulletSpeed;
  state.bulletVZ[idx] = dir.z * state.bulletSpeed;

  state.activeBullets++;
}

export function removeBullet(index) {
  if (index >= state.activeBullets) return;

  state.activeBullets--;
  const last = state.activeBullets;

  if (index !== last) {
    state.bulletX[index] = state.bulletX[last];
    state.bulletZ[index] = state.bulletZ[last];
    state.bulletVX[index] = state.bulletVX[last];
    state.bulletVZ[index] = state.bulletVZ[last];
    state.bulletType[index] = state.bulletType[last];
    state.bulletPierce[index] = state.bulletPierce[last];
  }
}

export function updateBullets() {
  for (let i = 0; i < state.activeBullets; i++) {
    state.bulletX[i] += state.bulletVX[i];
    state.bulletZ[i] += state.bulletVZ[i];

    const bx = state.bulletX[i];
    const bz = state.bulletZ[i];
    const type = state.bulletType[i];

    if (bz < -80 || Math.abs(bx) > 40) {
      removeBullet(i);
      i--;
      continue;
    }

    const gridKey = getGridKey(bx, bz);
    const enemiesInCell = spatialGrid.get(gridKey);

    if (enemiesInCell) {
      let hit = false;
      for (let k of enemiesInCell) {
        if (state.enemyHP[k] <= 0) continue;

        const dx = state.enemyX[k] - bx;
        const dz = state.enemyZ[k] - bz;

        if (dx * dx + dz * dz < 2.25) {
          // Hit Logic
          let dmg = state.damage;

          if (type === 1) { // Thermobaric
            dmg += 2;
            for (let m = 0; m < state.activeEnemies; m++) {
              const ddx = state.enemyX[m] - bx;
              const ddz = state.enemyZ[m] - bz;
              if (ddx * ddx + ddz * ddz < 16) {
                state.enemyHP[m] -= 2;
                state.enemyStatus[m] = 1; 
                state.enemyStatusTimer[m] = 120; 
              }
            }
          } else if (type === 3) { // Dry Ice
            state.enemyStatus[k] = 2; 
            state.enemyStatusTimer[k] = 60; 
          }

          state.enemyHP[k] -= dmg;
          createExplosion(state.enemyX[k], state.enemyZ[k], type);

          if (state.enemyHP[k] <= 0) {
            state.score += 10;
            gainXP(20);
          }

          state.bulletPierce[i]--;
          if (state.bulletPierce[i] <= 0) {
            removeBullet(i);
            i--;
            hit = true;
            break;
          }

          hit = true;
          break; 
        }
      }
      if (hit && state.bulletPierce[i] <= 0) continue;
    }
  }

  // Visuals
  bulletMesh.count = state.activeBullets;
  for (let i = 0; i < state.activeBullets; i++) {
    dummy.position.set(state.bulletX[i], 1, state.bulletZ[i]);
    const angle = Math.atan2(state.bulletVX[i], state.bulletVZ[i]);
    dummy.rotation.set(0, angle, 0);

    const type = state.bulletType[i];
    const color = new THREE.Color();
    if (type === 1) color.setHex(0xff4400);
    else if (type === 2) color.setHex(0xaa00ff);
    else if (type === 3) color.setHex(0x00ffff);
    else color.setHex(0xffff00);

    bulletMesh.setColorAt(i, color);

    if (type === 2) {
      dummy.scale.set(1, 1, 10);
    } else {
      dummy.scale.set(1, 1, 1);
    }
    
    dummy.updateMatrix();
    bulletMesh.setMatrixAt(i, dummy.matrix);
  }
  bulletMesh.instanceMatrix.needsUpdate = true;
  if (bulletMesh.instanceColor) bulletMesh.instanceColor.needsUpdate = true;
}
