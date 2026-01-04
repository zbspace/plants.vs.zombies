const canvas = document.getElementById("gameCanvas");

// --- 配置 ---
const MAX_ENEMIES = 1000;
const MAX_BULLETS = 500;
const GRID_CELL_SIZE = 4; // 世界单位
const ENEMY_SPAWN_RATE = 0.05;

// --- 游戏状态 ---
const state = {
  score: 0,
  health: 100,
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  isPaused: false,
  gameOver: false,

  // 属性
  damage: 1,
  shotInterval: 500, // 毫秒
  multiShot: 1, // 每次射击的子弹数
  bulletSpeed: 0.5,

  lastShotTime: 0,

  // 对象池数据
  activeEnemies: 0,
  activeBullets: 0,

  // 用于扁平内存访问的数组 (SoA - 结构数组)
  enemyX: new Float32Array(MAX_ENEMIES),
  enemyZ: new Float32Array(MAX_ENEMIES),
  enemyHP: new Int8Array(MAX_ENEMIES),
  enemySpeed: new Float32Array(MAX_ENEMIES),

  bulletX: new Float32Array(MAX_BULLETS),
  bulletZ: new Float32Array(MAX_BULLETS),
  bulletVX: new Float32Array(MAX_BULLETS), // X轴速度
  bulletVZ: new Float32Array(MAX_BULLETS), // Z轴速度

  particles: [],
};

// --- Three.js 设置 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 20, 60);

const camera = new THREE.PerspectiveCamera(
  60,
  canvas.width / canvas.height,
  0.1,
  100
);
camera.position.set(0, 15, 10);
camera.lookAt(0, 0, -10);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.shadowMap.enabled = true;

// 灯光
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// 地面
const planeGeometry = new THREE.PlaneGeometry(20, 100);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x333344 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.z = -20;
plane.receiveShadow = true;
scene.add(plane);

const gridHelper = new THREE.GridHelper(20, 20, 0x555566, 0x333344);
gridHelper.position.z = -20;
scene.add(gridHelper);

// 玩家
const playerGeo = new THREE.BoxGeometry(2, 2, 2);
const playerMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.set(0, 1, 5);
player.castShadow = true;
scene.add(player);

// --- 实例化渲染设置 ---
const dummy = new THREE.Object3D();

// 1. 敌人实例
const enemyGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xff4d4d });
const enemyMesh = new THREE.InstancedMesh(enemyGeo, enemyMat, MAX_ENEMIES);
enemyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
enemyMesh.castShadow = true;
enemyMesh.receiveShadow = true;
scene.add(enemyMesh);

// 2. 子弹实例
const bulletGeo = new THREE.SphereGeometry(0.3, 8, 8);
const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const bulletMesh = new THREE.InstancedMesh(bulletGeo, bulletMat, MAX_BULLETS);
bulletMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(bulletMesh);

// --- 空间网格系统 ---
const spatialGrid = new Map();

function getGridKey(x, z) {
  const gx = Math.floor(x / GRID_CELL_SIZE);
  const gz = Math.floor(z / GRID_CELL_SIZE);
  return `${gx},${gz}`;
}

function updateGrid() {
  spatialGrid.clear();
  for (let i = 0; i < state.activeEnemies; i++) {
    const key = getGridKey(state.enemyX[i], state.enemyZ[i]);
    if (!spatialGrid.has(key)) {
      spatialGrid.set(key, []);
    }
    spatialGrid.get(key).push(i);
  }
}

// --- 技能系统 ---
const SKILLS = [
  {
    id: "rapid_fire",
    name: "极速射击",
    desc: "攻击速度 +20%",
    color: "#ffcc00",
    apply: () => {
      state.shotInterval *= 0.8;
    },
  },
  {
    id: "high_explosive",
    name: "高爆弹药",
    desc: "伤害 +1",
    color: "#ff4444",
    apply: () => {
      state.damage += 1;
    },
  },
  {
    id: "double_tap",
    name: "双重打击",
    desc: "发射物 +1",
    color: "#00ccff",
    apply: () => {
      state.multiShot += 1;
    },
  },
  {
    id: "sniper",
    name: "狙击手",
    desc: "子弹速度 +30%",
    color: "#00ff44",
    apply: () => {
      state.bulletSpeed *= 1.3;
    },
  },
];

function triggerLevelUp() {
  state.isPaused = true;

  // 随机选择3个技能
  const choices = [];
  const pool = [...SKILLS];
  for (let i = 0; i < 3; i++) {
    if (pool.length === 0) break;
    const idx = Math.floor(Math.random() * pool.length);
    choices.push(pool[idx]);
    // pool.splice(idx, 1); // 允许重复？目前是的，让我们保留在池中或移除？
    // 通常 Roguelike 允许叠加。所以我们不从池中移除。
    // 但是我们不应该在一次选择中显示相同的技能两次？
    // 让我们从临时池中移除以避免一次选择中出现重复。
    pool.splice(idx, 1);
  }

  const modal = document.getElementById("upgradeModal");
  const container = document.getElementById("skillContainer");
  container.innerHTML = "";

  choices.forEach((skill) => {
    const btn = document.createElement("div");
    btn.style.cssText = `
            background: #333; 
            border: 2px solid ${skill.color}; 
            padding: 15px; 
            border-radius: 8px; 
            cursor: pointer; 
            display: flex; 
            flex-direction: column; 
            align-items: center;
            width: 100%;
            box-sizing: border-box;
        `;
    btn.innerHTML = `
            <strong style="color: ${skill.color}; font-size: 18px;">${skill.name}</strong>
            <span style="color: #ddd; margin-top: 5px;">${skill.desc}</span>
        `;

    btn.onclick = () => {
      skill.apply();
      modal.style.display = "none";
      state.isPaused = false;
      // 增加经验值需求
      state.xpToNextLevel = Math.floor(state.xpToNextLevel * 1.2);
      updateUI();
    };

    btn.onmouseover = () => (btn.style.background = "#444");
    btn.onmouseout = () => (btn.style.background = "#333");

    container.appendChild(btn);
  });

  modal.style.display = "flex";
}

function gainXP(amount) {
  state.xp += amount;
  if (state.xp >= state.xpToNextLevel) {
    state.xp -= state.xpToNextLevel;
    state.level++;
    triggerLevelUp();
  }
  updateUI();
}

// --- 辅助函数 ---
function spawnEnemy() {
  if (state.activeEnemies >= MAX_ENEMIES) return;

  const idx = state.activeEnemies;
  state.enemyX[idx] = (Math.random() - 0.5) * 16;
  state.enemyZ[idx] = -40;
  // 随等级增加生命值
  state.enemyHP[idx] = 3 + Math.floor(state.level * 0.5);
  state.enemySpeed[idx] = 0.05 + Math.random() * 0.05;

  state.activeEnemies++;
}

function removeEnemy(index) {
  if (index >= state.activeEnemies) return;

  state.activeEnemies--;
  const last = state.activeEnemies;

  if (index !== last) {
    state.enemyX[index] = state.enemyX[last];
    state.enemyZ[index] = state.enemyZ[last];
    state.enemyHP[index] = state.enemyHP[last];
    state.enemySpeed[index] = state.enemySpeed[last];
  }
}

function spawnBullet(targetPos, angleOffset = 0) {
  if (state.activeBullets >= MAX_BULLETS) return;

  const idx = state.activeBullets;
  state.bulletX[idx] = player.position.x;
  state.bulletZ[idx] = player.position.z - 1;

  const start = new THREE.Vector3(player.position.x, 0, player.position.z);
  const end = new THREE.Vector3(targetPos.x, 0, targetPos.z);

  // 方向向量
  const dir = end.sub(start).normalize();

  // 应用角度偏移（用于多重射击）
  if (angleOffset !== 0) {
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);
  }

  state.bulletVX[idx] = dir.x * state.bulletSpeed;
  state.bulletVZ[idx] = dir.z * state.bulletSpeed;

  state.activeBullets++;
}

function removeBullet(index) {
  if (index >= state.activeBullets) return;

  state.activeBullets--;
  const last = state.activeBullets;

  if (index !== last) {
    state.bulletX[index] = state.bulletX[last];
    state.bulletZ[index] = state.bulletZ[last];
    state.bulletVX[index] = state.bulletVX[last];
    state.bulletVZ[index] = state.bulletVZ[last];
  }
}

function createExplosion(x, z) {
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.75, z);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      Math.random() * 0.2,
      (Math.random() - 0.5) * 0.2
    );

    scene.add(mesh);
    state.particles.push({ mesh, vel, life: 20 });
  }
}

// --- UI 更新 ---
const scoreEl = document.getElementById("score");
const healthEl = document.getElementById("health");
const levelEl = document.getElementById("level");
const xpBarEl = document.getElementById("xpBar");

function updateUI() {
  scoreEl.innerText = state.score;
  healthEl.innerText = state.health;
  levelEl.innerText = state.level;
  const xpPercent = (state.xp / state.xpToNextLevel) * 100;
  xpBarEl.style.width = `${xpPercent}%`;
}

// --- 游戏循环 ---
function animate() {
  requestAnimationFrame(animate);

  // 暂停逻辑
  if (state.gameOver || state.isPaused) {
    // 仍然渲染场景，这样就不会变黑，但不更新逻辑
    renderer.render(scene, camera);
    return;
  }

  const now = Date.now();

  // 1. 生成敌人
  if (Math.random() < ENEMY_SPAWN_RATE) {
    spawnEnemy();
  }

  // 2. 更新敌人逻辑
  let nearestDist = Infinity;
  let targetIdx = -1;
  const playerX = player.position.x;
  const playerZ = player.position.z;

  for (let i = 0; i < state.activeEnemies; i++) {
    // 移动敌人
    const dx = playerX - state.enemyX[i];
    const dz = playerZ - state.enemyZ[i];
    const dist = Math.sqrt(dx * dx + dz * dz);

    // 标准化方向
    const vx = (dx / dist) * state.enemySpeed[i];
    const vz = (dz / dist) * state.enemySpeed[i];

    state.enemyX[i] += vx;
    state.enemyZ[i] += vz;

    // 与玩家碰撞
    if (dist < 2) {
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

    // 寻找最近的敌人用于炮塔瞄准
    if (dist < nearestDist) {
      nearestDist = dist;
      targetIdx = i;
    }
  }

  // 移动后重建空间网格
  updateGrid();

  // 3. 更新敌人视觉效果（实例）
  enemyMesh.count = state.activeEnemies;
  for (let i = 0; i < state.activeEnemies; i++) {
    dummy.position.set(state.enemyX[i], 0.75, state.enemyZ[i]);
    // 简单的上下浮动动画
    dummy.position.y = 0.75 + Math.sin(now * 0.01 + state.enemyZ[i]) * 0.2;
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    enemyMesh.setMatrixAt(i, dummy.matrix);
  }
  enemyMesh.instanceMatrix.needsUpdate = true;

  // 4. 玩家旋转和射击
  if (targetIdx !== -1) {
    player.lookAt(
      state.enemyX[targetIdx],
      player.position.y,
      state.enemyZ[targetIdx]
    );

    if (now - state.lastShotTime > state.shotInterval) {
      const targetPos = {
        x: state.enemyX[targetIdx],
        z: state.enemyZ[targetIdx],
      };

      // 处理多重射击
      if (state.multiShot === 1) {
        spawnBullet(targetPos, 0);
      } else {
        // 散射逻辑：例如 2 发 = -5 度, +5 度
        // 3 发 = -10, 0, +10
        const spread = 0.2; // 弧度（大约 10 度）
        const startAngle = -((state.multiShot - 1) * spread) / 2;

        for (let k = 0; k < state.multiShot; k++) {
          spawnBullet(targetPos, startAngle + k * spread);
        }
      }

      state.lastShotTime = now;
    }
  } else {
    player.rotation.set(0, 0, 0);
  }

  // 5. 更新子弹逻辑
  for (let i = 0; i < state.activeBullets; i++) {
    state.bulletX[i] += state.bulletVX[i];
    state.bulletZ[i] += state.bulletVZ[i];

    const bx = state.bulletX[i];
    const bz = state.bulletZ[i];

    // 边界检查
    if (bz < -60 || Math.abs(bx) > 20) {
      removeBullet(i);
      i--;
      continue;
    }

    // 使用网格进行碰撞检查
    const gridKey = getGridKey(bx, bz);
    const enemiesInCell = spatialGrid.get(gridKey);

    if (enemiesInCell) {
      let hit = false;
      for (let k of enemiesInCell) {
        if (state.enemyHP[k] <= 0) continue;

        const dx = state.enemyX[k] - bx;
        const dz = state.enemyZ[k] - bz;
        if (dx * dx + dz * dz < 2.25) {
          state.enemyHP[k] -= state.damage; // 应用升级后的伤害
          createExplosion(state.enemyX[k], state.enemyZ[k]);

          if (state.enemyHP[k] <= 0) {
            state.score += 10;
            gainXP(20); // 获得经验值
          } else {
            // 闪烁红色？使用 InstancedMesh 没有属性很难实现
          }

          // 移除子弹（穿透逻辑可以在这里添加）
          removeBullet(i);
          i--;
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }
  }

  // 6. 清理死亡敌人
  for (let i = state.activeEnemies - 1; i >= 0; i--) {
    if (state.enemyHP[i] <= 0) {
      removeEnemy(i);
    }
  }

  // 7. 更新子弹视觉效果（实例）
  bulletMesh.count = state.activeBullets;
  for (let i = 0; i < state.activeBullets; i++) {
    dummy.position.set(state.bulletX[i], 1, state.bulletZ[i]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    bulletMesh.setMatrixAt(i, dummy.matrix);
  }
  bulletMesh.instanceMatrix.needsUpdate = true;

  // 8. 粒子效果
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.mesh.position.add(p.vel);
    p.life--;
    p.mesh.scale.multiplyScalar(0.9);
    if (p.life <= 0) {
      scene.remove(p.mesh);
      state.particles.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

animate();
