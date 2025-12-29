
import React from 'react';
import { CandyColor, LevelConfig, CandyType, GoalType, PreGameBoosterType, LevelGoal } from './types';

export const GRID_SIZE = 8;

export const CANDY_COLORS = [
  CandyColor.RED,
  CandyColor.BLUE,
  CandyColor.GREEN,
  CandyColor.YELLOW,
  CandyColor.PURPLE,
  CandyColor.ORANGE
];

export const PRE_GAME_BOOSTERS_CONFIG = [
  { type: PreGameBoosterType.FISH, icon: '🐟', label: 'Fish', desc: 'Adds fish to the board' },
  { type: PreGameBoosterType.COLOR_BOMB, icon: '🍭', label: 'Color Bomb', desc: 'Starts with a Color Bomb' },
  { type: PreGameBoosterType.COCONUT_WHEEL, icon: '🥥', label: 'Coconut Wheel', desc: 'Turns a row into stripes' },
  { type: PreGameBoosterType.STRIPED_WRAPPED, icon: '🍬', label: 'Stripe & Wrap', desc: 'Starts with special candies' },
  { type: PreGameBoosterType.LUCKY_CANDY, icon: '🍀', label: 'Lucky Candy', desc: 'Spawns random specials' },
  { type: PreGameBoosterType.EXTRA_MOVES, icon: '➕', label: 'Extra Moves', desc: '+3 moves for the level' },
];

// Generate 2000 levels programmatically
const generateLevels = (): LevelConfig[] => {
  const levels: LevelConfig[] = [];
  for (let i = 1; i <= 2000; i++) {
    const isHard = i % 5 === 0;
    const isBoss = i % 50 === 0;
    
    let moves = Math.max(8, 25 - Math.floor(i / 100));
    if (isHard) moves = Math.max(6, Math.floor(moves * 0.7));
    if (isBoss) moves = Math.max(5, Math.floor(moves * 0.5));

    let targetScore = i * 500 + (isHard ? 2000 : 500);
    if (isBoss) targetScore *= 2;

    const goals: LevelGoal[] = [];
    
    // Primary color goal
    const colorIdx = (i - 1) % CANDY_COLORS.length;
    goals.push({ 
      type: GoalType.COLLECT_COLOR, 
      target: CANDY_COLORS[colorIdx], 
      count: 10 + Math.min(100, Math.floor(i / 5)) 
    });

    // Secondary goal for variety
    if (i > 3) {
      if (i % 3 === 0) {
        goals.push({ 
          type: GoalType.COLLECT_COLOR, 
          target: CANDY_COLORS[(colorIdx + 2) % CANDY_COLORS.length], 
          count: 5 + Math.floor(i / 10) 
        });
      } else if (i % 7 === 0) {
        goals.push({ 
          type: GoalType.COLLECT_TYPE, 
          target: CandyType.BOMB, 
          count: 1 + Math.floor(i / 100) 
        });
      } else if (isHard) {
        goals.push({ 
          type: GoalType.COLLECT_TYPE, 
          target: CandyType.STRIPE_H, 
          count: 2 + Math.floor(i / 50) 
        });
      }
    }

    levels.push({
      id: i,
      title: i.toString(),
      targetScore,
      moves,
      goals
    });
  }
  return levels;
};

export const LEVELS: LevelConfig[] = generateLevels();

export const CANDY_STYLES: Record<CandyColor, string> = {
  [CandyColor.RED]: 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-200',
  [CandyColor.BLUE]: 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-200',
  [CandyColor.GREEN]: 'bg-gradient-to-br from-green-400 to-green-600 shadow-green-200',
  [CandyColor.YELLOW]: 'bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-yellow-100',
  [CandyColor.PURPLE]: 'bg-gradient-to-br from-purple-400 to-purple-600 shadow-purple-200',
  [CandyColor.ORANGE]: 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-200',
};

// SVG components for candy icons
export const CandyIcon: React.FC<{ color: CandyColor; size?: number }> = ({ color, size = 32 }) => {
  const common = `w-full h-full p-2 flex items-center justify-center`;
  switch (color) {
    case CandyColor.RED:
      return <div className={`${common} text-white`}>❤️</div>;
    case CandyColor.BLUE:
      return <div className={`${common} text-white`}>💎</div>;
    case CandyColor.GREEN:
      return <div className={`${common} text-white`}>🍏</div>;
    case CandyColor.YELLOW:
      return <div className={`${common} text-white`}>⭐</div>;
    case CandyColor.PURPLE:
      return <div className={`${common} text-white`}>🍇</div>;
    case CandyColor.ORANGE:
      return <div className={`${common} text-white`}>🍊</div>;
    default:
      return null;
  }
};
