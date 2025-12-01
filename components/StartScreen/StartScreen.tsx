/*
 * StartScreen Component
 * Designed by alaeTR
 */
import React, { useState } from 'react';
import { Difficulty, GameMode, GameVariant, BoardSetup } from '../../types';
import { GLASS_THEME, soundEngine } from '../../constants';
import './StartScreen.css';

interface StartScreenProps {
  onStart: (config: { variant: GameVariant; mode: GameMode; difficulty: Difficulty; setup: BoardSetup }) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [variant, setVariant] = useState<GameVariant>('turkish');
  const [mode, setMode] = useState<GameMode>('PvAI');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [setup, setSetup] = useState<BoardSetup>('standard');

  const handleStart = () => {
    onStart({ variant, mode, difficulty, setup });
  };

  const playClick = () => soundEngine.playClick();

  return (
    <div className={`fixed inset-0 ${GLASS_THEME.bgGradient} overflow-y-auto font-sans`}>

      <div className="min-h-full w-full flex flex-col gap-6 p-6 md:p-8 justify-center items-center py-12">

        {/* Header */}
        <div className="text-center space-y-2 mb-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 drop-shadow-lg">
            DAMMA
          </h1>
          <p className={`text-xs md:text-sm font-medium tracking-widest uppercase ${GLASS_THEME.textMuted}`}>
            Master the Board
          </p>
        </div>

        {/* Controls Container */}
        <div className="w-full max-w-md space-y-5">

          {/* Game Mode */}
          <div className="space-y-3">
            <label className={`text-xs font-bold uppercase tracking-wider ${GLASS_THEME.textMuted} ml-1`}>Game Mode</label>
            <div className="grid grid-cols-2 gap-3">
              {(['PvAI', 'PvP'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); playClick(); }}
                  className={`
                    py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200
                    ${mode === m
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  {m === 'PvAI' ? 'VS AI' : 'VS PLAYER'}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty (Only for PvAI) */}
          <div className={`space-y-3 transition-all duration-300 ${mode === 'PvAI' ? 'opacity-100 h-auto' : 'opacity-50 grayscale pointer-events-none h-auto'}`}>
            <label className={`text-xs font-bold uppercase tracking-wider ${GLASS_THEME.textMuted} ml-1`}>Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => { setDifficulty(d); playClick(); }}
                  className={`
                     py-2 px-2 rounded-lg text-xs font-bold capitalize transition-all
                     ${difficulty === d
                      ? 'bg-white text-black shadow-lg scale-105'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'}
                   `}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Variant Selector */}
          <div className="space-y-3">
            <label className={`text-xs font-bold uppercase tracking-wider ${GLASS_THEME.textMuted} ml-1`}>Rules Variant</label>
            <div className="flex flex-col gap-2">
              {(['turkish', 'spanish', 'moroccan'] as GameVariant[]).map((v) => {
                const displayName = v === 'moroccan' ? 'Free Mode' : v === 'spanish' ? 'Andalus' : 'Turkish';
                return (
                  <button
                    key={v}
                    onClick={() => { setVariant(v); playClick(); }}
                    className={`
                    w-full flex items-center justify-between p-3 rounded-xl border transition-all
                    ${variant === v
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-white shadow-md'
                        : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10'}
                  `}
                  >
                    <span className="font-bold">{displayName}</span>
                    {variant === v && <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]"></div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Board Setup (Only for Turkish) */}
          {variant === 'turkish' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <label className={`text-xs font-bold uppercase tracking-wider ${GLASS_THEME.textMuted} ml-1`}>Board Setup</label>
              <div className="flex gap-2 bg-black/20 p-1 rounded-xl">
                {(['standard', 'diagonal'] as BoardSetup[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSetup(s); playClick(); }}
                    className={`
                                flex-1 py-2 rounded-lg text-xs font-bold transition-all
                                ${setup === s ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}
                            `}
                  >
                    {s === 'standard' ? 'Classic Rows' : 'Diagonal'}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="
            w-full max-w-md py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 
            text-white font-black tracking-widest text-base md:text-lg shadow-xl shadow-indigo-500/20
            hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-300 mt-2
          "
        >
          START GAME
        </button>

        {/* Developer Credit - Added by alaeTR */}
        <div className="mt-8 text-center">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            Made with ❤️ by <span className="text-indigo-500">alaeTR</span>
          </p>
        </div>

      </div>

    </div>
  );
};

export default StartScreen;
