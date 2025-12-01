import React, { useState } from 'react';
import { Difficulty, GameMode, GameVariant, Player } from '../../types';
import { GLASS_THEME, soundEngine } from '../../constants';
import './GameInfo.css';

interface GameInfoProps {
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
  onShowHint: () => void;
  winChance: number | null;
}

const GameInfo: React.FC<GameInfoProps> = ({
  currentPlayer,
  winner,
  onNewGame,
  onExit,
  whiteCount,
  blackCount,
  gameMode,
  isAiThinking,
  undosRemaining,
  hintsRemaining,
  onUndo,
  canUndo,
  onShowHint,
  winChance
}) => {
  const ActionIcon = ({ name, count }: { name: string, count?: number | string }) => (
    <div className="flex flex-col items-center gap-1">
      {name === 'UNDO' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" /></svg>}
      {name === 'HINT' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a6 6 0 0 1 6 6c0 2.97-1.87 5.57-4.5 6.5V17a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-2.5C8.13 13.57 6.26 10.97 6.26 8a6 6 0 0 1 5.74-6z" /><path d="M9 21h6" /></svg>}
      {name === 'RESTART' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>}
      {name === 'MENU' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="18" x2="20" y2="18" /></svg>}
      {count !== undefined && <span className="text-[9px] font-bold opacity-60">{count}</span>}
    </div>
  );

  return (
    <>
      {/* Mobile/Desktop Combined Control Bar */}
      <div
        className={`
          ${GLASS_THEME.panel}
          w-full lg:w-96 rounded-t-3xl lg:rounded-3xl
          p-4 lg:p-6 flex flex-row lg:flex-col
          items-center lg:items-stretch justify-between lg:justify-start
          gap-4 lg:gap-8 border-b-0 lg:border-b
        `}
      >

        {/* Top Status (Win Chance / Turn) */}
        <div className="hidden lg:flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-100 tracking-tight leading-tight">DAMMA</h2>
            <div
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${currentPlayer === 'white'
                ? 'bg-white text-black border-white'
                : 'bg-black text-white border-slate-700'
                }`}
            >
              {winner ? 'GAME OVER' : `${currentPlayer} TURN`}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-2">
            <div className="flex-1 bg-white/5 rounded-xl p-3 flex items-center justify-between border border-white/5">
              <div className="w-3 h-3 rounded-full bg-slate-200 shadow-[0_0_8px_white]"></div>
              <span className="text-xl font-bold font-mono text-white">{whiteCount}</span>
            </div>
            <div className="flex-1 bg-black/40 rounded-xl p-3 flex items-center justify-between border border-white/5">
              <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-600"></div>
              <span className="text-xl font-bold font-mono text-slate-300">{blackCount}</span>
            </div>
          </div>

          {/* Win Chance */}
          {gameMode === 'PvAI' && winChance !== null && !winner && (
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                <span>Winning Chance</span>
                <span>{winChance}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${winChance}% ` }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons (Responsive Layout) */}
        <div className="w-full grid grid-cols-4 gap-2 lg:gap-3">

          {/* Undo */}
          <button
            onClick={onUndo}
            disabled={!canUndo || (gameMode === 'PvAI' && undosRemaining === 0) || !!winner}
            className="flex flex-col items-center justify-center py-3 lg:py-4 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
          >
            <ActionIcon name="UNDO" count={gameMode === 'PvAI' ? undosRemaining : undefined} />
          </button>

          {/* Hint */}
          <button
            onClick={onShowHint}
            disabled={!!winner || isAiThinking || (gameMode === 'PvAI' && currentPlayer === 'black') || (gameMode !== 'PvP' && hintsRemaining === 0)}
            className={`flex flex-col items-center justify-center py-3 lg:py-4 rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed border ${isAiThinking ? 'bg-indigo-500/20 border-indigo-500/50 animate-pulse' : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
          >
            <ActionIcon name="HINT" count={gameMode === 'PvP' ? '∞' : hintsRemaining} />
          </button>

          {/* Restart */}
          <button
            onClick={onNewGame}
            className="flex flex-col items-center justify-center py-3 lg:py-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-400 transition-all border border-amber-500/20"
          >
            <ActionIcon name="RESTART" />
          </button>

          {/* Menu */}
          <button
            onClick={onExit}
            className="flex flex-col items-center justify-center py-3 lg:py-4 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-slate-400 transition-all border border-white/5"
          >
            <ActionIcon name="MENU" />
          </button>

        </div>
      </div>
    </>
  );
};

export default GameInfo;
