
import {
  BOARD_SIZE,
  DIRECTIONS,
  DIAGONALS,
  TURKISH_BLACK_ROWS,
  TURKISH_WHITE_ROWS,
  DIAGONAL_BLACK_ROWS,
  DIAGONAL_WHITE_ROWS,
} from '../constants';
import { BoardState, Move, Piece, Player, Position, GameVariant, BoardSetup } from '../types';

// Helper Functions 

export const createInitialBoard = (variant: GameVariant, setup: BoardSetup): BoardState => {
  const board: BoardState = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));
  let idCounter = 0;

  if (variant === 'turkish' && setup === 'standard') {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (TURKISH_BLACK_ROWS.includes(r)) {
          board[r][c] = { player: 'black', isKing: false, id: `b-${idCounter++}` };
        } else if (TURKISH_WHITE_ROWS.includes(r)) {
          board[r][c] = { player: 'white', isKing: false, id: `w-${idCounter++}` };
        }
      }
    }
  } else {
    // Diagonal Setup (Used for Spanish, Moroccan AND "Turkish Diagonal" variant)
    // 12 pieces per side, dark squares only
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        // Dark squares only
        if ((r + c) % 2 === 1) {
          if (DIAGONAL_BLACK_ROWS.includes(r)) {
            board[r][c] = { player: 'black', isKing: false, id: `b-${idCounter++}` };
          } else if (DIAGONAL_WHITE_ROWS.includes(r)) {
            board[r][c] = { player: 'white', isKing: false, id: `w-${idCounter++}` };
          }
        }
      }
    }
  }

  return board;
};

const isValidPos = (r: number, c: number) =>
  r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

const getPiece = (board: BoardState, pos: Position): Piece | null => {
  if (!isValidPos(pos.row, pos.col)) return null;
  return board[pos.row][pos.col];
};

const isPromotionRow = (row: number, player: Player): boolean => {
  return player === 'white' ? row === 0 : row === BOARD_SIZE - 1;
};

// Move Generation

const getTurkishMoves = (board: BoardState, pos: Position, piece: Piece): Move[] => {
  const moves: Move[] = [];
  const directions = Object.values(DIRECTIONS);

  if (!piece.isKing) {
    // --- MAN LOGIC (Turkish) ---
    // Move: Forward or Sideways (1 square). NO BACKWARD move.
    // Capture: Forward or Sideways (Jump). NO BACKWARD capture.

    const forwardRowDir = piece.player === 'white' ? -1 : 1;

    // 1. Walk Moves
    const walkDirs = [
      { r: forwardRowDir, c: 0 },
      DIRECTIONS.LEFT,
      DIRECTIONS.RIGHT,
    ];

    for (const dir of walkDirs) {
      const target = { row: pos.row + dir.r, col: pos.col + dir.c };
      if (isValidPos(target.row, target.col) && getPiece(board, target) === null) {
        moves.push({
          from: pos,
          to: target,
          isCapture: false,
          promotes: isPromotionRow(target.row, piece.player),
        });
      }
    }

    // 2. Capture Moves (Forward & Sideways only for Turkish Men)
    for (const dir of walkDirs) {
      const adjacent = { row: pos.row + dir.r, col: pos.col + dir.c };
      const landing = { row: pos.row + dir.r * 2, col: pos.col + dir.c * 2 };

      if (isValidPos(landing.row, landing.col)) {
        const adjacentPiece = getPiece(board, adjacent);
        const landingPiece = getPiece(board, landing);

        if (adjacentPiece && adjacentPiece.player !== piece.player && landingPiece === null) {
          moves.push({
            from: pos,
            to: landing,
            isCapture: true,
            capturedSquare: adjacent,
            promotes: isPromotionRow(landing.row, piece.player),
          });
        }
      }
    }
  } else {
    // --- KING LOGIC (Turkish) ---
    // Moves like a Rook.
    // Captures by jumping over 1 piece and landing anywhere after.

    for (const dir of directions) {
      // 1. Walk Logic
      let r = pos.row + dir.r;
      let c = pos.col + dir.c;
      while (isValidPos(r, c)) {
        if (getPiece(board, { row: r, col: c }) === null) {
          moves.push({
            from: pos,
            to: { row: r, col: c },
            isCapture: false,
            promotes: false,
          });
        } else {
          break;
        }
        r += dir.r;
        c += dir.c;
      }

      // 2. Capture Logic
      r = pos.row + dir.r;
      c = pos.col + dir.c;
      let foundEnemy = false;
      let capturedPos: Position | null = null;

      while (isValidPos(r, c)) {
        const currentPos = { row: r, col: c };
        const currentPiece = getPiece(board, currentPos);

        if (!foundEnemy) {
          if (currentPiece === null) {
          } else if (currentPiece.player !== piece.player) {
            foundEnemy = true;
            capturedPos = currentPos;
          } else {
            break;
          }
        } else {
          if (currentPiece === null) {
            moves.push({
              from: pos,
              to: currentPos,
              isCapture: true,
              capturedSquare: capturedPos!,
              promotes: false,
            });
          } else {
            break;
          }
        }
        r += dir.r;
        c += dir.c;
      }
    }
  }
  return moves;
};

const getDiagonalMoves = (board: BoardState, pos: Position, piece: Piece): Move[] => {
  const moves: Move[] = [];
  const diags = Object.values(DIAGONALS);

  if (!piece.isKing) {
    // --- MAN LOGIC (Spanish/Moroccan) ---
    // Move: Diagonal Forward (1 step).
    // Capture: Diagonal Forward ONLY.

    const forwardRowDir = piece.player === 'white' ? -1 : 1;

    // 1. Walk Moves (Forward only)
    const forwardDiags = diags.filter(d => d.r === forwardRowDir);
    for (const dir of forwardDiags) {
      const target = { row: pos.row + dir.r, col: pos.col + dir.c };
      if (isValidPos(target.row, target.col) && getPiece(board, target) === null) {
        moves.push({
          from: pos,
          to: target,
          isCapture: false,
          promotes: isPromotionRow(target.row, piece.player),
        });
      }
    }

    // 2. Capture Moves (Forward Only for Men)
    for (const dir of forwardDiags) {
      const adjacent = { row: pos.row + dir.r, col: pos.col + dir.c };
      const landing = { row: pos.row + dir.r * 2, col: pos.col + dir.c * 2 };

      if (isValidPos(landing.row, landing.col)) {
        const adjacentPiece = getPiece(board, adjacent);
        const landingPiece = getPiece(board, landing);

        if (adjacentPiece && adjacentPiece.player !== piece.player && landingPiece === null) {
          moves.push({
            from: pos,
            to: landing,
            isCapture: true,
            capturedSquare: adjacent,
            promotes: isPromotionRow(landing.row, piece.player),
          });
        }
      }
    }
  } else {
    // --- KING LOGIC (Spanish/Moroccan/International) ---

    for (const dir of diags) {
      // 1. Walk Logic
      let r = pos.row + dir.r;
      let c = pos.col + dir.c;
      while (isValidPos(r, c)) {
        if (getPiece(board, { row: r, col: c }) === null) {
          moves.push({
            from: pos,
            to: { row: r, col: c },
            isCapture: false,
            promotes: false,
          });
        } else {
          break;
        }
        r += dir.r;
        c += dir.c;
      }

      // 2. Capture Logic
      r = pos.row + dir.r;
      c = pos.col + dir.c;
      let foundEnemy = false;
      let capturedPos: Position | null = null;

      while (isValidPos(r, c)) {
        const currentPos = { row: r, col: c };
        const currentPiece = getPiece(board, currentPos);

        if (!foundEnemy) {
          if (currentPiece === null) {
          } else if (currentPiece.player !== piece.player) {
            foundEnemy = true;
            capturedPos = currentPos;
          } else {
            break;
          }
        } else {
          if (currentPiece === null) {
            moves.push({
              from: pos,
              to: currentPos,
              isCapture: true,
              capturedSquare: capturedPos!,
              promotes: false,
            });
          } else {
            break;
          }
        }
        r += dir.r;
        c += dir.c;
      }
    }
  }
  return moves;
};

const getPossibleMovesForPiece = (
  board: BoardState,
  pos: Position,
  variant: GameVariant
): Move[] => {
  const piece = getPiece(board, pos);
  if (!piece) return [];

  if (variant === 'turkish') {
    return getTurkishMoves(board, pos, piece);
  } else {
    // Spanish and Moroccan variants use the same move/capture GEOMETRY.
    // The difference is only in mandatory enforcement at the global level.
    return getDiagonalMoves(board, pos, piece);
  }
};

// Global Move Validation

export const getAllValidMoves = (
  board: BoardState,
  currentPlayer: Player,
  mustCaptureFrom: Position | null,
  variant: GameVariant
): Move[] => {
  let allMoves: Move[] = [];

  if (mustCaptureFrom) {
    const movesForPiece = getPossibleMovesForPiece(board, mustCaptureFrom, variant);
    return movesForPiece.filter(m => m.isCapture);
  }


  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (piece && piece.player === currentPlayer) {
        allMoves.push(...getPossibleMovesForPiece(board, { row: r, col: c }, variant));
      }
    }
  }


  const captureMoves = allMoves.filter(m => m.isCapture);

  if (variant !== 'moroccan' && captureMoves.length > 0) {
    return captureMoves;
  }

  return allMoves;
};

// Move Execution 

export interface MoveResult {
  nextBoard: BoardState;
  nextPlayer: Player;
  nextMustCaptureFrom: Position | null;
  moveNotation: string;
}

export const performMove = (
  currentBoard: BoardState,
  move: Move,
  currentPlayer: Player,
  variant: GameVariant
): MoveResult => {
  const nextBoard = currentBoard.map(row => row.map(p => (p ? { ...p } : null)));

  const movingPiece = nextBoard[move.from.row][move.from.col]!;


  if (move.isCapture && move.capturedSquare) {
    nextBoard[move.capturedSquare.row][move.capturedSquare.col] = null;
  }


  nextBoard[move.from.row][move.from.col] = null;
  nextBoard[move.to.row][move.to.col] = movingPiece;

  let justPromoted = false;
  if (move.promotes) {
    movingPiece.isKing = true;
    justPromoted = true;
  }

  let nextMustCaptureFrom: Position | null = null;
  let nextPlayer = currentPlayer;

  if (move.isCapture && !justPromoted) {
    const subsequentMoves = getPossibleMovesForPiece(nextBoard, move.to, variant);
    const hasMoreCaptures = subsequentMoves.some(m => m.isCapture);

    if (hasMoreCaptures) {
      nextMustCaptureFrom = move.to;
      nextPlayer = currentPlayer;
    } else {
      nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
    }
  } else {
    nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
  }

  const notation = formatNotation(move, movingPiece, move.isCapture);

  return {
    nextBoard,
    nextPlayer,
    nextMustCaptureFrom,
    moveNotation: notation,
  };
};

const formatNotation = (move: Move, piece: Piece, isCapture: boolean) => {
  const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const from = `${cols[move.from.col]}${rows[move.from.row]}`;
  const to = `${cols[move.to.col]}${rows[move.to.row]}`;
  const sep = isCapture ? 'x' : '-';
  const suffix = piece.isKing ? ' (K)' : '';

  return `${from}${sep}${to}${suffix}`;
};

export const checkWinCondition = (
  board: BoardState,
  nextPlayer: Player,
  variant: GameVariant
): Player | 'draw' | null => {
  let whiteCount = 0;
  let blackCount = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p?.player === 'white') whiteCount++;
      if (p?.player === 'black') blackCount++;
    }
  }

  if (whiteCount === 0) return 'black';
  if (blackCount === 0) return 'white';

  const moves = getAllValidMoves(board, nextPlayer, null, variant);
  if (moves.length === 0) {
    return nextPlayer === 'white' ? 'black' : 'white';
  }

  return null;
};
