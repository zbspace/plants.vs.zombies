const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player = { x: 180, y: 450, w: 40, h: 40, speed: 5 };
let bullets = [];
let enemies = [];
let score = 0;

// 监听键盘按键
let keys = {};
document.addEventListener("keydown", (e) => (keys[e.code] = true));
document.addEventListener("keyup", (e) => (keys[e.code] = false));

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 清屏

  // 1. 移动玩家
  if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed;
  if (keys["ArrowRight"] && player.x < canvas.width - player.w)
    player.x += player.speed;
  if (keys["Space"]) {
    if (bullets.length < 5)
      bullets.push({ x: player.x + 18, y: player.y, s: 7 });
  }

  // 2. 绘制玩家 (蓝色方块代替战机)
  ctx.fillStyle = "#00d2ff";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // 3. 处理子弹
  bullets.forEach((b, index) => {
    b.y -= b.s;
    ctx.fillStyle = "#fff700";
    ctx.fillRect(b.x, b.y, 4, 10);
    if (b.y < 0) bullets.splice(index, 1);
  });

  // 4. 生成和处理敌人
  if (Math.random() < 0.03)
    enemies.push({ x: Math.random() * 360, y: -40, s: 2 });
  enemies.forEach((en, eIdx) => {
    en.y += en.s;
    ctx.fillStyle = "#ff4d4d"; // 红色方块代替敌机
    ctx.fillRect(en.x, en.y, 40, 40);

    // 碰撞检测：子弹打中敌人
    bullets.forEach((b, bIdx) => {
      if (b.x < en.x + 40 && b.x + 4 > en.x && b.y < en.y + 40) {
        enemies.splice(eIdx, 1);
        bullets.splice(bIdx, 1);
        score += 10;
      }
    });

    if (en.y > canvas.height) enemies.splice(eIdx, 1);
  });

  // 5. 绘制分数
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 10, 30);

  requestAnimationFrame(gameLoop);
}

gameLoop();
