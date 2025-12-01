import React from 'react';
import { BoardState, Move, Piece, Position } from '../../types';
import PieceComponent from '../Piece/Piece';
import { BOARD_SIZE, GLASS_THEME, soundEngine } from '../../constants';
import './Board.css';

interface BoardProps {
  board: BoardState;
  validMoves: Move[];
  selectedPos: Position | null;
  lastMove: { from: Position; to: Position } | null;
  onSquareClick: (pos: Position) => void;
  hintMove?: Move | null;
  showError?: boolean;
}

const Board: React.FC<BoardProps> = ({
  board,
  validMoves,
  selectedPos,
  lastMove,
  onSquareClick,
  hintMove,
  showError
}) => {

  // Filter valid moves
  const displayedMoves = selectedPos
    ? validMoves.filter(m => m.from.row === selectedPos.row && m.from.col === selectedPos.col)
    : [];

  const validTargetSet = new Set(displayedMoves.map(m => `${m.to.row},${m.to.col}`));

  const isCaptureTarget = (r: number, c: number) => {
    return displayedMoves.some(m => m.to.row === r && m.to.col === c && m.isCapture);
  };

  const renderSquare = (r: number, c: number) => {
    const piece = board[r][c];
    const isSelected = selectedPos?.row === r && selectedPos?.col === c;
    const isValidTarget = validTargetSet.has(`${r},${c}`);
    const isCapture = isValidTarget && isCaptureTarget(r, c);

    // Last Move Highlight
    const isLastMove = (lastMove?.from.row === r && lastMove.from.col === c) || (lastMove?.to.row === r && lastMove.to.col === c);

    // Hint
    const isHintSource = hintMove?.from.row === r && hintMove.from.col === c;
    const isHintDest = hintMove?.to.row === r && hintMove.to.col === c;

    // Error (Mandatory move required elsewhere)
    const isMandatorySource = showError && validMoves.some(m => m.from.row === r && m.from.col === c);

    // Base Color
    const isDark = (r + c) % 2 === 1;
    const bgClass = isDark ? GLASS_THEME.boardSquareDark : GLASS_THEME.boardSquareLight;

    return (
      <div
        key={`${r}-${c}`}
        onClick={() => onSquareClick({ row: r, col: c })}
        className={`
          relative w-full pb-[100%] cursor-pointer select-none
          ${bgClass}
          transition-colors duration-300
        `}
      >
        <div className="absolute inset-0 flex items-center justify-center">

          {/* Last Move Indicator (Subtle Flash) */}
          {isLastMove && <div className="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>}

          {/* Selected Highlight */}
          {isSelected && <div className="absolute inset-0 border-2 border-indigo-400/50 bg-indigo-500/10 z-0"></div>}

          {/* Mandatory Error Ping */}
          {isMandatorySource && (
            <div className="absolute inset-0 border-2 border-rose-500 rounded-sm animate-ping opacity-75 z-20 pointer-events-none"></div>
          )}

          {/* Hint Highlights */}
          {isHintSource && !isMandatorySource && <div className="absolute inset-0 border-2 border-emerald-400 rounded-sm animate-pulse z-0"></div>}
          {isHintDest && <div className="absolute w-3 h-3 rounded-full bg-emerald-400 animate-ping z-0"></div>}

          {/* Valid Move Dots */}
          {isValidTarget && (
            <div className={`
                absolute rounded-full z-0 shadow-sm
                ${isCapture
                ? 'w-10 h-10 border-4 border-rose-500/30 animate-pulse'
                : 'w-3 h-3 bg-indigo-500/50'}
              `}></div>
          )}

          {/* Piece */}
          {piece && (
            <div className="w-full h-full flex items-center justify-center z-10 p-[12%]">
              <PieceComponent piece={piece} isSelected={isSelected} />
            </div>
          )}
        </div>
      </div>
    );
  };

  const grid = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      grid.push(renderSquare(r, c));
    }
  }

  return (
    <div className={`w-full aspect-square p-2 md:p-3 rounded-xl shadow-2xl ${GLASS_THEME.boardBase} border border-slate-700`}>
      <div className="w-full h-full grid grid-cols-8 rounded-lg overflow-hidden ring-1 ring-slate-700/50">
        {grid}
      </div>
    </div>
  );
};

export default Board;
