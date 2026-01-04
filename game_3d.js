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
scene.background = new THREE.Color(0x050510); // 深色赛博背景
scene.fog = new THREE.FogExp2(0x050510, 0.02); // 雾气

const camera = new THREE.PerspectiveCamera(
  60,
  canvas.width / canvas.height,
  0.1,
  100
);
camera.position.set(0, 20, 15); // 稍微抬高视角
camera.lookAt(0, 0, -5);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.shadowMap.enabled = true;

// 灯光
const ambientLight = new THREE.AmbientLight(0x404060, 1.0); // 偏蓝环境光
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xaaccff, 1.5); // 冷色主光
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// 点光源模拟发光
const pointLight = new THREE.PointLight(0x00d2ff, 1, 20);
pointLight.position.set(0, 2, 5);
scene.add(pointLight);

// --- 辅助贴图生成 ---
function createGlowTexture(colorStr) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.4, colorStr); // 核心颜色
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createStripeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, 64, 64);

  ctx.strokeStyle = "#00ccff"; // 蓝色条纹
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(64, 64);
  ctx.moveTo(32, 0);
  ctx.lineTo(64, 32);
  ctx.moveTo(0, 32);
  ctx.lineTo(32, 64);
  ctx.stroke();

  // 眼睛
  ctx.fillStyle = "#00ffff"; // 亮青色眼睛
  ctx.shadowColor = "#00ccff";
  ctx.shadowBlur = 20;
  ctx.fillRect(10, 20, 15, 8);
  ctx.fillRect(39, 20, 15, 8);

  // 增加边缘高光
  ctx.strokeStyle = "#444";

  return new THREE.CanvasTexture(canvas);
}

// --- 场景物体 ---

// 地面
const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshStandardMaterial({
  color: 0x0a0a1a,
  roughness: 0.8,
  metalness: 0.2,
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.z = -20;
plane.receiveShadow = true;
scene.add(plane);

// 霓虹网格
const gridHelper = new THREE.GridHelper(100, 50, 0x00d2ff, 0x111133);
gridHelper.position.z = -20;
scene.add(gridHelper);

// 玩家 (赛博炮塔)
const playerGroup = new THREE.Group();

// 底座
const baseGeo = new THREE.CylinderGeometry(1.5, 2, 0.5, 8);
const baseMat = new THREE.MeshStandardMaterial({
  color: 0x222222,
  roughness: 0.3,
  metalness: 0.8,
});
const base = new THREE.Mesh(baseGeo, baseMat);
base.position.y = 0.25;
playerGroup.add(base);

// 塔身
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

// 枪管
const barrelGeo = new THREE.CylinderGeometry(0.2, 0.2, 2.5);
const barrelMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
const barrelLeft = new THREE.Mesh(barrelGeo, barrelMat);
barrelLeft.rotation.x = Math.PI / 2;
barrelLeft.position.set(-0.4, 1.0, -1.5);
playerGroup.add(barrelLeft);

const barrelRight = new THREE.Mesh(barrelGeo, barrelMat);
barrelRight.rotation.x = Math.PI / 2;
barrelRight.position.set(0.4, 1.0, -1.5);
playerGroup.add(barrelRight);

playerGroup.position.set(0, 0, 5);
scene.add(playerGroup);

// --- 实例化渲染设置 ---
const dummy = new THREE.Object3D();

// 1. 敌人实例 (深色机甲 + 发光纹理)
const enemyGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const enemyTexture = createStripeTexture();
const enemyMat = new THREE.MeshStandardMaterial({
  map: enemyTexture,
  color: 0xffffff,
  roughness: 0.7,
  metalness: 0.1,
  emissive: 0x001133, // 深蓝色自发光
  emissiveIntensity: 0.5,
});
const enemyMesh = new THREE.InstancedMesh(enemyGeo, enemyMat, MAX_ENEMIES);
enemyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
enemyMesh.castShadow = true;
enemyMesh.receiveShadow = true;
scene.add(enemyMesh);

// 2. 子弹实例 (发光胶囊)
const bulletGeo = new THREE.CapsuleGeometry(0.15, 0.6, 4, 8);
const bulletMat = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  transparent: true,
  opacity: 0.9,
});
// 旋转胶囊使其平躺
bulletGeo.rotateX(Math.PI / 2);

const bulletMesh = new THREE.InstancedMesh(bulletGeo, bulletMat, MAX_BULLETS);
bulletMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(bulletMesh);

// 子弹辉光 Sprite (单独渲染以获得更好的发光效果)
// 为了性能，这里我们简化：直接让 MeshBasicMaterial 亮一点
// 或者使用 AdditiveBlending 的 Sprite 系统？
// 考虑到 500 个子弹，使用 Sprite 系统可能太重。
// 我们在碰撞时产生辉光粒子即可。

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
    pool.splice(idx, 1);
  }

  const modal = document.getElementById("upgradeModal");
  const container = document.getElementById("skillContainer");
  container.innerHTML = "";

  choices.forEach((skill) => {
    const btn = document.createElement("div");
    btn.style.cssText = `
            background: rgba(20, 20, 40, 0.9); 
            border: 2px solid ${skill.color}; 
            padding: 15px; 
            border-radius: 8px; 
            cursor: pointer; 
            display: flex; 
            flex-direction: column; 
            align-items: center;
            width: 100%;
            box-sizing: border-box;
            box-shadow: 0 0 10px ${skill.color};
        `;
    btn.innerHTML = `
            <strong style="color: ${skill.color}; font-size: 18px; text-shadow: 0 0 5px ${skill.color};">${skill.name}</strong>
            <span style="color: #ddd; margin-top: 5px;">${skill.desc}</span>
        `;

    btn.onclick = () => {
      skill.apply();
      modal.style.display = "none";
      state.isPaused = false;
      state.xpToNextLevel = Math.floor(state.xpToNextLevel * 1.2);
      updateUI();
    };

    btn.onmouseover = () => (btn.style.background = "rgba(40, 40, 60, 0.9)");
    btn.onmouseout = () => (btn.style.background = "rgba(20, 20, 40, 0.9)");

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
  state.enemyX[idx] = (Math.random() - 0.5) * 30; // 扩大生成范围
  state.enemyZ[idx] = -60;
  // 随等级增加生命值
  state.enemyHP[idx] = 3 + Math.floor(state.level * 0.5);
  state.enemySpeed[idx] = 0.02 + Math.random() * 0.02;

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
  state.bulletX[idx] = playerGroup.position.x;
  state.bulletZ[idx] = playerGroup.position.z - 1.5;

  const start = new THREE.Vector3(
    playerGroup.position.x,
    0,
    playerGroup.position.z
  );
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

// 辉光粒子材质
const glowTexture = createGlowTexture("rgba(0, 200, 255, 1)"); // 青色辉光
const particleMat = new THREE.SpriteMaterial({
  map: glowTexture,
  color: 0xffffff,
  transparent: true,
  blending: THREE.AdditiveBlending,
});

function createExplosion(x, z) {
  for (let i = 0; i < 5; i++) {
    // 增加粒子数量
    const sprite = new THREE.Sprite(particleMat);
    sprite.position.set(x, 1, z);
    sprite.scale.set(2, 2, 2); // 初始大小

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      Math.random() * 0.3,
      (Math.random() - 0.5) * 0.3
    );

    scene.add(sprite);
    state.particles.push({ mesh: sprite, vel, life: 30 });
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
  const playerX = playerGroup.position.x;
  const playerZ = playerGroup.position.z;

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
    if (dist < 3) {
      // 增加碰撞半径以适应新模型
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
    dummy.position.set(state.enemyX[i], 0.6, state.enemyZ[i]);
    // 简单的摇晃动画
    dummy.rotation.z = Math.sin(now * 0.01 + i) * 0.1;
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    enemyMesh.setMatrixAt(i, dummy.matrix);
  }
  enemyMesh.instanceMatrix.needsUpdate = true;

  // 4. 玩家旋转和射击
  if (targetIdx !== -1) {
    // 计算目标角度
    const targetPos = new THREE.Vector3(
      state.enemyX[targetIdx],
      0,
      state.enemyZ[targetIdx]
    );
    playerGroup.lookAt(targetPos);

    if (now - state.lastShotTime > state.shotInterval) {
      // 处理多重射击
      if (state.multiShot === 1) {
        spawnBullet(targetPos, 0);
      } else {
        const spread = 0.2;
        const startAngle = -((state.multiShot - 1) * spread) / 2;

        for (let k = 0; k < state.multiShot; k++) {
          spawnBullet(targetPos, startAngle + k * spread);
        }
      }

      state.lastShotTime = now;
    }
  } else {
    playerGroup.rotation.set(0, 0, 0);
  }

  // 5. 更新子弹逻辑
  for (let i = 0; i < state.activeBullets; i++) {
    state.bulletX[i] += state.bulletVX[i];
    state.bulletZ[i] += state.bulletVZ[i];

    const bx = state.bulletX[i];
    const bz = state.bulletZ[i];

    // 边界检查
    if (bz < -80 || Math.abs(bx) > 40) {
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
          }

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
    // 计算子弹朝向
    const angle = Math.atan2(state.bulletVX[i], state.bulletVZ[i]);
    dummy.rotation.set(0, angle, 0);
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
    p.mesh.scale.multiplyScalar(0.9); // 快速缩小
    p.mesh.material.opacity = p.life / 20; // 渐隐
    if (p.life <= 0) {
      scene.remove(p.mesh);
      state.particles.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

animate();
