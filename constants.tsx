
import React from 'react';
import { CandyColor, LevelConfig } from './types';

export const GRID_SIZE = 8;

export const CANDY_COLORS = [
  CandyColor.RED,
  CandyColor.BLUE,
  CandyColor.GREEN,
  CandyColor.YELLOW,
  CandyColor.PURPLE,
  CandyColor.ORANGE
];

export const LEVELS: LevelConfig[] = [
  { id: 1, title: "Sugar Start", targetScore: 500, moves: 25 },
  { id: 2, title: "Sweet Success", targetScore: 1200, moves: 20 },
  { id: 3, title: "Caramel Canyon", targetScore: 2500, moves: 18 },
  { id: 4, title: "Marshmallow Mountain", targetScore: 4000, moves: 15 },
  { id: 5, title: "Chocolate Champ", targetScore: 6000, moves: 12 },
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
