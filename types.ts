
export type Player = 'white' | 'black';
export type GameMode = 'PvP' | 'PvAI';
export type GameVariant = 'moroccan' | 'turkish' | 'spanish';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type BoardSetup = 'standard' | 'diagonal'; // standard = full rows, diagonal = checkers pattern
export type AppView = 'menu' | 'game';

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  player: Player;
  isKing: boolean;
  id: string; // Unique ID for React keys and animation
}

export type BoardState = (Piece | null)[][];

export interface Move {
  from: Position;
  to: Position;
  isCapture: boolean;
  capturedSquare?: Position; // The square being jumped over
  promotes?: boolean;
}

export interface GameState {
  board: BoardState;
  currentPlayer: Player;
  selectedPos: Position | null;
  validMoves: Move[];
  winner: Player | 'draw' | null;
  mustCaptureFrom: Position | null; // If a player is in a multi-jump sequence
  history: string[];
  variant: GameVariant;
  hintMove?: Move | null;
}

export interface GameInfoProps {
  currentPlayer: Player;
  winner: Player | 'draw' | null;
  history: string[];
  onNewGame: () => void;
  onExit: () => void;
  whiteCount: number;
  blackCount: number;
  gameMode: GameMode;
  isAiThinking: boolean;
  undosRemaining: number;
  hintsRemaining: number;
  onUndo: () => void;
  canUndo: boolean;
  gameVariant: GameVariant;
  difficulty: Difficulty;
  boardSetup: BoardSetup;
  onShowHint: () => void;
  winChance: number | null; // Percentage 0-100 for human player winning
}