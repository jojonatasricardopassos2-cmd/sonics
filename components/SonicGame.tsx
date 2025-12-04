
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { 
  Entity, EntityType, PlayerState, Vector2, CameraState, AnimationState, BossState 
} from '../types';
import { 
  GRAVITY, MAX_SPEED, MAX_FALL_SPEED, ACCELERATION, FRICTION, JUMP_FORCE, 
  SPRING_FORCE, DASH_PAD_SPEED, ENEMY_SPEED, TILE_SIZE, 
  VIEWPORT_WIDTH, VIEWPORT_HEIGHT, COLORS, SECTION_1_END, DARK_SECTION_END,
  ANIMATIONS, SPRITE_CONFIG, BOSS_DAMAGE_PER_HIT, BOSS_HOVER_HEIGHT, BOSS_GROUND_HEIGHT, BOSS_VULNERABLE_TIME, BOSS_MAX_HP
} from '../constants';
import { generateLevel } from './LevelGenerator';

// --- Utilities ---

// Standard AABB Collision
const checkAABB = (r1: {pos: Vector2, size: Vector2}, r2: {pos: Vector2, size: Vector2}) => {
  if (!r1 || !r2) return false;
  return (
    r1.pos.x < r2.pos.x + r2.size.x &&
    r1.pos.x + r1.size.x > r2.pos.x &&
    r1.pos.y < r2.pos.y + r2.size.y &&
    r1.pos.y + r1.size.y > r2.pos.y
  );
};

// Generates a placeholder sprite sheet so the game has visuals immediately
const generateSpriteSheet = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_CONFIG.sheetWidth;
  canvas.height = SPRITE_CONFIG.sheetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const w = SPRITE_CONFIG.frameWidth;
  const h = SPRITE_CONFIG.frameHeight;

  // ROW 0: IDLE (Blue Hedgehog Standing)
  for (let i = 0; i < 3; i++) {
    const x = i * w;
    const y = 0 * h;
    // Head
    ctx.fillStyle = '#2563eb'; // Blue
    ctx.beginPath(); ctx.arc(x + 24, y + 20, 10, 0, Math.PI * 2); ctx.fill();
    // Spikes
    ctx.beginPath(); ctx.moveTo(x + 15, y + 20); ctx.lineTo(x + 5, y + 25); ctx.lineTo(x + 15, y + 30); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 15, y + 15); ctx.lineTo(x + 5, y + 10); ctx.lineTo(x + 20, y + 10); ctx.fill();
    // Body
    ctx.fillRect(x + 18, y + 28, 12, 12);
    // Belly
    ctx.fillStyle = '#fcd34d'; 
    ctx.beginPath(); ctx.arc(x + 24, y + 34, 4, 0, Math.PI * 2); ctx.fill();
    // Shoes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 16, y + 40, 6, 4);
    ctx.fillRect(x + 26, y + 40, 6, 4);
    if (i === 1) ctx.clearRect(x + 26, y + 40, 6, 4); // Lift foot
  }

  // ROW 1: WALK (Legs moving)
  for (let i = 0; i < 6; i++) {
    const x = i * w;
    const y = 1 * h;
    ctx.fillStyle = '#2563eb';
    ctx.beginPath(); ctx.arc(x + 24, y + 20, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x + 18, y + 28, 12, 12);
    ctx.fillStyle = '#fcd34d'; 
    ctx.beginPath(); ctx.arc(x + 24, y + 34, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ef4444';
    const offset = Math.sin(i);
    ctx.fillRect(x + 16 + offset*4, y + 40, 6, 4);
    ctx.fillRect(x + 26 - offset*4, y + 40, 6, 4);
  }

  // ROW 2: RUN
  for (let i = 0; i < 4; i++) {
    const x = i * w;
    const y = 2 * h;
    ctx.fillStyle = '#2563eb';
    ctx.beginPath(); ctx.ellipse(x + 24, y + 28, 14, 10, Math.PI / 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 30, y + 18, 9, 0, Math.PI*2); ctx.fill(); 
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(x + 24, y + 40, 8, 0, Math.PI*2); ctx.fill();
  }

  // ROW 3: JUMP / ROLL
  for (let i = 0; i < 4; i++) {
    const x = i * w;
    const y = 3 * h;
    ctx.fillStyle = '#2563eb';
    ctx.beginPath(); ctx.arc(x + 24, y + 24, 14, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fcd34d'; 
    ctx.lineWidth = 2;
    ctx.beginPath(); 
    ctx.arc(x + 24, y + 24, 10, i * (Math.PI/2), i * (Math.PI/2) + Math.PI); 
    ctx.stroke();
  }

  // ROW 4: HURT / SKID
  let x = 0 * w; let y = 4 * h;
  ctx.fillStyle = '#2563eb';
  ctx.beginPath(); ctx.arc(x + 24, y + 20, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x + 18, y + 28, 12, 12);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x + 14, y + 40, 8, 4); 
  ctx.fillStyle = '#ccc';
  ctx.beginPath(); ctx.arc(x + 10, y + 42, 3, 0, Math.PI*2); ctx.fill();
  x = 1 * w;
  ctx.fillStyle = '#2563eb';
  ctx.beginPath(); ctx.arc(x + 24, y + 24, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x + 18, y + 28, 12, 12);
  ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x+18, y+30); ctx.lineTo(x+10, y+20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+30, y+30); ctx.lineTo(x+38, y+20); ctx.stroke();

  return canvas.toDataURL();
};

const drawSpriteFrame = (
  ctx: CanvasRenderingContext2D, 
  img: HTMLImageElement, 
  animState: AnimationState, 
  frameIndex: number, 
  x: number, 
  y: number, 
  facingRight: boolean
) => {
  const anim = ANIMATIONS[animState] || ANIMATIONS.IDLE;
  const frameCoords = anim.frames[frameIndex % anim.frames.length];
  
  const sx = frameCoords[0] * SPRITE_CONFIG.frameWidth;
  const sy = frameCoords[1] * SPRITE_CONFIG.frameHeight;
  
  const destW = SPRITE_CONFIG.frameWidth * SPRITE_CONFIG.scale; 
  const destH = SPRITE_CONFIG.frameHeight * SPRITE_CONFIG.scale; 

  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  
  if (!facingRight) {
    ctx.scale(-1, 1);
  }

  const yOffset = -14; 
  try {
    ctx.drawImage(
      img,
      sx, sy, SPRITE_CONFIG.frameWidth, SPRITE_CONFIG.frameHeight,
      -destW / 2, -destH / 2 + yOffset, destW, destH
    );
  } catch (e) { }
  ctx.restore();
};

type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'VICTORY';

const MENU_OPTIONS = [
    'NORMAL GAME',
    'ACT SELECT',
    'TIME ATTACK',
    'OPTIONS',
    'EXTRAS',
    'MODS'
];

const SonicGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const spriteSheetRef = useRef<HTMLImageElement | null>(null);
  const lastCheckpointRef = useRef<Vector2 | null>(null);
  
  // Game States
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [uiState, setUiState] = useState<PlayerState | null>(null);
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [bossHp, setBossHp] = useState(0);
  
  // Menu State
  const [menuSelection, setMenuSelection] = useState(0);
  // Options State
  const [isMobile, setIsMobile] = useState(false);

  const player = useRef<PlayerState>({
    pos: { x: 100, y: 100 },
    velocity: { x: 0, y: 0 },
    isGrounded: false,
    isJumping: false,
    isRolling: false,
    isLooping: false,
    loopCooldown: 0,
    facingRight: true,
    rings: 0,
    score: 0,
    time: 0,
    invincibleTimer: 0,
    loopProgress: 0,
    animState: AnimationState.IDLE,
    frameIndex: 0,
    frameTimer: 0,
    jumpCount: 0,
    jumpKeyDown: false
  });

  const levelEntities = useRef<Entity[]>([]);
  const nearbyEntitiesRef = useRef<Entity[]>([]);
  const camera = useRef<CameraState>({ x: 0, y: 0 });
  const keys = useRef<{ [key: string]: boolean }>({});
  const startTime = useRef<number>(0);
  const framesSinceLastUiUpdate = useRef<number>(0);
  const frameCount = useRef<number>(0);

  useEffect(() => {
    const img = new Image();
    img.src = generateSpriteSheet();
    img.onload = () => setSpritesLoaded(true);
    spriteSheetRef.current = img;
  }, []);

  const initGame = useCallback((respawnAtCheckpoint = false) => {
    const startPos = (respawnAtCheckpoint && lastCheckpointRef.current) 
      ? { ...lastCheckpointRef.current } 
      : { x: 100, y: 200 };

    if (!respawnAtCheckpoint) {
        lastCheckpointRef.current = null;
    }

    player.current = {
      pos: startPos,
      velocity: { x: 0, y: 0 },
      isGrounded: false,
      isJumping: false,
      isRolling: false,
      isLooping: false,
      loopCooldown: 0,
      facingRight: true,
      rings: 0,
      score: respawnAtCheckpoint ? player.current.score : 0, 
      time: respawnAtCheckpoint ? player.current.time : 0,
      invincibleTimer: 0,
      loopProgress: 0,
      animState: AnimationState.IDLE,
      frameIndex: 0,
      frameTimer: 0,
      jumpCount: 0,
      jumpKeyDown: false
    };
    camera.current = { x: startPos.x - 200, y: startPos.y - 100 };
    
    // Always regenerate level to be safe
    levelEntities.current = generateLevel();
    startTime.current = Date.now();
    nearbyEntitiesRef.current = [];
    
    setBossHp(0);
    setUiState(player.current);
    
    // Reset keys on init
    keys.current = {};
  }, []);

  // Initial load
  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleDeath = () => {
    if (lastCheckpointRef.current) {
        initGame(true);
    } else {
        setGameState('GAMEOVER');
    }
  };

  const confirmMenuSelection = (index: number) => {
    // Select Option
    if (index === 0 || index === 1 || index === 2 || index === 5) {
        // Start Game for Normal, Act Select, Time Attack, Mods (placeholder)
        initGame();
        setGameState('PLAYING');
    } else if (index === 3) {
        // Toggle Mobile/PC Controls
        setIsMobile(prev => !prev);
    } else if (index === 4) {
        // Extras
        console.log("Extras not implemented yet");
    }
  };

  const scatterRings = (amount: number, pos: Vector2) => {
    const maxRings = Math.min(amount, 20); 
    for (let i = 0; i < maxRings; i++) {
        const angle = (Math.PI * 2 / maxRings) * i;
        const speed = 4 + Math.random() * 4;
        const ring: Entity = {
            id: `scatter_${Date.now()}_${i}`,
            type: EntityType.RING,
            pos: { x: pos.x, y: pos.y },
            size: { x: TILE_SIZE / 2, y: TILE_SIZE / 2 },
            velocity: {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed - 2 
            },
            active: true,
            lifespan: 300, 
            pickupDelay: 40 
        };
        levelEntities.current.push(ring);
        nearbyEntitiesRef.current.push(ring);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
        keys.current[e.code] = true; 
        
        // Menu Navigation
        if (gameState === 'MENU') {
            if (e.code === 'ArrowUp') {
                setMenuSelection(prev => (prev > 0 ? prev - 1 : MENU_OPTIONS.length - 1));
            } else if (e.code === 'ArrowDown') {
                setMenuSelection(prev => (prev < MENU_OPTIONS.length - 1 ? prev + 1 : 0));
            } else if (e.code === 'Enter' || e.code === 'Space') {
                confirmMenuSelection(menuSelection);
            }
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, menuSelection, initGame, isMobile]); 

  // Unified Input Handlers (Touch + Mouse)
  const handleInputStart = (keyCodes: string[]) => {
      keyCodes.forEach(code => keys.current[code] = true);
  };
  const handleInputEnd = (keyCodes: string[]) => {
      keyCodes.forEach(code => keys.current[code] = false);
  };

  const updatePhysics = () => {
    const p = player.current;
    if (!p.pos || !p.velocity) return;
    
    if (gameState === 'PLAYING') {
        p.time = Math.floor((Date.now() - startTime.current) / 1000);
    }
    if (p.invincibleTimer > 0) p.invincibleTimer--;
    if (p.loopCooldown > 0) p.loopCooldown--;

    frameCount.current++;
    if (frameCount.current % 5 === 0) {
        const searchRadius = 1500; 
        const viewLeft = p.pos.x - searchRadius;
        const viewRight = p.pos.x + searchRadius;
        
        nearbyEntitiesRef.current = levelEntities.current.filter(ent => 
            ent.active &&
            (ent.pos.x + ent.size.x > viewLeft && ent.pos.x < viewRight)
        );
    }
    
    const nearby = nearbyEntitiesRef.current;

    for(let i = 0; i < nearby.length; i++) {
        const ent = nearby[i];
        
        // --- RING PHYSICS ---
        if (ent.type === EntityType.RING && ent.velocity) {
            ent.velocity.y += 0.3; 
            ent.pos.x += ent.velocity.x;
            ent.pos.y += ent.velocity.y;
            for (let j = 0; j < nearby.length; j++) {
                const block = nearby[j];
                if (block.type === EntityType.BLOCK && checkAABB(ent, block)) {
                     if (ent.velocity.y > 0) {
                        ent.velocity.y *= -0.7; 
                        ent.pos.y = block.pos.y - ent.size.y;
                     }
                }
            }
            if (ent.lifespan && ent.lifespan > 0) {
                ent.lifespan--;
                if (ent.lifespan <= 0) ent.active = false;
            }
            if (ent.pickupDelay && ent.pickupDelay > 0) ent.pickupDelay--;
        }

        // --- PROJECTILE PHYSICS ---
        if (ent.type === EntityType.PROJECTILE && ent.velocity) {
             ent.pos.x += ent.velocity.x;
             ent.pos.y += ent.velocity.y;
             if (ent.lifespan && ent.lifespan > 0) {
                 ent.lifespan--;
                 if (ent.lifespan <= 0) ent.active = false;
             }
        }
    }

    // --- LOOP PHYSICS (CIRCULAR) ---
    if (p.isLooping && p.loopCenter) {
        p.loopProgress += 0.025; // Slower progress for bigger loop
        
        // Circular Path: Enters at Bottom (Angle PI/2) -> Right -> Top -> Left -> Exit
        // Angle goes from PI/2 to -3PI/2 (Counter-Clockwise)
        const radius = (TILE_SIZE * 4) / 2;
        const angle = (Math.PI / 2) - (p.loopProgress * 2 * Math.PI);
        
        p.pos.x = p.loopCenter.x + radius * Math.cos(angle) - TILE_SIZE/2; // Center sprite
        p.pos.y = p.loopCenter.y + radius * Math.sin(angle) - TILE_SIZE/2;
        
        if (p.loopProgress >= 1) {
            p.isLooping = false;
            p.velocity.x = p.facingRight ? MAX_SPEED : -MAX_SPEED;
            p.velocity.y = 0;
            p.loopProgress = 0;
            p.pos.y = p.loopCenter.y + radius - TILE_SIZE; // Ensure ground snap
            p.loopCooldown = 60; // Add 1 second cooldown to prevent immediate re-entry
        }
        return; 
    }

    const iterations = 2; 
    const deltaGravity = GRAVITY / iterations;
    
    for (let step = 0; step < iterations; step++) {
        p.velocity.y += deltaGravity;
        if (p.velocity.y > MAX_FALL_SPEED) p.velocity.y = MAX_FALL_SPEED;

        if (step === 0) {
            if (keys.current['ArrowRight'] || keys.current['KeyD']) {
                if (p.velocity.x < MAX_SPEED) p.velocity.x += ACCELERATION;
                p.facingRight = true;
            } else if (keys.current['ArrowLeft'] || keys.current['KeyA']) {
                if (p.velocity.x > -MAX_SPEED) p.velocity.x -= ACCELERATION;
                p.facingRight = false;
            } else {
                if (Math.abs(p.velocity.x) > FRICTION) {
                    p.velocity.x -= Math.sign(p.velocity.x) * FRICTION;
                } else {
                    p.velocity.x = 0;
                }
            }
            
            // JUMP LOGIC (TRIPLE JUMP)
            const jumpPressed = keys.current['Space'] || keys.current['ArrowUp'] || keys.current['KeyW'];
            
            if (jumpPressed) {
                if (!p.jumpKeyDown) {
                    // Initial press
                    if (p.isGrounded || p.jumpCount < 3) {
                        p.velocity.y = JUMP_FORCE;
                        p.isGrounded = false;
                        p.isJumping = true;
                        p.jumpCount++;
                        // If doing a mid-air jump, reset animation or switch to jump anim
                        p.animState = AnimationState.JUMP; 
                        p.jumpKeyDown = true;
                    }
                }
                p.jumpKeyDown = true;
            } else {
                p.jumpKeyDown = false;
            }
        }

        p.pos.x += p.velocity.x / iterations;
        let playerBox = { pos: p.pos, size: { x: TILE_SIZE, y: TILE_SIZE } };

        for (let i = 0; i < nearby.length; i++) {
            const ent = nearby[i];
            if (ent.type === EntityType.BLOCK || ent.type === EntityType.BRIDGE) {
                if (checkAABB(playerBox, ent)) {
                    if (p.velocity.x > 0) {
                        p.pos.x = ent.pos.x - TILE_SIZE;
                    } else if (p.velocity.x < 0) {
                        p.pos.x = ent.pos.x + ent.size.x;
                    }
                    p.velocity.x = 0;
                }
            }
        }

        p.pos.y += p.velocity.y / iterations;
        playerBox.pos = p.pos;
        p.isGrounded = false; 

        for (let i = 0; i < nearby.length; i++) {
            const ent = nearby[i];
            if (ent.type === EntityType.BLOCK || ent.type === EntityType.BRIDGE) {
                if (checkAABB(playerBox, ent)) {
                    if (p.velocity.y > 0) {
                        p.pos.y = ent.pos.y - TILE_SIZE;
                        p.isGrounded = true;
                        p.isJumping = false;
                        p.velocity.y = 0;
                        p.jumpCount = 0; // Reset Triple Jump
                    } else if (p.velocity.y < 0) {
                        p.pos.y = ent.pos.y + ent.size.y;
                        p.velocity.y = 0;
                    }
                }
            }
            else if (ent.type === EntityType.PLATFORM) {
                if (checkAABB(playerBox, ent)) {
                    if (p.velocity.y > 0) {
                         const playerBottom = p.pos.y + TILE_SIZE;
                         if (playerBottom <= ent.pos.y + 16) {
                             p.pos.y = ent.pos.y - TILE_SIZE;
                             p.isGrounded = true;
                             p.isJumping = false;
                             p.velocity.y = 0;
                             p.jumpCount = 0; // Reset Triple Jump
                         }
                    }
                }
            }
        }
    }

    if (!p.isGrounded && p.velocity.y >= 0) {
        const footBox = { 
            pos: { x: p.pos.x + 8, y: p.pos.y + TILE_SIZE }, 
            size: { x: TILE_SIZE - 16, y: 10 } 
        };
        for (let i = 0; i < nearby.length; i++) {
            const ent = nearby[i];
            if (ent.type === EntityType.BLOCK || ent.type === EntityType.BRIDGE || ent.type === EntityType.PLATFORM) {
                if (checkAABB(footBox, ent)) {
                    const threshold = (ent.type === EntityType.PLATFORM) ? 12 : 12;
                    if (p.pos.y + TILE_SIZE <= ent.pos.y + threshold) {
                        p.pos.y = ent.pos.y - TILE_SIZE;
                        p.isGrounded = true;
                        p.isJumping = false;
                        p.velocity.y = 0;
                        p.jumpCount = 0; // Reset Triple Jump
                    }
                }
            }
        }
    }

    const pickupBox = {pos: p.pos, size: {x: TILE_SIZE, y: TILE_SIZE}};
    
    for (let i = 0; i < nearby.length; i++) {
      const ent = nearby[i];
      
      if (checkAABB(pickupBox, ent)) {
        if (ent.type === EntityType.RING) {
          if (ent.active && (!ent.pickupDelay || ent.pickupDelay <= 0)) {
            ent.active = false;
            p.rings++;
            p.score += 100;
          }
        }
        else if (ent.type === EntityType.ENEMY || ent.type === EntityType.SPIKE || ent.type === EntityType.PROJECTILE) {
          const isHazard = ent.type === EntityType.SPIKE || ent.type === EntityType.PROJECTILE;
          
          if (!isHazard && (p.isJumping || p.animState === AnimationState.ROLL || Math.abs(p.velocity.x) > 10 || p.invincibleTimer > 0)) {
            ent.active = false;
            p.score += 500;
            p.velocity.y = JUMP_FORCE / 1.5;
            p.jumpCount = 1; // Can double jump after hit bounce
          } else {
             if (p.invincibleTimer === 0) {
                 if (p.rings > 0) {
                     scatterRings(p.rings, p.pos); 
                     p.rings = 0;
                     p.invincibleTimer = 120;
                     p.velocity.x = -p.velocity.x * 1.5;
                     p.velocity.y = -6;
                     p.animState = AnimationState.HURT;
                     if(ent.type === EntityType.PROJECTILE) ent.active = false;
                 } else {
                     handleDeath();
                 }
             }
          }
        }
        else if (ent.type === EntityType.BOSS) {
            // BOSS INTERACTION
            if (ent.bossState === BossState.VULNERABLE) {
                if (p.isJumping || p.animState === AnimationState.ROLL || p.invincibleTimer > 0) {
                    if (p.invincibleTimer === 0) {
                        ent.hp = (ent.hp || 100) - BOSS_DAMAGE_PER_HIT;
                        p.velocity.y = JUMP_FORCE; 
                        p.velocity.x = -p.velocity.x; 
                        p.score += 1000;
                        p.invincibleTimer = 30;
                        p.jumpCount = 1;

                        if (ent.hp <= 0) {
                            ent.active = false;
                            p.score += 10000;
                            // Spawn Goal at fixed floor height (BOSS_GROUND_HEIGHT)
                            // This prevents goal spawning in air or inside ground
                            const goalY = BOSS_GROUND_HEIGHT - (TILE_SIZE * 2); 
                            levelEntities.current.push({
                                id: 'final_goal',
                                type: EntityType.GOAL,
                                pos: { x: ent.pos.x, y: goalY },
                                size: { x: TILE_SIZE, y: TILE_SIZE * 2 },
                                active: true
                            });
                        }
                    }
                } else {
                    // Contact damage while vulnerable
                     if (p.invincibleTimer === 0) {
                         if (p.rings > 0) {
                             scatterRings(p.rings, p.pos);
                             p.rings = 0;
                             p.invincibleTimer = 120;
                             p.velocity.x = -10;
                             p.velocity.y = -6;
                             p.animState = AnimationState.HURT;
                         } else {
                             handleDeath();
                         }
                     }
                }
            } else {
                // Not Vulnerable - Contact Damage
                if (p.invincibleTimer === 0) {
                    if (p.rings > 0) {
                        scatterRings(p.rings, p.pos);
                        p.rings = 0;
                        p.invincibleTimer = 120;
                        p.velocity.x = -10;
                        p.velocity.y = -6;
                        p.animState = AnimationState.HURT;
                    } else {
                        handleDeath();
                    }
                }
            }
        }
        else if (ent.type === EntityType.CHECKPOINT) {
            if (!ent.triggered) {
                ent.triggered = true;
                lastCheckpointRef.current = { x: ent.pos.x, y: ent.pos.y };
                p.score += 500;
            }
        }
        else if (ent.type === EntityType.SPRING) {
             p.velocity.y = SPRING_FORCE;
             p.isGrounded = false;
             p.pos.y -= 5;
             p.animState = AnimationState.JUMP;
             p.jumpCount = 1; 
        }
        else if (ent.type === EntityType.DASH_PAD) {
            p.velocity.x = p.facingRight ? DASH_PAD_SPEED : -DASH_PAD_SPEED;
        }
        else if (ent.type === EntityType.LOOP_TRIGGER && !p.isLooping && p.loopCooldown <= 0 && Math.abs(p.velocity.x) > 8) {
             p.isLooping = true;
             p.loopProgress = 0;
             // Capture center for circular physics
             p.loopCenter = { x: ent.pos.x + ent.size.x/2, y: ent.pos.y + ent.size.y/2 };
        }
        else if (ent.type === EntityType.GOAL) {
            setGameState('VICTORY');
            p.animState = AnimationState.VICTORY;
        }
      }
      
      // --- BOSS AI LOGIC ---
      if (ent.type === EntityType.BOSS && ent.active) {
          // Update global boss HP UI state
          if(ent.hp !== undefined) setBossHp(ent.hp);

          ent.bossTimer = (ent.bossTimer || 0) - 1;
          
          if (!ent.bossState) ent.bossState = BossState.HOVER;

          switch (ent.bossState) {
              case BossState.HOVER: // ATTACK PHASE
                  // Move horizontally towards player (clamped)
                  const dx = p.pos.x - ent.pos.x;
                  if (Math.abs(dx) > 10) ent.pos.x += Math.sign(dx) * 2;
                  
                  // Bob up and down
                  ent.pos.y = (ent.pos.y * 0.95) + ((4 * TILE_SIZE + Math.sin(Date.now()/300)*50) * 0.05);

                  // SHOOT
                  if (frameCount.current % 120 === 0) { // Every 2 seconds
                       const angle = Math.atan2(p.pos.y - ent.pos.y, p.pos.x - ent.pos.x);
                       const speed = 6;
                       levelEntities.current.push({
                           id: `proj_${Date.now()}`,
                           type: EntityType.PROJECTILE,
                           pos: { x: ent.pos.x + ent.size.x/2, y: ent.pos.y + ent.size.y/2 },
                           size: { x: 20, y: 20 },
                           velocity: { x: Math.cos(angle)*speed, y: Math.sin(angle)*speed },
                           active: true,
                           lifespan: 300
                       });
                       // Add to cache immediately
                       nearbyEntitiesRef.current.push(levelEntities.current[levelEntities.current.length-1]);
                  }

                  // Transition
                  if (ent.bossTimer <= 0) {
                      ent.bossState = BossState.DESCEND;
                  }
                  break;

              case BossState.DESCEND:
                  const groundY = 11 * TILE_SIZE; // Target ground
                  ent.pos.y += 3;
                  if (ent.pos.y >= groundY) {
                      ent.pos.y = groundY;
                      ent.bossState = BossState.VULNERABLE;
                      ent.bossTimer = BOSS_VULNERABLE_TIME; 
                  }
                  break;

              case BossState.VULNERABLE: // SIT STILL
                  // Do nothing, take damage
                  if (ent.bossTimer <= 0) {
                      ent.bossState = BossState.ASCEND;
                  }
                  break;

              case BossState.ASCEND:
                  ent.pos.y -= 4;
                  if (ent.pos.y <= 4 * TILE_SIZE) {
                      ent.bossState = BossState.HOVER;
                      ent.bossTimer = 400; // Attack for ~6-7 seconds
                  }
                  break;
          }
      }
    }

    if (p.pos.y > VIEWPORT_HEIGHT + 1000) { 
        handleDeath();
    }

    if (p.isLooping) {
        p.animState = AnimationState.ROLL;
    } else if (p.invincibleTimer > 90) {
        p.animState = AnimationState.HURT;
    } else if (!p.isGrounded) {
        p.animState = AnimationState.JUMP;
    } else if (Math.abs(p.velocity.x) > 10) {
        p.animState = AnimationState.RUN;
    } else if (Math.abs(p.velocity.x) > 0.5) {
        p.animState = AnimationState.WALK;
    } else {
        p.animState = AnimationState.IDLE;
    }

    const anim = ANIMATIONS[p.animState] || ANIMATIONS.IDLE;
    p.frameTimer++;
    if (p.frameTimer >= anim.speed) {
        p.frameTimer = 0;
        p.frameIndex++;
    }

    const targetCamX = p.pos.x - VIEWPORT_WIDTH / 2 + TILE_SIZE / 2;
    const targetCamY = Math.min(1200, p.pos.y - VIEWPORT_HEIGHT / 2); 
    camera.current.x += (targetCamX - camera.current.x) * 0.15;
    camera.current.y += (targetCamY - camera.current.y) * 0.15;
  };

  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d', { alpha: false }); 
    if (!ctx) return;

    const cam = camera.current;
    const p = player.current;

    // Background - DARK only in specific middle section
    let bgTop = COLORS.sky;
    let bgBottom = COLORS.waterSurface;
    
    // Only cave middle section is darker
    if (p.pos.x > SECTION_1_END && p.pos.x < DARK_SECTION_END) { 
         bgTop = COLORS.caveBg;
         bgBottom = '#111';
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, VIEWPORT_HEIGHT);
    gradient.addColorStop(0, bgTop);
    gradient.addColorStop(1, bgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for(let i=0; i<8; i++) {
        const cloudX = ((i * 400) - (cam.x * 0.2)) % (VIEWPORT_WIDTH + 600); 
        const drawX = cloudX < -200 ? cloudX + VIEWPORT_WIDTH + 600 : cloudX;
        if (drawX > -100 && drawX < VIEWPORT_WIDTH + 100) {
             ctx.beginPath();
             ctx.arc(drawX, 80 + (i%2)*60, 50, 0, Math.PI*2);
             ctx.arc(drawX + 40, 90 + (i%2)*60, 60, 0, Math.PI*2);
             ctx.fill();
        }
    }
    
    // Water - Draw mostly everywhere except cave
    if (p.pos.x < SECTION_1_END || p.pos.x > DARK_SECTION_END) {
        ctx.fillStyle = COLORS.water;
        const baseWaterY = 1000; 
        const waterHeight = Math.max(0, baseWaterY - cam.y);
        if (waterHeight > 0) ctx.fillRect(0, baseWaterY - cam.y, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    }

    ctx.save();
    ctx.translate(-Math.floor(cam.x), -Math.floor(cam.y));

    const nearby = nearbyEntitiesRef.current;
    const viewLeft = cam.x;
    const viewRight = cam.x + VIEWPORT_WIDTH;
    const viewTop = cam.y;
    const viewBottom = cam.y + VIEWPORT_HEIGHT;
    
    for (let i = 0; i < nearby.length; i++) {
        const ent = nearby[i];
        const margin = 100;
        if (
            ent.pos.x > viewRight + margin || 
            ent.pos.x + ent.size.x < viewLeft - margin ||
            ent.pos.y > viewBottom + margin ||
            ent.pos.y + ent.size.y < viewTop - margin
        ) {
            continue;
        }

        if (ent.type === EntityType.BLOCK || ent.type === EntityType.BRIDGE) {
            ctx.fillStyle = ent.texture === 'sand' ? COLORS.sand : ent.texture === 'rock' ? COLORS.rock : COLORS.wood;
            ctx.fillRect(ent.pos.x, ent.pos.y, ent.size.x, ent.size.y);
            
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            if (ent.texture === 'wood') {
                const step = 40;
                for(let j=0; j<ent.size.x; j+=step) ctx.fillRect(ent.pos.x + j, ent.pos.y, 2, ent.size.y);
            } else if (ent.texture === 'sand') {
                ctx.fillStyle = COLORS.grass;
                ctx.fillRect(ent.pos.x, ent.pos.y, ent.size.x, 6); 
            }
        }
        else if (ent.type === EntityType.PLATFORM) {
             ctx.fillStyle = ent.texture === 'wood' ? COLORS.wood : COLORS.sand;
             ctx.fillRect(ent.pos.x, ent.pos.y, ent.size.x, Math.min(ent.size.y, 10));
             
             // Highlight for wood platforms to make them look solid/distinct
             if (ent.texture === 'wood') {
                 ctx.fillStyle = 'rgba(255,255,255,0.2)';
                 ctx.fillRect(ent.pos.x, ent.pos.y, ent.size.x, 3);
             }

             if (ent.size.y > 10) {
                 ctx.fillStyle = 'rgba(0,0,0,0.2)';
                 ctx.fillRect(ent.pos.x, ent.pos.y + 10, ent.size.x, ent.size.y - 10);
             }
        }
        else if (ent.type === EntityType.RING) {
            ctx.strokeStyle = '#fcd34d';
            ctx.lineWidth = 3;
            if (ent.lifespan && ent.lifespan < 60 && Math.floor(Date.now() / 100) % 2 === 0) {
            } else {
                ctx.beginPath();
                ctx.arc(ent.pos.x + 20, ent.pos.y + 20, 10, 0, Math.PI*2);
                ctx.stroke();
            }
        }
        else if (ent.type === EntityType.LOOP_TRIGGER) {
             // CHECKERED LOOP DRAWING
             const cx = ent.pos.x + ent.size.x / 2;
             const cy = ent.pos.y + ent.size.y / 2;
             const outerRadius = ent.size.x / 2;
             const innerRadius = outerRadius - 20;

             ctx.fillStyle = '#92400e'; // Dark orange/brown
             ctx.beginPath(); 
             ctx.arc(cx, cy, outerRadius, 0, Math.PI*2);
             ctx.arc(cx, cy, innerRadius, 0, Math.PI*2, true);
             ctx.fill();

             // Checkers
             ctx.fillStyle = '#f59e0b'; // Light orange
             const segments = 12;
             for(let k=0; k<segments; k++) {
                 if (k%2===0) {
                     ctx.beginPath();
                     ctx.arc(cx, cy, outerRadius, (k/segments)*Math.PI*2, ((k+1)/segments)*Math.PI*2);
                     ctx.arc(cx, cy, innerRadius, ((k+1)/segments)*Math.PI*2, (k/segments)*Math.PI*2, true);
                     ctx.fill();
                 }
             }
        }
        else if (ent.type === EntityType.ENEMY) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(ent.pos.x + ent.size.x/2, ent.pos.y + ent.size.y/2, 15, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.fillRect(ent.pos.x + (ent.velocity?.x! < 0 ? 5 : 25), ent.pos.y + 10, 8, 4); 
        }
        else if (ent.type === EntityType.SPIKE) {
            ctx.fillStyle = COLORS.spike;
            const w = ent.size.x;
            const h = ent.size.y;
            const x = ent.pos.x;
            const y = ent.pos.y;
            const spikeWidth = 20;
            const spikesCount = Math.floor(w / spikeWidth);
            ctx.beginPath();
            for(let j=0; j<spikesCount; j++) {
                const sx = x + (j * spikeWidth);
                ctx.moveTo(sx, y + h);
                ctx.lineTo(sx + spikeWidth/2, y);
                ctx.lineTo(sx + spikeWidth, y + h);
            }
            ctx.fill();
        }
        else if (ent.type === EntityType.SPRING) {
             ctx.fillStyle = '#ef4444';
             ctx.fillRect(ent.pos.x, ent.pos.y + 15, ent.size.x, 10);
             ctx.fillStyle = '#fcd34d';
             ctx.fillRect(ent.pos.x, ent.pos.y + 5, ent.size.x, 5); 
        }
        else if (ent.type === EntityType.DASH_PAD) {
             ctx.fillStyle = `rgba(239, 68, 68, 0.8)`; 
             ctx.beginPath();
             ctx.moveTo(ent.pos.x, ent.pos.y + ent.size.y);
             ctx.lineTo(ent.pos.x + ent.size.x, ent.pos.y + ent.size.y);
             ctx.lineTo(ent.pos.x + ent.size.x/2, ent.pos.y);
             ctx.fill();
        }
        else if (ent.type === EntityType.CHECKPOINT) {
             const color = ent.triggered ? COLORS.checkpointActive : COLORS.checkpoint;
             ctx.fillStyle = '#555';
             ctx.fillRect(ent.pos.x + ent.size.x/2 - 2, ent.pos.y + 10, 4, ent.size.y - 10);
             ctx.fillStyle = color;
             ctx.beginPath(); ctx.arc(ent.pos.x + ent.size.x/2, ent.pos.y + 10, 10, 0, Math.PI*2); ctx.fill();
        }
        else if (ent.type === EntityType.BOSS) {
             const bx = ent.pos.x;
             const by = ent.pos.y;
             
             // Visual state
             if (ent.bossState === BossState.VULNERABLE) {
                 ctx.fillStyle = '#555'; // Darker/Vulnerable looking
             } else {
                 ctx.fillStyle = '#444'; 
             }
             
             // Body
             ctx.beginPath(); ctx.arc(bx + 40, by + 40, 40, 0, Math.PI*2); ctx.fill();
             
             // Cockpit
             ctx.fillStyle = (ent.bossState === BossState.VULNERABLE) ? '#22c55e' : '#9f1239'; 
             ctx.fillRect(bx + 25, by + 35, 30, 10);

             // Thruster
             if (ent.bossState === BossState.HOVER || ent.bossState === BossState.ASCEND) {
                 ctx.fillStyle = '#fbbf24';
                 ctx.beginPath(); ctx.moveTo(bx + 30, by + 80); ctx.lineTo(bx + 40, by + 100); ctx.lineTo(bx + 50, by + 80); ctx.fill();
             }
        }
        else if (ent.type === EntityType.PROJECTILE) {
            ctx.fillStyle = COLORS.projectile;
            ctx.beginPath(); ctx.arc(ent.pos.x, ent.pos.y, 10, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(ent.pos.x, ent.pos.y, 5, 0, Math.PI*2); ctx.fill();
        }
        else if (ent.type === EntityType.GOAL) {
             ctx.fillStyle = '#333';
             ctx.fillRect(ent.pos.x + 18, ent.pos.y, 4, ent.size.y);
             ctx.fillStyle = '#3b82f6';
             ctx.beginPath(); ctx.arc(ent.pos.x + 20, ent.pos.y + 20, 20, 0, Math.PI*2); ctx.fill();
        }
    }

    if (gameState !== 'MENU') {
        if (p.invincibleTimer % 4 < 2) { 
            if (spritesLoaded && spriteSheetRef.current) {
                const px = p.pos.x + TILE_SIZE / 2;
                const py = p.pos.y + TILE_SIZE / 2;
                drawSpriteFrame(
                    ctx, 
                    spriteSheetRef.current, 
                    p.animState, 
                    p.frameIndex, 
                    px, py, 
                    p.facingRight
                );
            } else {
                 ctx.fillStyle = '#2563eb'; 
                 ctx.fillRect(p.pos.x, p.pos.y, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    ctx.restore();
  };

  const gameLoop = () => {
    if (gameState === 'PLAYING') {
      updatePhysics();
    } 
    
    // Always draw (renders background level in menu)
    draw();
      
    if (gameState === 'PLAYING') {
        framesSinceLastUiUpdate.current++;
        if (framesSinceLastUiUpdate.current > 10) {
            setUiState({ ...player.current });
            framesSinceLastUiUpdate.current = 0;
        }
    }
      
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [gameState]);

  return (
    <div className="relative w-full h-full bg-black flex justify-center items-center overflow-hidden">
      
      {/* HUD - Only Show when playing or game over */}
      {gameState !== 'MENU' && (
          <div className="absolute top-4 left-4 flex flex-col gap-1 font-mono font-bold select-none z-10">
            <div className="text-yellow-400 text-2xl drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">SCORE {uiState?.score.toString().padStart(6, '0')}</div>
            <div className="text-yellow-300 text-xl drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">TIME {Math.floor((uiState?.time || 0) / 60)}:{(uiState?.time || 0) % 60 < 10 ? '0' : ''}{(uiState?.time || 0) % 60}</div>
            <div className="text-yellow-200 text-xl drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">RINGS {uiState?.rings}</div>
          </div>
      )}

      {/* BOSS HUD */}
      {gameState !== 'MENU' && bossHp > 0 && (
          <div className="absolute top-4 right-4 flex flex-col items-end gap-1 font-mono font-bold select-none z-10">
              <div className="text-red-500 text-xl drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">ROBOTNIK</div>
              <div className="w-48 h-4 bg-gray-800 border-2 border-white rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-600 transition-all duration-300"
                    style={{ width: `${(bossHp / BOSS_MAX_HP) * 100}%` }}
                  />
              </div>
          </div>
      )}

      {/* MOBILE CONTROLS OVERLAY */}
      {isMobile && gameState === 'PLAYING' && (
          <div className="absolute inset-0 z-50 pointer-events-none select-none">
              {/* D-Pad Left */}
              <div className="absolute bottom-8 left-8 flex gap-4 pointer-events-auto">
                   <div 
                    className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm active:bg-white/40 border-2 border-white/50 cursor-pointer"
                    onMouseDown={(e) => { e.preventDefault(); handleInputStart(['ArrowLeft']); }}
                    onMouseUp={(e) => { e.preventDefault(); handleInputEnd(['ArrowLeft']); }}
                    onMouseLeave={(e) => { e.preventDefault(); handleInputEnd(['ArrowLeft']); }}
                    onTouchStart={(e) => { e.preventDefault(); handleInputStart(['ArrowLeft']); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleInputEnd(['ArrowLeft']); }}
                   >
                       <ArrowLeft className="text-white w-10 h-10" />
                   </div>
                   <div 
                    className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm active:bg-white/40 border-2 border-white/50 cursor-pointer"
                    onMouseDown={(e) => { e.preventDefault(); handleInputStart(['ArrowRight']); }}
                    onMouseUp={(e) => { e.preventDefault(); handleInputEnd(['ArrowRight']); }}
                    onMouseLeave={(e) => { e.preventDefault(); handleInputEnd(['ArrowRight']); }}
                    onTouchStart={(e) => { e.preventDefault(); handleInputStart(['ArrowRight']); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleInputEnd(['ArrowRight']); }}
                   >
                       <ArrowRight className="text-white w-10 h-10" />
                   </div>
              </div>

              {/* Action Button (Jump) */}
              <div className="absolute bottom-8 right-8 pointer-events-auto">
                   <div 
                    className="w-24 h-24 bg-red-500/40 rounded-full flex items-center justify-center backdrop-blur-sm active:bg-red-500/60 border-4 border-white/50 cursor-pointer"
                    onMouseDown={(e) => { e.preventDefault(); handleInputStart(['Space']); }}
                    onMouseUp={(e) => { e.preventDefault(); handleInputEnd(['Space']); }}
                    onMouseLeave={(e) => { e.preventDefault(); handleInputEnd(['Space']); }}
                    onTouchStart={(e) => { e.preventDefault(); handleInputStart(['Space']); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleInputEnd(['Space']); }}
                   >
                       <ArrowUp className="text-white w-12 h-12" />
                   </div>
              </div>
          </div>
      )}

      <canvas
        ref={canvasRef}
        width={VIEWPORT_WIDTH}
        height={VIEWPORT_HEIGHT}
        className="bg-blue-300 shadow-2xl rounded-lg border-4 border-white/20"
        style={{ width: '100%', maxWidth: '800px', aspectRatio: '16/9', imageRendering: 'pixelated' }}
      />

      {/* NEW MAIN MENU - SONIC 3 AIR STYLE */}
      {gameState === 'MENU' && (
        <div className="absolute inset-0 flex z-30 pointer-events-none">
            {/* Left Side (Transparent, shows game level) */}
            <div className="w-1/2 h-full relative">
                <div className="absolute top-10 left-10 text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-lg" style={{textShadow: '4px 4px 0 #000'}}>
                    EMERALD
                    <br/>
                    COAST 2D
                </div>
            </div>

            {/* Right Side (White Menu Panel) */}
            <div className="w-1/2 h-full bg-white relative flex flex-col justify-center pl-16 pr-8 pointer-events-auto" 
                 style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0% 100%)' }}>
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/10 skew-x-[-12deg] -translate-x-2"></div>
                
                <div className="flex flex-col gap-2 pointer-events-auto">
                    {MENU_OPTIONS.map((option, index) => {
                        let label = option;
                        if (option === 'OPTIONS') {
                            label = `CONTROLS: ${isMobile ? 'MOBILE' : 'PC'}`;
                        }
                        
                        return (
                            <div 
                                key={option} 
                                onClick={() => confirmMenuSelection(index)}
                                onMouseEnter={() => setMenuSelection(index)}
                                className={`
                                    text-4xl font-black italic tracking-tight py-2 px-6 transition-all duration-100 cursor-pointer select-none
                                    ${index === menuSelection 
                                        ? 'text-black bg-yellow-400 -skew-x-12 translate-x-4 shadow-lg border-l-8 border-black' 
                                        : 'text-gray-400 hover:text-gray-600 scale-95'}
                                `}
                            >
                                {label}
                            </div>
                        );
                    })}
                </div>
                
                <div className="absolute bottom-8 right-8 text-xs text-gray-400 font-mono">
                    ARROW KEYS TO NAVIGATE • ENTER TO SELECT
                </div>
            </div>
        </div>
      )}

      {/* Game Over / Win UI */}
      {(gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-20 backdrop-blur-md">
          <h2 className={`text-6xl font-black mb-4 ${gameState === 'VICTORY' ? 'text-yellow-400' : 'text-red-500'}`}>
            {gameState === 'VICTORY' ? 'COURSE CLEAR!' : 'GAME OVER'}
          </h2>
          {gameState === 'VICTORY' && (
            <div className="text-2xl mb-6 font-mono text-center">
               <p>Score: {player.current.score}</p>
               <p>Time Bonus: {Math.max(0, 5000 - player.current.time * 10)}</p>
            </div>
          )}
          <div className="flex gap-4">
             {gameState === 'GAMEOVER' && lastCheckpointRef.current && (
                 <button 
                  onClick={() => { initGame(true); setGameState('PLAYING'); }}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-500 mt-4 transition-transform hover:scale-105"
                >
                  <RotateCcw size={20} /> CHECKPOINT
                </button>
             )}
              <button 
                onClick={() => { setGameState('MENU'); }}
                className="flex items-center gap-2 px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 mt-4 transition-transform hover:scale-105"
              >
                <RotateCcw size={20} /> MAIN MENU
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SonicGame;
