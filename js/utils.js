export function createGlowTexture(colorStr) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.4, colorStr);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  return new THREE.CanvasTexture(canvas);
}

export function createStripeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, 64, 64);

  ctx.strokeStyle = "#00ccff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(64, 64);
  ctx.moveTo(32, 0);
  ctx.lineTo(64, 32);
  ctx.moveTo(0, 32);
  ctx.lineTo(32, 64);
  ctx.stroke();

  // Eyes
  ctx.fillStyle = "#00ffff";
  ctx.shadowColor = "#00ccff";
  ctx.shadowBlur = 20;
  ctx.fillRect(10, 20, 15, 8);
  ctx.fillRect(39, 20, 15, 8);

  // Edge Highlight
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 60, 60);

  return new THREE.CanvasTexture(canvas);
}
