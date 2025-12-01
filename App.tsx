/*
 * DAMMA - Web Desktop Version
 * Customized and maintained by alaeTR
 * 
 * This file handles the main game loop and layout.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Board from './components/Board/Board';
import GameInfo from './components/GameInfo/GameInfo';
import StartScreen from './components/StartScreen/StartScreen';
import { createInitialBoard, getAllValidMoves, performMove, checkWinCondition } from './services/damaLogic';
import { getBestMove, getWinProbability } from './services/aiLogic';
import { BoardState, Difficulty, GameMode, GameState, GameVariant, Move, Position, AppView, BoardSetup } from './types';
import { INITIAL_HINTS, INITIAL_UNDOS, GLASS_THEME, soundEngine } from './constants';
import './app.css';

const App: React.FC = () => {
  const [appView, setAppView] = useState<AppView>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('PvAI');
  const [gameVariant, setGameVariant] = useState<GameVariant>('turkish');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [boardSetup, setBoardSetup] = useState<BoardSetup>('standard');
  const [playerNames, setPlayerNames] = useState({ white: 'Player 1', black: 'Player 2' });

  const [gameState, setGameState] = useState<GameState>({
    board: [],
    currentPlayer: 'white',
    selectedPos: null,
    validMoves: [],
    winner: null,
    mustCaptureFrom: null,
    history: [],
    variant: 'turkish',
    hintMove: null
  });

  const [historyStack, setHistoryStack] = useState<GameState[]>([]);
  const [undosRemaining, setUndosRemaining] = useState(INITIAL_UNDOS);
  const [hintsRemaining, setHintsRemaining] = useState(INITIAL_HINTS);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showError, setShowError] = useState(false);
  const [winChance, setWinChance] = useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const winTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Piece Counts
  const countPieces = (board: BoardState) => {
    let w = 0, b = 0;
    if (board && board.length > 0) {
      board.flat().forEach(p => {
        if (p?.player === 'white') w++;
        if (p?.player === 'black') b++;
      });
    }
    return { w, b };
  };
  const { w: whiteCount, b: blackCount } = countPieces(gameState.board);

  // Win Chance Update
  useEffect(() => {
    if (gameMode === 'PvAI' && !gameState.winner && gameState.board.length > 0) {
      const chance = getWinProbability(gameState.board, 'white', gameState.variant);
      setWinChance(chance);
    } else {
      setWinChance(null);
    }
  }, [gameState.board, gameMode, gameState.variant, gameState.winner]);

  // Start Game
  const handleStartGame = (config: { variant: GameVariant; mode: GameMode; difficulty: Difficulty; setup: BoardSetup }) => {
    soundEngine.playClick();
    setGameVariant(config.variant);
    setGameMode(config.mode);
    setDifficulty(config.difficulty);
    setBoardSetup(config.setup);

    // Set Names
    if (config.mode === 'PvAI') {
      setPlayerNames({ white: 'You', black: `AI (${config.difficulty})` });
    } else {
      setPlayerNames({ white: 'Player 1', black: 'Player 2' });
    }

    const newBoard = createInitialBoard(config.variant, config.setup);
    const initialMoves = getAllValidMoves(newBoard, 'white', null, config.variant);

    setGameState({
      board: newBoard,
      currentPlayer: 'white',
      selectedPos: null,
      validMoves: initialMoves,
      winner: null,
      mustCaptureFrom: null,
      history: [],
      variant: config.variant,
      hintMove: null
    });

    setHistoryStack([]);
    setUndosRemaining(INITIAL_UNDOS);
    setHintsRemaining(INITIAL_HINTS);
    setLastMove(null);
    setIsAiThinking(false);
    setShowError(false);
    setWinChance(50);
    setAppView('game');
  };

  const handleExitGame = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    soundEngine.playClick();
    setShowExitConfirm(false);
    setAppView('menu');
    if (winTimeoutRef.current) clearTimeout(winTimeoutRef.current);
  };

  const handleRestartMatch = useCallback(() => {
    setShowRestartConfirm(true);
  }, []);

  const confirmRestart = useCallback(() => {
    soundEngine.playClick();
    setShowRestartConfirm(false);
    if (winTimeoutRef.current) clearTimeout(winTimeoutRef.current);
    const newBoard = createInitialBoard(gameVariant, boardSetup);
    const initialMoves = getAllValidMoves(newBoard, 'white', null, gameVariant);
    setGameState({
      board: newBoard,
      currentPlayer: 'white',
      selectedPos: null,
      validMoves: initialMoves,
      winner: null,
      mustCaptureFrom: null,
      history: [],
      variant: gameVariant,
      hintMove: null
    });
    setHistoryStack([]);
    setUndosRemaining(INITIAL_UNDOS);
    setHintsRemaining(INITIAL_HINTS);
    setLastMove(null);
    setIsAiThinking(false);
    setShowError(false);
    setWinChance(50);
  }, [gameVariant, boardSetup]);

  // Execute Move
  const executeMove = (move: Move, isAiMove: boolean = false) => {
    if (gameMode === 'PvP' || (gameMode === 'PvAI' && !isAiMove)) {
      setHistoryStack(prev => [...prev, gameState]);
    }

    // Sound
    if (move.isCapture) soundEngine.playCapture();
    else soundEngine.playMove();

    const result = performMove(gameState.board, move, gameState.currentPlayer, gameState.variant);
    const winState = checkWinCondition(result.nextBoard, result.nextPlayer, gameState.variant);

    setLastMove({ from: move.from, to: move.to });

    const nextValidMoves = (!winState)
      ? getAllValidMoves(result.nextBoard, result.nextPlayer, result.nextMustCaptureFrom, gameState.variant)
      : [];

    setGameState(prev => ({
      ...prev,
      board: result.nextBoard,
      currentPlayer: result.nextPlayer,
      mustCaptureFrom: result.nextMustCaptureFrom,
      selectedPos: result.nextMustCaptureFrom,
      validMoves: nextValidMoves,
      history: [...prev.history, result.moveNotation],
      hintMove: null,
      winner: null
    }));

    if (winState) {
      soundEngine.playWin();
      if (winTimeoutRef.current) clearTimeout(winTimeoutRef.current);
      winTimeoutRef.current = setTimeout(() => {
        setGameState(prev => ({ ...prev, winner: winState }));
      }, 700);
    }
  };

  const handleUndo = () => {
    if (historyStack.length === 0 || isAiThinking) return;
    if (gameMode === 'PvAI' && undosRemaining <= 0) return;
    if (winTimeoutRef.current) clearTimeout(winTimeoutRef.current);

    soundEngine.playClick();
    const previousState = historyStack[historyStack.length - 1];
    const newStack = historyStack.slice(0, -1);

    setGameState(previousState);
    setHistoryStack(newStack);

    if (gameMode === 'PvAI') setUndosRemaining(prev => prev - 1);
    setLastMove(null);
    setShowError(false);
  };

  const handleShowHint = () => {
    const isUnlimited = gameMode === 'PvP';
    if (isAiThinking || gameState.winner || (!isUnlimited && hintsRemaining <= 0)) return;
    soundEngine.playClick();
    setIsAiThinking(true);
    setTimeout(() => {
      const bestMove = getBestMove(gameState.board, gameState.currentPlayer, gameState.mustCaptureFrom, gameState.variant, 'hint');
      if (bestMove) {
        setGameState(prev => ({ ...prev, hintMove: bestMove }));
        if (!isUnlimited) {
          setHintsRemaining(prev => prev - 1);
        }
      }
      setIsAiThinking(false);
    }, 50);
  };

  // AI Turn
  useEffect(() => {
    if (appView === 'game' && gameMode === 'PvAI' && gameState.currentPlayer === 'black' && !gameState.winner) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        const bestMove = getBestMove(gameState.board, 'black', gameState.mustCaptureFrom, gameState.variant, difficulty);
        if (bestMove) executeMove(bestMove, true);
        setIsAiThinking(false);
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayer, gameState.winner, gameMode, gameState.board, gameState.mustCaptureFrom, appView]);

  const handleSquareClick = useCallback((pos: Position) => {
    if (gameState.winner || isAiThinking) return;
    if (gameMode === 'PvAI' && gameState.currentPlayer === 'black') return;

    const clickedPiece = gameState.board[pos.row][pos.col];
    const isCurrentPlayerPiece = clickedPiece?.player === gameState.currentPlayer;

    // Move
    const move = gameState.validMoves.find(
      m => m.from.row === gameState.selectedPos?.row && m.from.col === gameState.selectedPos?.col && m.to.row === pos.row && m.to.col === pos.col
    );

    if (move) {
      executeMove(move, false);
      setShowError(false);
      return;
    }

    // Select
    if (isCurrentPlayerPiece) {
      if (gameState.mustCaptureFrom) {
        if (pos.row !== gameState.mustCaptureFrom.row || pos.col !== gameState.mustCaptureFrom.col) {
          soundEngine.playClick(); // Error sound could be added
          setShowError(true);
          setTimeout(() => setShowError(false), 600);
          return;
        }
      }
      const movesForSelected = gameState.validMoves.filter(m => m.from.row === pos.row && m.from.col === pos.col);
      if (movesForSelected.length > 0) {
        soundEngine.playClick();
        setGameState(prev => ({ ...prev, selectedPos: pos }));
        setShowError(false);
      } else {
        const isMandatory = gameState.variant !== 'moroccan';
        const hasCaptures = gameState.validMoves.some(m => m.isCapture);
        if (isMandatory && hasCaptures) {
          setShowError(true);
          setTimeout(() => setShowError(false), 600);
        }
        if (!gameState.mustCaptureFrom) setGameState(prev => ({ ...prev, selectedPos: null }));
      }
    } else {
      if (!gameState.mustCaptureFrom) setGameState(prev => ({ ...prev, selectedPos: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, isAiThinking, gameMode]);

  // Win Screen
  const winContent = gameState.winner ? (
    gameMode === 'PvAI' ? (gameState.winner === 'white' ? 'VICTORY' : 'DEFEAT') : (gameState.winner === 'white' ? 'WHITE WINS' : 'BLACK WINS')
  ) : '';

  if (appView === 'menu') return <StartScreen onStart={handleStartGame} />;

  return (
    <div className={`fixed inset-0 flex flex-col items-center ${GLASS_THEME.bgGradient} font-sans overflow-hidden`}>

      {/* --- MOBILE TOP BAR (Stats & Players) --- */}
      <div className="lg:hidden w-full px-4 pt-4 pb-2 flex flex-col gap-3 border-b border-white/5 bg-black/20 z-50">

        {/* Player Names & Turn Indicator */}
        <div className="flex items-center justify-between w-full">
          {/* Player 1 (White) */}
          <div className={`flex flex-col items-start transition-opacity duration-300 ${gameState.currentPlayer === 'white' ? 'opacity-100' : 'opacity-50'}`}>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">White</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">{playerNames.white}</span>
              <div className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-white">{whiteCount}</div>
            </div>
          </div>

          {/* VS Badge */}
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full mb-1 ${gameState.currentPlayer === 'white' ? 'bg-white shadow-[0_0_10px_white]' : 'bg-indigo-500 shadow-[0_0_10px_indigo]'}`}></div>
            <span className="text-[10px] font-bold text-slate-500">VS</span>
          </div>

          {/* Player 2 (Black) */}
          <div className={`flex flex-col items-end transition-opacity duration-300 ${gameState.currentPlayer === 'black' ? 'opacity-100' : 'opacity-50'}`}>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Black</span>
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-300">{blackCount}</div>
              <span className="text-sm font-black text-white">{playerNames.black}</span>
            </div>
          </div>
        </div>

        {/* Win Chance Bar */}
        {gameMode === 'PvAI' && winChance !== null && (
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-white transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
              style={{ width: `${winChance}%` }}
            ></div>
            <div
              className="h-full bg-indigo-600 transition-all duration-1000 ease-out"
              style={{ width: `${100 - winChance}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* --- MAIN GAME AREA --- */}
      <div className="flex-1 w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center lg:gap-12 p-4 lg:p-8 relative">

        {/* Board Container */}
        <div className="w-full max-w-[90vw] sm:max-w-[400px] lg:max-w-[550px] aspect-square flex-shrink-0 relative z-10 -translate-y-2 lg:-translate-y-4">
          <Board
            board={gameState.board}
            validMoves={gameState.validMoves}
            selectedPos={gameState.selectedPos}
            onSquareClick={handleSquareClick}
            lastMove={lastMove}
            hintMove={gameState.hintMove}
            showError={showError}
          />

          {/* Winner Overlay */}
          {gameState.winner && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 rounded-xl animate-in fade-in duration-500">
              <div className="text-center transform scale-110">
                <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] mb-6 tracking-tighter">
                  {winContent}
                </h2>
                <button
                  onClick={confirmRestart}
                  className="px-8 py-3 bg-white text-black font-black tracking-widest rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-all"
                >
                  PLAY AGAIN
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Sidebar (Hidden on Mobile) */}
        <div className="hidden lg:block w-full lg:w-auto mt-4 lg:mt-0 flex justify-center">
          <GameInfo
            currentPlayer={gameState.currentPlayer}
            winner={gameState.winner}
            history={gameState.history}
            onNewGame={handleRestartMatch}
            onExit={handleExitGame}
            whiteCount={whiteCount}
            blackCount={blackCount}
            gameMode={gameMode}
            isAiThinking={isAiThinking}
            undosRemaining={undosRemaining}
            hintsRemaining={hintsRemaining}
            onUndo={handleUndo}
            canUndo={historyStack.length > 0}
            gameVariant={gameVariant}
            difficulty={difficulty}
            onShowHint={handleShowHint}
            winChance={winChance}
          />
          
          {/* Developer Credit - Added by alaeTR */}
          <div className="absolute bottom-4 left-0 right-0 text-center opacity-50 hover:opacity-100 transition-opacity">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Developed by <span className="text-indigo-400">alaeTR</span>
            </p>
          </div>
        </div>
      </div>

      {/* --- MOBILE BOTTOM BAR (Controls) --- */}
      <div className="lg:hidden w-full px-4 py-3 bg-black/40 border-t border-white/5 flex items-center justify-around pb-6">

        {/* Exit */}
        <button
          onClick={handleExitGame}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors active:scale-90"
        >
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
            <span className="text-xs font-bold">✕</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider">Exit</span>
        </button>

        {/* Restart */}
        <button
          onClick={handleRestartMatch}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors active:scale-90"
        >
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider">Restart</span>
        </button>

        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={historyStack.length === 0 || isAiThinking || (gameMode === 'PvAI' && undosRemaining <= 0)}
          className="flex flex-col items-center gap-1 disabled:opacity-30 transition-all active:scale-90"
        >
          <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-white">Undo {gameMode === 'PvAI' && `(${undosRemaining})`}</span>
        </button>

        {/* Hint */}
        <button
          onClick={handleShowHint}
          disabled={isAiThinking || (gameMode !== 'PvP' && hintsRemaining <= 0)}
          className="flex flex-col items-center gap-1 disabled:opacity-30 transition-all active:scale-90"
        >
          <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-300">Hint ({gameMode === 'PvP' ? '∞' : hintsRemaining})</span>
        </button>

      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-black text-white mb-2">Exit Game?</h3>
            <p className="text-sm text-slate-400 mb-6">Your current game progress will be lost.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { soundEngine.playClick(); setShowExitConfirm(false); }}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restart Confirmation Modal */}
      {showRestartConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-black text-white mb-2">Restart Game?</h3>
            <p className="text-sm text-slate-400 mb-6">This will start a new game with the same settings.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { soundEngine.playClick(); setShowRestartConfirm(false); }}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestart}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
