import { BOARD_SIZE } from '../constants';
import { BoardState, Difficulty, GameVariant, Move, Player, Position } from '../types';
import { getAllValidMoves, performMove, checkWinCondition } from './damaLogic';

// --- AI CONFIGURATION ---
const INF = 1_000_000;
const MAX_TT_SIZE = 200_000; // cap TT to avoid unbounded memory

// Null-move
const NULL_MOVE_REDUCTION = 2;
const NULL_MOVE_MIN_DEPTH = 3;

class SearchTimeout extends Error {}

// --- NODE / TIME CONTROL (for mobile) ---
const NODE_CHECK_MASK = 127; // check every 128 nodes (cheap)
let nodesSearched = 0;
let nodeBudget = Infinity;

const shouldAbort = (startTime: number, timeLimit: number): boolean => {
  nodesSearched++;
  if ((nodesSearched & NODE_CHECK_MASK) !== 0) return false;

  // Node budget
  if (nodesSearched >= nodeBudget) return true;

  // Time budget
  if (timeLimit > 0 && Date.now() - startTime > timeLimit) return true;

  return false;
};

// --- EVAL WEIGHTS ---

interface EvalWeights {
  KING: number;
  MAN: number;
  MOBILITY: number;
  CENTER: number;
  PROMOTION_POTENTIAL: number;
  SIDE_SAFETY: number;
  TRAP_BONUS: number;
  SACRIFICE_BONUS: number;
  COMPLEXITY_BONUS: number;
  TRICKY_BONUS: number;
}

const DEFAULT_WEIGHTS: EvalWeights = {
  KING: 300,
  MAN: 100,
  MOBILITY: 15,
  CENTER: 10,
  PROMOTION_POTENTIAL: 25,
  SIDE_SAFETY: 10,
  TRAP_BONUS: 50,
  SACRIFICE_BONUS: 60,
  COMPLEXITY_BONUS: 20,
  TRICKY_BONUS: 30,
};

const EASY_WEIGHTS: EvalWeights = {
  KING: 150,
  MAN: 100,
  MOBILITY: 0,
  CENTER: 1,
  PROMOTION_POTENTIAL: 5,
  SIDE_SAFETY: 0,
  TRAP_BONUS: 0,
  SACRIFICE_BONUS: 0,
  COMPLEXITY_BONUS: 0,
  TRICKY_BONUS: 0,
};

const MEDIUM_WEIGHTS: EvalWeights = {
  ...DEFAULT_WEIGHTS,
  KING: 250,
  MOBILITY: 8,
  CENTER: 6,
};

const HARD_WEIGHTS: EvalWeights = {
  KING: 5000,
  MAN: 100,
  MOBILITY: 40,
  CENTER: 25,
  PROMOTION_POTENTIAL: 80,
  SIDE_SAFETY: 30,
  TRAP_BONUS: 150,
  SACRIFICE_BONUS: 120,
  COMPLEXITY_BONUS: 60,
  TRICKY_BONUS: 60,
};

// --- TABLES (same logic as your version) ---

// Transposition Table
const TT = new Map<
  string,
  { depth: number; score: number; flag: 'exact' | 'lower' | 'upper'; bestMove?: Move }
>();

// History Heuristic Table
const HistoryTable = new Map<string, number>();

// Killer Move Table: per ply, up to 2 killer moves (non-captures causing beta-cutoffs)
const KillerTable = new Map<number, [string | null, string | null]>();

// --- HELPERS ---

const hashBoard = (
  board: BoardState,
  player: Player,
  mustCaptureFrom: Position | null
): string => {
  let h = player + ':';

  if (mustCaptureFrom) {
    h += `M:${mustCaptureFrom.row},${mustCaptureFrom.col}:`;
  } else {
    h += 'M:-1,-1:';
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p) h += `${r},${c},${p.player},${p.isKing ? 'K' : 'M'}|`;
    }
  }
  return h;
};

const hashMove = (m: Move): string =>
  `${m.from.row},${m.from.col}-${m.to.row},${m.to.col}`;

const countPieces = (board: BoardState): number => {
  let n = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c]) n++;
    }
  }
  return n;
};

// --- EVALUATION ---

const evaluateMaterial = (board: BoardState, player: Player, w: EvalWeights): number => {
  let score = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = p.isKing ? w.KING : w.MAN;
      if (p.player === player) score += val;
      else score -= val;
    }
  }
  return score;
};

const evaluatePosition = (
  board: BoardState,
  player: Player,
  variant: GameVariant,
  w: EvalWeights
): number => {
  let score = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (!p) continue;

      // Center control
      if (c >= 2 && c <= 5 && r >= 2 && r <= 5) {
        const val = w.CENTER;
        score += p.player === player ? +val : -val;
      }

      // Side safety
      if (c === 0 || c === BOARD_SIZE - 1) {
        const val = w.SIDE_SAFETY;
        score += p.player === player ? +val : -val;
      }

      // Promotion potential
      if (!p.isKing) {
        const isWhitePiece = p.player === 'white';
        const advancement = isWhitePiece ? BOARD_SIZE - 1 - r : r;
        const base = advancement * 2;
        score += p.player === player ? +base : -base;

        if (isWhitePiece && r <= 2) {
          const val = w.PROMOTION_POTENTIAL;
          score += p.player === player ? +val : -val;
        }
        if (!isWhitePiece && r >= BOARD_SIZE - 3) {
          const val = w.PROMOTION_POTENTIAL;
          score += p.player === player ? +val : -val;
        }
      }
    }
  }

  return score;
};

const evaluateBoard = (
  board: BoardState,
  player: Player,
  variant: GameVariant,
  w: EvalWeights,
  currentDepth: number
): number => {
  let score = 0;

  // 1. Material
  const materialScore = evaluateMaterial(board, player, w);
  score += materialScore;

  // 2. Position
  score += evaluatePosition(board, player, variant, w);

  // 3. Mobility & Tactics (expensive) — only at shallower nodes
  if (
    currentDepth >= 0 &&
    (w.MOBILITY > 0 ||
      w.TRAP_BONUS > 0 ||
      w.COMPLEXITY_BONUS > 0 ||
      w.TRICKY_BONUS > 0 ||
      w.SACRIFICE_BONUS > 0)
  ) {
    const myMoves = getAllValidMoves(board, player, null, variant);
    const opp = player === 'white' ? 'black' : 'white';
    const opMoves = getAllValidMoves(board, opp, null, variant);

    if (w.MOBILITY > 0) {
      score += (myMoves.length - opMoves.length) * w.MOBILITY;
    }

    // Sacrifice logic
    if (w.SACRIFICE_BONUS > 0) {
      if (materialScore < 0 && myMoves.length > opMoves.length + 2) {
        score += w.SACRIFICE_BONUS;
      }
    }

    if (w.TRAP_BONUS > 0 || w.COMPLEXITY_BONUS > 0 || w.TRICKY_BONUS > 0) {
      const myCaps = myMoves.filter(m => m.isCapture).length;
      const opCaps = opMoves.filter(m => m.isCapture).length;

      score += (myCaps - opCaps) * w.TRAP_BONUS;

      const totalCaps = myCaps + opCaps;
      score += totalCaps * w.COMPLEXITY_BONUS;

      if (myCaps >= 2) {
        score += w.TRICKY_BONUS;
      }
    }
  }

  return score;
};

// --- QUIESCENCE SEARCH (separate, lighter) ---

const qsearch = (
  board: BoardState,
  alpha: number,
  beta: number,
  player: Player,
  mustCaptureFrom: Position | null,
  variant: GameVariant,
  startTime: number,
  weights: EvalWeights,
  timeLimit: number
): number => {
  if (shouldAbort(startTime, timeLimit)) {
    throw new SearchTimeout();
  }

  // Check win/draw at quiescence too
  const winState = checkWinCondition(board, player, variant);
  if (winState) {
    if (winState === player) return INF;
    if (winState === 'draw') return 0;
    return -INF;
  }

  let standPat = evaluateBoard(board, player, variant, weights, 0);

  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  // Only captures
  const moves = getAllValidMoves(board, player, mustCaptureFrom, variant).filter(
    m => m.isCapture
  );
  if (moves.length === 0) return alpha;

  const nextPlayer = player === 'white' ? 'black' : 'white';

  // Simple ordering: promotions + history
  moves.sort((a, b) => {
    if (a.promotes && !b.promotes) return -1;
    if (!a.promotes && b.promotes) return 1;
    const ha = HistoryTable.get(hashMove(a)) || 0;
    const hb = HistoryTable.get(hashMove(b)) || 0;
    return hb - ha;
  });

  for (const move of moves) {
    if (shouldAbort(startTime, timeLimit)) {
      throw new SearchTimeout();
    }

    const res = performMove(board, move, player, variant);
    let val: number;

    if (res.nextPlayer === player) {
      // multi-jump
      val = -qsearch(
        res.nextBoard,
        -beta,
        -alpha,
        player,
        res.nextMustCaptureFrom,
        variant,
        startTime,
        weights,
        timeLimit
      );
    } else {
      val = -qsearch(
        res.nextBoard,
        -beta,
        -alpha,
        nextPlayer,
        null,
        variant,
        startTime,
        weights,
        timeLimit
      );
    }

    if (val >= beta) return beta;
    if (val > alpha) alpha = val;
  }

  return alpha;
};

// --- SEARCH ENGINE ---
// Negamax with:
// - Alpha-beta pruning
// - Transposition table
// - History heuristic
// - Killer moves
// - Null-move pruning
// - PVS + LMR
// - Bounded quiescence
const negamax = (
  board: BoardState,
  depth: number,
  ply: number,
  alpha: number,
  beta: number,
  player: Player,
  mustCaptureFrom: Position | null,
  variant: GameVariant,
  startTime: number,
  weights: EvalWeights,
  timeLimit: number
): number => {
  if (shouldAbort(startTime, timeLimit)) {
    throw new SearchTimeout();
  }

  // Stack / quiescence depth safety
  if (depth < -12) {
    return evaluateBoard(board, player, variant, weights, depth);
  }

  const alphaOrig = alpha;
  const betaOrig = beta;
  const h = hashBoard(board, player, mustCaptureFrom);
  const ttEntry = TT.get(h);

  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === 'exact') return ttEntry.score;
    if (ttEntry.flag === 'lower') alpha = Math.max(alpha, ttEntry.score);
    if (ttEntry.flag === 'upper') beta = Math.min(beta, ttEntry.score);
    if (alpha >= beta) return ttEntry.score;
  }

  const winState = checkWinCondition(board, player, variant);
  if (winState) {
    if (winState === player) return INF + depth;
    if (winState === 'draw') return 0;
    return -(INF + depth);
  }

  // Horizon → go to qsearch
  if (depth <= 0) {
    return qsearch(
      board,
      alpha,
      beta,
      player,
      mustCaptureFrom,
      variant,
      startTime,
      weights,
      timeLimit
    );
  }

  // Null-move pruning (skip only if in a "normal" position)
  if (depth >= NULL_MOVE_MIN_DEPTH && mustCaptureFrom === null && depth > 0) {
    const opp = player === 'white' ? 'black' : 'white';
    const nullScore = -negamax(
      board,
      depth - 1 - NULL_MOVE_REDUCTION,
      ply + 1,
      -beta,
      -beta + 1,
      opp,
      null,
      variant,
      startTime,
      weights,
      timeLimit
    );
    if (nullScore >= beta) {
      return beta;
    }
  }

  let moves = getAllValidMoves(board, player, mustCaptureFrom, variant);

  // If no legal moves: static eval
  if (moves.length === 0) {
    return evaluateBoard(board, player, variant, weights, depth);
  }

  const ttBestKey = ttEntry && ttEntry.bestMove ? hashMove(ttEntry.bestMove) : null;
  const killerPair = KillerTable.get(ply) || [null, null];

  // Move ordering with TT best move, captures, promotions, killers, history
  moves.sort((a, b) => {
    const ha = hashMove(a);
    const hb = hashMove(b);

    let sa = 0;
    let sb = 0;

    if (ttBestKey) {
      if (ha === ttBestKey) sa += 1_000_000_000;
      if (hb === ttBestKey) sb += 1_000_000_000;
    }

    if (a.isCapture) sa += 500_000_000;
    if (b.isCapture) sb += 500_000_000;

    if (a.promotes) sa += 200_000_000;
    if (b.promotes) sb += 200_000_000;

    if (ha === killerPair[0]) sa += 100_000_000;
    else if (ha === killerPair[1]) sa += 80_000_000;

    if (hb === killerPair[0]) sb += 100_000_000;
    else if (hb === killerPair[1]) sb += 80_000_000;

    sa += HistoryTable.get(ha) || 0;
    sb += HistoryTable.get(hb) || 0;

    return sb - sa;
  });

  let bestValue = -INF;
  let bestMove: Move | null = null;
  const nextPlayer = player === 'white' ? 'black' : 'white';

  let moveIndex = 0;

  for (const move of moves) {
    if (shouldAbort(startTime, timeLimit)) {
      throw new SearchTimeout();
    }

    const res = performMove(board, move, player, variant);
    const isFirstMove = moveIndex === 0;
    const isQuiet = !move.isCapture && !move.promotes;

    // LMR: reduce depth for late quiet moves
    let reduction = 0;
    if (!isFirstMove && depth >= 3 && isQuiet && moveIndex >= 3) {
      reduction = 1;
    }

    let value: number;

    // Same player continues (multi-jump)
    if (res.nextPlayer === player) {
      const fullDepth = depth;
      const reducedDepth = fullDepth - reduction;

      if (isFirstMove) {
        // Full-window search for first move (PVS)
        value = negamax(
          res.nextBoard,
          fullDepth,
          ply + 1,
          alpha,
          beta,
          player,
          res.nextMustCaptureFrom,
          variant,
          startTime,
          weights,
          timeLimit
        );
      } else {
        // PVS: try narrow window first with possible LMR
        value = negamax(
          res.nextBoard,
          reducedDepth,
          ply + 1,
          alpha,
          alpha + 1,
          player,
          res.nextMustCaptureFrom,
          variant,
          startTime,
          weights,
          timeLimit
        );

        if (value > alpha) {
          value = negamax(
            res.nextBoard,
            fullDepth,
            ply + 1,
            alpha,
            beta,
            player,
            res.nextMustCaptureFrom,
            variant,
            startTime,
            weights,
            timeLimit
          );
        }
      }
    } else {
      // Turn switches to opponent
      const fullDepth = depth - 1;
      const reducedDepth = fullDepth - reduction;

      if (isFirstMove) {
        value = -negamax(
          res.nextBoard,
          fullDepth,
          ply + 1,
          -beta,
          -alpha,
          nextPlayer,
          null,
          variant,
          startTime,
          weights,
          timeLimit
        );
      } else {
        value = -negamax(
          res.nextBoard,
          reducedDepth,
          ply + 1,
          -(alpha + 1),
          -alpha,
          nextPlayer,
          null,
          variant,
          startTime,
          weights,
          timeLimit
        );

        if (value > alpha) {
          value = -negamax(
            res.nextBoard,
            fullDepth,
            ply + 1,
            -beta,
            -alpha,
            nextPlayer,
            null,
            variant,
            startTime,
            weights,
            timeLimit
          );
        }
      }
    }

    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }

    if (value > alpha) {
      alpha = value;
    }

    // Beta cutoff
    if (alpha >= beta) {
      const mh = hashMove(move);
      const d = Math.max(depth, 1);
      HistoryTable.set(mh, (HistoryTable.get(mh) || 0) + d * d);

      if (isQuiet && depth > 0) {
        const killers = KillerTable.get(ply) || [null, null];
        if (killers[0] !== mh) {
          killers[1] = killers[0];
          killers[0] = mh;
        }
        KillerTable.set(ply, killers);
      }

      break;
    }

    moveIndex++;
  }

  if (bestValue === -INF) {
    return evaluateBoard(board, player, variant, weights, depth);
  }

  if (depth > 0) {
    let flag: 'exact' | 'lower' | 'upper' = 'exact';
    if (bestValue <= alphaOrig) flag = 'upper';
    else if (bestValue >= betaOrig) flag = 'lower';

    TT.set(h, { depth, score: bestValue, flag, bestMove: bestMove || undefined });

    if (TT.size > MAX_TT_SIZE) {
      TT.clear(); // simple but safe
    }
  }

  return bestValue;
};

// --- ROOT SEARCH ---

export const getBestMove = (
  board: BoardState,
  player: Player,
  mustCaptureFrom: Position | null,
  variant: GameVariant,
  difficulty: Difficulty | 'hint'
): Move | null => {
  const moves = getAllValidMoves(board, player, mustCaptureFrom, variant);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  let weights = DEFAULT_WEIGHTS;
  let maxDepth = 4;
  let randomChance = 0;
  let timeLimit = 600;      // ms
  let maxNodes = 15000;     // node budget per move

  switch (difficulty) {
    case 'easy':
      weights = EASY_WEIGHTS;
      maxDepth = 2;
      randomChance = 0.55;
      timeLimit = 250;
      maxNodes = 3000;
      break;
    case 'medium':
      weights = MEDIUM_WEIGHTS;
      maxDepth = 4;
      randomChance = 0.02;
      timeLimit = 450;
      maxNodes = 8000;
      break;
    case 'hard':
      weights = HARD_WEIGHTS;
      maxDepth = 7;   // still strong, but mobile-safe
      randomChance = 0;
      timeLimit = 650;
      maxNodes = 16000;
      break;
    case 'hint':
      weights = HARD_WEIGHTS;
      maxDepth = 9;   // deeper, but still bounded
      randomChance = 0;
      timeLimit = 900;
      maxNodes = 24000;
      break;
  }

  // Random blunders for easier levels
  if (Math.random() < randomChance) {
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex];
  }

  TT.clear();
  HistoryTable.clear();
  KillerTable.clear();
  nodesSearched = 0;
  nodeBudget = maxNodes;

  const startTime = Date.now();
  let bestGlobalMove: Move | null = moves[0];

  // Root ordering: captures first
  moves.sort((a, b) => {
    if (a.isCapture && !b.isCapture) return -1;
    if (!a.isCapture && b.isCapture) return 1;
    return 0;
  });

  const startDepth = difficulty === 'hard' || difficulty === 'hint' ? 2 : 1;

  for (let d = startDepth; d <= maxDepth; d++) {
    try {
      let bestVal = -INF;
      let currentBest: Move | null = null;

      for (const move of moves) {
        if (shouldAbort(startTime, timeLimit)) {
          throw new SearchTimeout();
        }

        const res = performMove(board, move, player, variant);

        let val: number;
        if (res.nextPlayer === player) {
          val = negamax(
            res.nextBoard,
            d,
            1, // ply
            -INF,
            INF,
            player,
            res.nextMustCaptureFrom,
            variant,
            startTime,
            weights,
            timeLimit
          );
        } else {
          val = -negamax(
            res.nextBoard,
            d - 1,
            1, // ply
            -INF,
            INF,
            player === 'white' ? 'black' : 'white',
            null,
            variant,
            startTime,
            weights,
            timeLimit
          );
        }

        if (val > bestVal) {
          bestVal = val;
          currentBest = move;
        }
      }

      if (currentBest) {
        bestGlobalMove = currentBest;

        // PV reordering for next depth
        const idx = moves.indexOf(currentBest);
        if (idx > 0) {
          moves.splice(idx, 1);
          moves.unshift(currentBest);
        }
      }
    } catch (e) {
      if (e instanceof SearchTimeout) {
        // hard cap hit: return best from last completed depth
        break;
      } else {
        throw e;
      }
    }
  }

  return bestGlobalMove;
};

// --- WIN PROBABILITY HELPER ---
export const getWinProbability = (
  board: BoardState,
  player: Player,
  variant: GameVariant
): number => {
  const score = evaluateBoard(board, player, variant, DEFAULT_WEIGHTS, 0);
  const k = 0.005;
  const probability = 1 / (1 + Math.exp(-k * score));
  return Math.round(probability * 100);
};
