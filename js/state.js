import { MAX_ENEMIES, MAX_BULLETS } from './constants.js';

export const state = {
  score: 0,
  health: 100,
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  isPaused: false,
  gameOver: false,

  // Attributes
  damage: 1,
  shotInterval: 500,
  multiShot: 1,
  bulletSpeed: 0.5,
  
  // Active Skills
  skills: {
    thermobaric: { level: 0, cd: 0, maxCd: 3000 },
    electromagnetic: { level: 0, cd: 0, maxCd: 5000 },
    dryIce: { level: 0, cd: 0, maxCd: 4000 }
  },

  burnDamage: 0,
  pierceCount: 0,
  freezeChance: 0,

  lastShotTime: 0,

  // Object Pools
  activeEnemies: 0,
  activeBullets: 0,

  // SoA
  enemyX: new Float32Array(MAX_ENEMIES),
  enemyZ: new Float32Array(MAX_ENEMIES),
  enemyHP: new Int8Array(MAX_ENEMIES),
  enemySpeed: new Float32Array(MAX_ENEMIES),
  enemyStatus: new Int8Array(MAX_ENEMIES),
  enemyStatusTimer: new Int16Array(MAX_ENEMIES),

  bulletX: new Float32Array(MAX_BULLETS),
  bulletZ: new Float32Array(MAX_BULLETS),
  bulletVX: new Float32Array(MAX_BULLETS),
  bulletVZ: new Float32Array(MAX_BULLETS),
  bulletType: new Int8Array(MAX_BULLETS),
  bulletPierce: new Int8Array(MAX_BULLETS),

  particles: [],
};
