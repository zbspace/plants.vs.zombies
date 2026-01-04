import { state } from './state.js';
import { GRID_CELL_SIZE } from './constants.js';

export const spatialGrid = new Map();

export function getGridKey(x, z) {
  const gx = Math.floor(x / GRID_CELL_SIZE);
  const gz = Math.floor(z / GRID_CELL_SIZE);
  return `${gx},${gz}`;
}

export function updateGrid() {
  spatialGrid.clear();
  for (let i = 0; i < state.activeEnemies; i++) {
    const key = getGridKey(state.enemyX[i], state.enemyZ[i]);
    if (!spatialGrid.has(key)) {
      spatialGrid.set(key, []);
    }
    spatialGrid.get(key).push(i);
  }
}
