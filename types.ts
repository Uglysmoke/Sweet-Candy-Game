
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
  COLOR_BOMB = 'color_bomb',
  ROCK = 'rock',
  JELLY = 'jelly'
}

export enum PowerupType {
  LOLLIPOP_HAMMER = 'lollipop_hammer',
  FREE_SWITCH = 'free_switch',
  EXTRA_MOVES_5 = 'extra_moves_5',
  UFO = 'ufo',
  PARTY_BOOSTER = 'party_booster'
}

export enum PreGameBoosterType {
  FISH = 'fish',
  COLOR_BOMB = 'color_bomb',
  COCONUT_WHEEL = 'coconut_wheel',
  STRIPED_WRAPPED = 'striped_wrapped',
  LUCKY_CANDY = 'lucky_candy',
  EXTRA_MOVES = 'extra_moves'
}

export interface Candy {
  id: string;
  color: CandyColor;
  type: CandyType;
  health?: number; // For multi-hit candies like ROCK or JELLY
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

export enum GoalType {
  COLLECT_COLOR = 'collect_color',
  COLLECT_TYPE = 'collect_type'
}

export interface LevelGoal {
  type: GoalType;
  target: CandyColor | CandyType;
  count: number;
}

export interface LevelConfig {
  id: number;
  targetScore: number;
  moves: number;
  title: string;
  goals: LevelGoal[];
}

export type GameStatus = 'playing' | 'level-complete' | 'game-over' | 'paused' | 'setup';
