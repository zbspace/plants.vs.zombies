import { initScene, scene, camera, renderer } from './scene.js';
import { initPlayer, playerGroup } from './player.js';
import { state } from './state.js';
import { updateUI } from './ui.js';
import { spawnEnemy, updateEnemies } from './enemies.js';
import { spawnBullet, updateBullets } from './bullets.js';
import { updateParticles } from './particles.js';
import { ENEMY_SPAWN_RATE } from './constants.js';

initScene();
initPlayer();

function animate() {
  requestAnimationFrame(animate);

  if (state.gameOver || state.isPaused) {
    renderer.render(scene, camera);
    return;
  }

  const now = Date.now();

  // Spawning
  if (Math.random() < ENEMY_SPAWN_RATE) {
    spawnEnemy();
  }

  // Updates
  const targetIdx = updateEnemies(playerGroup.position, now);
  updateBullets();
  updateParticles();

  // Player Logic (Shooting)
  if (targetIdx !== -1) {
    const targetPos = new THREE.Vector3(
      state.enemyX[targetIdx],
      0,
      state.enemyZ[targetIdx]
    );
    playerGroup.lookAt(targetPos);

    // Auto Fire
    if (now - state.lastShotTime > state.shotInterval) {
      if (state.multiShot === 1) {
        spawnBullet(targetPos, 0, 0);
      } else {
        const spread = 0.2;
        const startAngle = -((state.multiShot - 1) * spread) / 2;
        for (let k = 0; k < state.multiShot; k++) {
          spawnBullet(targetPos, startAngle + k * spread, 0);
        }
      }
      state.lastShotTime = now;
    }

    // Skills
    if (state.skills.thermobaric.level > 0) {
      if (now - state.skills.thermobaric.cd > state.skills.thermobaric.maxCd) {
         spawnBullet(targetPos, 0, 1);
         state.skills.thermobaric.cd = now;
      }
    }
    if (state.skills.electromagnetic.level > 0) {
      if (now - state.skills.electromagnetic.cd > state.skills.electromagnetic.maxCd) {
         spawnBullet(targetPos, 0, 2);
         state.skills.electromagnetic.cd = now;
      }
    }
    if (state.skills.dryIce.level > 0) {
      if (now - state.skills.dryIce.cd > state.skills.dryIce.maxCd) {
         spawnBullet(targetPos, 0, 3);
         state.skills.dryIce.cd = now;
      }
    }

  } else {
    playerGroup.rotation.set(0, 0, 0);
  }

  renderer.render(scene, camera);
}

animate();
