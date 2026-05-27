/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  description: string;
  color: string; // Neon theme color for this track: e.g. 'cyan', 'magenta', 'emerald'
  accentClass: string; // Tailwind class matching the neon color
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  x: number;
  y: number;
}

export interface SnakeGameState {
  segments: Position[];
  direction: Direction;
  nextDirection: Direction;
  food: Position;
  specialFood: Position | null; // Flashing special food for bonus points
  specialFoodTimeLeft: number; // Ticks left before special food disappears
  foodType: 'normal' | 'speed' | 'slow' | 'shield'; // Special effects!
  score: number;
  highScore: number;
  isGameOver: boolean;
  isPaused: boolean;
  speed: number; // Tick rate in ms
  gridSize: number; // Usually 20x20
  scoreMultipler: number;
}
