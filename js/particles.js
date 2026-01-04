import { state } from './state.js';
import { scene } from './scene.js';
import { createGlowTexture } from './utils.js';

const glowTexture = createGlowTexture("rgba(0, 200, 255, 1)");
const fireTexture = createGlowTexture("rgba(255, 100, 0, 1)");
const iceTexture = createGlowTexture("rgba(200, 255, 255, 1)");

const particleMat = new THREE.SpriteMaterial({
  map: glowTexture,
  color: 0xffffff,
  transparent: true,
  blending: THREE.AdditiveBlending,
});

export function createExplosion(x, z, type = 0) {
  let color = 0xffffff;
  let map = glowTexture;

  if (type === 1) { // Thermobaric
    color = 0xff4400;
    map = fireTexture;
  } else if (type === 3) { // Dry Ice
    color = 0x00ffff;
    map = iceTexture;
  }

  particleMat.map = map;
  particleMat.color.setHex(color);

  for (let i = 0; i < 5; i++) {
    const sprite = new THREE.Sprite(particleMat.clone());
    sprite.position.set(x, 1, z);
    sprite.scale.set(type === 1 ? 4 : 2, type === 1 ? 4 : 2, 1);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      Math.random() * 0.3,
      (Math.random() - 0.5) * 0.3
    );

    scene.add(sprite);
    state.particles.push({ mesh: sprite, vel, life: 30 });
  }
}

export function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.mesh.position.add(p.vel);
    p.life--;
    p.mesh.scale.multiplyScalar(0.9);
    p.mesh.material.opacity = p.life / 20;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      state.particles.splice(i, 1);
    }
  }
}
