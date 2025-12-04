
export enum EntityType {
  PLAYER = 'PLAYER',
  BLOCK = 'BLOCK', // Solid ground
  PLATFORM = 'PLATFORM', // Jump-through from bottom
  RING = 'RING',
  ENEMY = 'ENEMY', // Generic bad guy
  SPRING = 'SPRING', // Bounces player up
  DASH_PAD = 'DASH_PAD', // Boosts speed
  LOOP_TRIGGER = 'LOOP_TRIGGER', // Visual loop event
  GOAL = 'GOAL',
  SPIKE = 'SPIKE',
  BRIDGE = 'BRIDGE', // Breakable bridge
  CHECKPOINT = 'CHECKPOINT', // Save spot
  BOSS = 'BOSS', // Robotnik
  PROJECTILE = 'PROJECTILE' // Boss bullets
}

export enum AnimationState {
  IDLE = 'IDLE',
  WALK = 'WALK',
  RUN = 'RUN',
  JUMP = 'JUMP',
  FALL = 'FALL',
  SKID = 'SKID',
  ROLL = 'ROLL',
  HURT = 'HURT',
  VICTORY = 'VICTORY'
}

export enum BossState {
  HOVER = 'HOVER',
  DESCEND = 'DESCEND',
  VULNERABLE = 'VULNERABLE',
  ASCEND = 'ASCEND'
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector2;
  size: Vector2;
  velocity?: Vector2;
  active: boolean; // For collected rings or defeated enemies
  // specific props
  color?: string;
  texture?: 'sand' | 'rock' | 'wood' | 'grass';
  patrolRange?: number; // For enemies
  initialX?: number; // For patrol reference
  hp?: number; // For boss
  maxHp?: number; // For boss health bar
  triggered?: boolean; // For checkpoint
  lifespan?: number; // Frames until entity disappears (for scattered rings)
  pickupDelay?: number; // Frames before can be picked up
  
  // Boss AI props
  bossState?: BossState;
  bossTimer?: number;
}

export interface PlayerState {
  pos: Vector2;
  velocity: Vector2;
  isGrounded: boolean;
  isJumping: boolean;
  isRolling: boolean;
  isLooping: boolean; // In a scripted loop sequence
  loopCenter?: Vector2; // Center point of the loop for physics
  loopCooldown: number; // Prevent re-triggering loop immediately
  facingRight: boolean;
  rings: number;
  score: number;
  time: number;
  invincibleTimer: number;
  loopProgress: number; // 0 to 1 for loop animation
  animState: AnimationState;
  frameIndex: number;
  frameTimer: number;
  checkpointPos?: Vector2;
  jumpCount: number; // 0, 1, 2, 3
  jumpKeyDown: boolean; // To handle key debounce
}

export interface CameraState {
  x: number;
  y: number;
}
