import { state } from './state.js';

const scoreEl = document.getElementById("score");
const healthEl = document.getElementById("health");
const levelEl = document.getElementById("level");
const xpBarEl = document.getElementById("xpBar");

export function updateUI() {
  scoreEl.innerText = state.score;
  healthEl.innerText = state.health;
  levelEl.innerText = state.level;
  const xpPercent = (state.xp / state.xpToNextLevel) * 100;
  xpBarEl.style.width = `${xpPercent}%`;
}
