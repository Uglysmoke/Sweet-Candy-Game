
export enum CandyColor {
  RED = 'red',
  BLUE = 'blue',
  GREEN = 'green',
  YELLOW = 'yellow',
  PURPLE = 'purple',
  ORANGE = 'orange'
}

export enum CandyType {
  REGULAR = 'regular',
  STRIPE_H = 'stripe_h',
  STRIPE_V = 'stripe_v',
  BOMB = 'bomb',
  COLOR_BOMB = 'color_bomb'
}

export interface Candy {
  id: string;
  color: CandyColor;
  type: CandyType;
}

export type BoardType = (Candy | null)[][];

export interface Position {
  row: number;
  col: number;
}

export interface MoveHint {
  from: Position;
  to: Position;
  explanation: string;
}

export interface LevelConfig {
  id: number;
  targetScore: number;
  moves: number;
  title: string;
}

export type GameStatus = 'playing' | 'level-complete' | 'game-over' | 'paused';
