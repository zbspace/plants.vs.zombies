import { state } from './state.js';
import { updateUI } from './ui.js';

export const SKILLS = [
  {
    id: "thermobaric",
    name: "温压弹",
    desc: "每3秒发射燃烧弹",
    color: "#ff4400",
    apply: () => {
      state.skills.thermobaric.level++;
      state.burnDamage += 1;
      state.skills.thermobaric.cd = 0;
    },
  },
  {
    id: "electromagnetic",
    name: "电磁穿刺",
    desc: "每5秒发射穿透激光",
    color: "#aa00ff",
    apply: () => {
      state.skills.electromagnetic.level++;
      state.pierceCount += 2;
      state.skills.electromagnetic.cd = 0;
    },
  },
  {
    id: "dry_ice",
    name: "干冰弹",
    desc: "每4秒发射冻结弹",
    color: "#00ffff",
    apply: () => {
      state.skills.dryIce.level++;
      state.freezeChance += 0.2;
      state.skills.dryIce.cd = 0;
    },
  },
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
    id: "double_tap",
    name: "双重打击",
    desc: "发射物 +1",
    color: "#00ccff",
    apply: () => {
      state.multiShot += 1;
    },
  },
];

export function triggerLevelUp() {
  state.isPaused = true;

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

export function gainXP(amount) {
  state.xp += amount;
  if (state.xp >= state.xpToNextLevel) {
    state.xp -= state.xpToNextLevel;
    state.level++;
    triggerLevelUp();
  }
  updateUI();
}
