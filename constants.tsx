
import React from 'react';
import { CandyColor, LevelConfig, CandyType, GoalType, PreGameBoosterType } from './types';

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

export const LEVELS: LevelConfig[] = [
  { 
    id: 1, 
    title: "1", 
    targetScore: 500, 
    moves: 25,
    goals: [
      { type: GoalType.COLLECT_COLOR, target: CandyColor.RED, count: 15 }
    ]
  },
  { 
    id: 2, 
    title: "2", 
    targetScore: 1200, 
    moves: 20,
    goals: [
      { type: GoalType.COLLECT_COLOR, target: CandyColor.BLUE, count: 20 },
      { type: GoalType.COLLECT_COLOR, target: CandyColor.GREEN, count: 20 }
    ]
  },
  { 
    id: 3, 
    title: "3", 
    targetScore: 2500, 
    moves: 18,
    goals: [
      { type: GoalType.COLLECT_TYPE, target: CandyType.STRIPE_H, count: 3 },
      { type: GoalType.COLLECT_TYPE, target: CandyType.STRIPE_V, count: 3 }
    ]
  },
  { 
    id: 4, 
    title: "4", 
    targetScore: 4000, 
    moves: 15,
    goals: [
      { type: GoalType.COLLECT_COLOR, target: CandyColor.PURPLE, count: 30 },
      { type: GoalType.COLLECT_TYPE, target: CandyType.BOMB, count: 2 }
    ]
  },
  { 
    id: 5, 
    title: "5", 
    targetScore: 6000, 
    moves: 12,
    goals: [
      { type: GoalType.COLLECT_TYPE, target: CandyType.COLOR_BOMB, count: 2 },
      { type: GoalType.COLLECT_COLOR, target: CandyColor.ORANGE, count: 40 }
    ]
  },
  { 
    id: 6, 
    title: "6", 
    targetScore: 8000, 
    moves: 20,
    goals: [
      { type: GoalType.COLLECT_COLOR, target: CandyColor.YELLOW, count: 50 },
      { type: GoalType.COLLECT_TYPE, target: CandyType.STRIPE_H, count: 5 }
    ]
  },
  { 
    id: 7, 
    title: "7", 
    targetScore: 10000, 
    moves: 15,
    goals: [
      { type: GoalType.COLLECT_TYPE, target: CandyType.BOMB, count: 4 },
      { type: GoalType.COLLECT_TYPE, target: CandyType.COLOR_BOMB, count: 1 }
    ]
  },
  { 
    id: 8, 
    title: "8", 
    targetScore: 12000, 
    moves: 20,
    goals: [
      { type: GoalType.COLLECT_TYPE, target: CandyType.ROCK, count: 6 },
      { type: GoalType.COLLECT_COLOR, target: CandyColor.BLUE, count: 30 }
    ]
  },
  { 
    id: 9, 
    title: "9", 
    targetScore: 15000, 
    moves: 18,
    goals: [
      { type: GoalType.COLLECT_TYPE, target: CandyType.JELLY, count: 10 },
      { type: GoalType.COLLECT_TYPE, target: CandyType.BOMB, count: 3 }
    ]
  }
];

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
