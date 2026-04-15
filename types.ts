export interface Resource {
  id: string;
  name: string;
  value: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  color: string;
  icon: string;
  baseChance: number;
}

export interface PlayerStats {
  level: number;
  experience: number;
  coins: number;
  miningPower: number;
  luck: number;
  energy: number;
  maxEnergy: number;
}

export interface MiningResult {
  resource: Resource;
  quantity: number;
  experienceGained: number;
  coinsGained: number;
  isCritical: boolean;
}

export interface GameState {
  playerStats: PlayerStats;
  inventory: Map<string, number>;
  currentMineDepth: number;
  upgrades: {
    pickaxeLevel: number;
    energyCapacity: number;
    luckBoost: number;
  };
  achievements: Set<string>;
}

export interface MineTile {
  id: string;
  depth: number;
  resource: Resource | null;
  isRevealed: boolean;
  isMined: boolean;
  hardness: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (gameState: GameState) => boolean;
  reward: {
    coins: number;
    experience: number;
  };
}

export const RESOURCES: Resource[] = [
  { id: 'stone', name: 'Stone', value: 1, rarity: 'common', color: '#808080', icon: '🪨', baseChance: 0.4 },
  { id: 'coal', name: 'Coal', value: 5, rarity: 'common', color: '#2C2C2C', icon: '🪨', baseChance: 0.25 },
  { id: 'iron', name: 'Iron', value: 15, rarity: 'uncommon', color: '#B0B0B0', icon: '⛏️', baseChance: 0.15 },
  { id: 'gold', name: 'Gold', value: 50, rarity: 'rare', color: '#FFD700', icon: '💰', baseChance: 0.08 },
  { id: 'diamond', name: 'Diamond', value: 200, rarity: 'epic', color: '#B9F2FF', icon: '💎', baseChance: 0.03 },
  { id: 'emerald', name: 'Emerald', value: 500, rarity: 'legendary', color: '#50C878', icon: '💚', baseChance: 0.01 },
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_mine',
    name: 'First Dig',
    description: 'Mine your first resource',
    condition: (gameState) => Array.from(gameState.inventory.values()).some(count => count > 0),
    reward: { coins: 100, experience: 50 }
  },
  {
    id: 'rich_miner',
    name: 'Rich Miner',
    description: 'Collect 1000 coins',
    condition: (gameState) => gameState.playerStats.coins >= 1000,
    reward: { coins: 500, experience: 200 }
  },
  {
    id: 'deep_digger',
    name: 'Deep Digger',
    description: 'Reach depth level 50',
    condition: (gameState) => gameState.currentMineDepth >= 50,
    reward: { coins: 1000, experience: 500 }
  }
];