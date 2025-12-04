
export const GRAVITY = 0.6; // Slightly heavier for snappier jumps
export const MAX_SPEED = 14; // Faster
export const MAX_FALL_SPEED = 18;
export const ACCELERATION = 0.8; // Instant start
export const FRICTION = 0.8; // Instant stop (no sliding)
export const JUMP_FORCE = -13;
export const SPRING_FORCE = -22; // Stronger bounce
export const DASH_PAD_SPEED = 22;
export const ENEMY_SPEED = 2;

export const TILE_SIZE = 40;
export const VIEWPORT_WIDTH = 800;
export const VIEWPORT_HEIGHT = 450;

// Level Layout Constants
export const SECTION_1_END = 6000; 
export const DARK_SECTION_END = 10000; // End of cave/night section
export const LEVEL_END = 18000;

export const BOSS_MAX_HP = 100;
export const BOSS_DAMAGE_PER_HIT = 20;
export const BOSS_HOVER_HEIGHT = 4 * TILE_SIZE;
export const BOSS_GROUND_HEIGHT = 12 * TILE_SIZE; // Updated to 12 to match LevelGenerator floor
export const BOSS_VULNERABLE_TIME = 300; // 5 seconds at 60fps
export const BOSS_ATTACK_TIME = 400; // Time spent hovering/shooting

export const COLORS = {
  sky: '#3b82f6', // blue-500
  caveBg: '#1e1b4b', // indigo-950
  sand: '#fcd34d', // amber-300
  grass: '#22c55e', // green-500
  rock: '#57534e', // stone-600
  wood: '#991b1b', // red-800 (Reddish wood)
  water: '#2563eb', // blue-600
  waterSurface: '#60a5fa', // blue-400
  checkpoint: '#3b82f6',
  checkpointActive: '#ef4444',
  boss: '#dc2626',
  projectile: '#ef4444',
  spike: '#cbd5e1', // slate-300 (metallic)
};

// Sprite Configuration
export const SPRITE_CONFIG = {
  sheetWidth: 288,  // 6 frames * 48px
  sheetHeight: 240, // 5 rows * 48px
  frameWidth: 48,
  frameHeight: 48,
  scale: 1.5,
};

// Animation Grid Layout (Row, Column)
export const ANIMATIONS: Record<string, { frames: number[][], speed: number }> = {
  IDLE: { frames: [[0, 0], [1, 0], [2, 0]], speed: 12 },
  WALK: { frames: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1]], speed: 5 },
  RUN:  { frames: [[0, 2], [1, 2], [2, 2], [3, 2]], speed: 3 },
  JUMP: { frames: [[0, 3], [1, 3], [2, 3], [3, 3]], speed: 2 }, // Spinball
  ROLL: { frames: [[0, 3], [1, 3], [2, 3], [3, 3]], speed: 2 },
  FALL: { frames: [[2, 1]], speed: 10 }, 
  SKID: { frames: [[0, 4]], speed: 10 },
  HURT: { frames: [[1, 4]], speed: 10 },
  VICTORY: { frames: [[0, 0], [1, 0]], speed: 15 },
};
