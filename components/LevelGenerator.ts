
import { Entity, EntityType, BossState } from '../types';
import { SECTION_1_END, TILE_SIZE, BOSS_MAX_HP } from '../constants';

let entityCounter = 0;
const uid = () => `ent_${entityCounter++}`;

export const generateLevel = (): Entity[] => {
  const entities: Entity[] = [];

  const addBlock = (x: number, y: number, w: number, h: number, texture: 'sand' | 'rock' | 'wood' = 'sand') => {
    entities.push({
      id: uid(),
      type: EntityType.BLOCK,
      pos: { x: x * TILE_SIZE, y: y * TILE_SIZE },
      size: { x: w * TILE_SIZE, y: h * TILE_SIZE },
      texture,
      active: true,
    });
  };

  const addPlatform = (x: number, y: number, w: number, h: number, texture: 'sand' | 'rock' | 'wood' = 'sand') => {
    entities.push({
      id: uid(),
      type: EntityType.PLATFORM,
      pos: { x: x * TILE_SIZE, y: y * TILE_SIZE },
      size: { x: w * TILE_SIZE, y: h * TILE_SIZE },
      texture,
      active: true,
    });
  };

  const addRing = (x: number, y: number) => {
    entities.push({
      id: uid(),
      type: EntityType.RING,
      pos: { x: x * TILE_SIZE, y: y * TILE_SIZE },
      size: { x: TILE_SIZE / 2, y: TILE_SIZE / 2 }, 
      active: true,
    });
  };

  const addRingLine = (startX: number, startY: number, count: number) => {
    for (let i = 0; i < count; i++) {
        addRing(startX + i, startY);
    }
  };

  const addEnemy = (x: number, y: number) => {
    entities.push({
      id: uid(),
      type: EntityType.ENEMY,
      pos: { x: x * TILE_SIZE, y: y * TILE_SIZE },
      size: { x: TILE_SIZE, y: TILE_SIZE * 0.8 },
      velocity: { x: -1, y: 0 },
      active: true,
      patrolRange: 200,
      initialX: x * TILE_SIZE,
    });
  };

  const addSpring = (x: number, y: number) => {
    // Place spring slightly higher (y - 0.5) to sit ON TOP of blocks
    entities.push({
      id: uid(),
      type: EntityType.SPRING,
      pos: { x: x * TILE_SIZE, y: (y - 0.5) * TILE_SIZE },
      size: { x: TILE_SIZE, y: TILE_SIZE / 2 },
      active: true,
    });
  };
  
  const addDashPad = (x: number, y: number) => {
    entities.push({
      id: uid(),
      type: EntityType.DASH_PAD,
      pos: { x: x * TILE_SIZE, y: (y - 0.2) * TILE_SIZE }, // Slightly up
      size: { x: TILE_SIZE, y: TILE_SIZE / 2 },
      active: true,
    });
  };

  const addLoop = (x: number, y: number) => {
    // Made loop bigger (4x4)
    entities.push({
        id: uid(),
        type: EntityType.LOOP_TRIGGER,
        pos: {x: x * TILE_SIZE, y: y * TILE_SIZE},
        size: {x: TILE_SIZE * 4, y: TILE_SIZE * 4}, 
        active: true
    });
  }

  const addCheckpoint = (x: number, y: number) => {
    // y passed is the ground block index. Checkpoint sits on top.
    // Checkpoint height is 2 tiles. 
    // Top of checkpoint = (y - 2).
    entities.push({
        id: uid(),
        type: EntityType.CHECKPOINT,
        pos: {x: x * TILE_SIZE, y: (y - 2) * TILE_SIZE}, 
        size: {x: TILE_SIZE, y: TILE_SIZE * 2},
        active: true,
        triggered: false
    });
  }

  const addSpike = (x: number, y: number, width: number = 1) => {
    entities.push({
        id: uid(),
        type: EntityType.SPIKE,
        pos: {x: x * TILE_SIZE, y: (y - 0.5) * TILE_SIZE},
        size: {x: width * TILE_SIZE, y: TILE_SIZE / 2},
        active: true
    });
  }

  // =========================================================================
  // SECTION 1: EMERALD BEACH
  // =========================================================================
  
  addBlock(0, 10, 30, 10, 'sand'); 
  addRingLine(5, 8, 5);
  addEnemy(20, 9);

  // Split Point (x=30)
  addDashPad(30, 9.5);
  addLoop(38, 6); // Ground at 10. Loop size 4. 10-4=6.
  addBlock(35, 10, 15, 2, 'sand'); 
  
  // LOWER PATH (Restored to Y=20 - Above water)
  const lowerY = 20;
  // Make lower path start earlier to catch the fall
  addBlock(25, lowerY, 110, 5, 'rock'); 
  
  // FILLER BLOCKS REMOVED - Returning to open air gap style

  // Upper Path Bridges
  addBlock(55, 12, 5, 2, 'wood'); 
  addRing(57, 10);
  addBlock(65, 10, 5, 2, 'wood');
  addEnemy(67, 9);
  addBlock(75, 8, 10, 2, 'sand'); 
  addRingLine(76, 6, 4);
  
  // Lower Path Entities (Adjusted for Y=20)
  addSpike(45, lowerY, 3);
  addEnemy(55, lowerY - 1);
  addSpike(65, lowerY, 2);
  addRingLine(60, lowerY - 2, 3);
  addSpike(75, lowerY, 4); 
  
  // CHECKPOINT 1 (BOTTOM)
  addBlock(80, lowerY - 1, 4, 1, 'wood');
  addCheckpoint(81, lowerY - 1);
  
  // Connector Spring Shaft
  addBlock(98, lowerY, 4, 2, 'wood');
  addSpring(100, lowerY); // Launches you up from Y=20
  
  // Platforms to climb up from y=20
  addPlatform(100, 10, 4, 1, 'wood');

  addRingLine(100, -2, 3); 

  // CHECKPOINT 2 (TOP)
  addBlock(105, 5, 20, 2, 'sand');
  addCheckpoint(110, 5); 
  
  addBlock(120, 18, 2, 2, 'wood');
  addBlock(122, 16, 2, 2, 'wood');
  addBlock(124, 14, 2, 2, 'wood');
  addSpring(126, 14); 
  
  addPlatform(125, 6, 2, 2, 'sand');
  addPlatform(127, 7, 2, 2, 'sand');
  addPlatform(129, 8, 2, 2, 'sand');
  
  addPlatform(130, 10, 30, 2, 'sand'); 
  addDashPad(135, 9.5);
  
  addRingLine(145, 8, 5);

  // =========================================================================
  // SECTION 2: CAVE
  // =========================================================================
  const caveStart = 160;
  
  addBlock(caveStart, 0, 100, 4, 'rock'); 
  addBlock(caveStart, 12, 10, 5, 'rock'); 
  
  addRingLine(caveStart + 2, 10, 3);
  addEnemy(caveStart + 8, 11);

  addBlock(caveStart + 15, 15, 8, 2, 'rock');
  addRing(caveStart + 18, 13);
  
  addBlock(caveStart + 28, 13, 6, 2, 'rock');
  addEnemy(caveStart + 30, 12);

  addBlock(caveStart + 35, 18, 20, 2, 'rock'); 
  addSpike(caveStart + 40, 18, 5); 
  
  addPlatform(caveStart + 50, 9, 3, 1, 'wood'); 
  addPlatform(caveStart + 55, 7, 3, 1, 'wood');
  addPlatform(caveStart + 60, 5, 3, 1, 'wood');
  addSpring(caveStart + 60, 5);
  
  addBlock(caveStart + 65, 3, 30, 3, 'rock');
  addRingLine(caveStart + 70, 1, 10);
  addEnemy(caveStart + 80, 2);
  addEnemy(caveStart + 85, 2);
  
  addDashPad(caveStart + 90, 2.5);

  // =========================================================================
  // SECTION 3: BRIGHT ARENA & BOSS
  // =========================================================================
  const arenaStart = caveStart + 100; // x = ~260

  // Safety floor + Spring to reach platforms if falling from cave
  addBlock(arenaStart - 5, 12, 10, 5, 'rock');
  addSpring(arenaStart, 12);

  // 1. Easy Red (Wood) Platforms leading to Arena
  // Lowered (y=10..8) and closer gaps
  addPlatform(arenaStart + 4, 10, 10, 1, 'wood');
  addRingLine(arenaStart + 6, 8, 3);

  addPlatform(arenaStart + 15, 9, 10, 1, 'wood');
  addEnemy(arenaStart + 19, 7);

  addPlatform(arenaStart + 26, 8, 10, 1, 'wood');
  addRingLine(arenaStart + 28, 6, 3);

  addPlatform(arenaStart + 37, 9, 10, 1, 'wood');

  // 2. Loop & Run up
  const runUpX = arenaStart + 50;
  addBlock(runUpX, 10, 50, 10, 'rock'); // Ground Y=10
  addDashPad(runUpX + 5, 9.5);
  addRingLine(runUpX + 15, 8, 5);
  
  // Loop sits on top of ground Y=10. Size Y=4. Top=6.
  addLoop(runUpX + 25, 6); 

  // 3. Boss Arena (Flat, Bright)
  const bossArenaX = runUpX + 40;
  
  // Extended flat ground for the boss fight
  addBlock(bossArenaX, 12, 40, 5, 'sand'); // Floor at Y=12
  
  // Checkpoint before boss - Ensure it sits ON TOP of ground (Y=12)
  addCheckpoint(bossArenaX - 2, 12);
  
  // Boss Entity - Spawns in AIR (Phase 1: Hover)
  entities.push({
    id: uid(),
    type: EntityType.BOSS,
    pos: { x: (bossArenaX + 15) * TILE_SIZE, y: 4 * TILE_SIZE }, // High up
    size: { x: TILE_SIZE * 2, y: TILE_SIZE * 2 },
    velocity: { x: 0, y: 0 },
    hp: BOSS_MAX_HP, 
    maxHp: BOSS_MAX_HP,
    active: true,
    bossState: BossState.HOVER,
    bossTimer: 300
  });

  return entities;
};
