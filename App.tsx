
import React, { useState, useEffect } from 'react';
import { Board } from './components/Board';
import { MoveHint, GameStatus, LevelConfig, BoardType } from './types';
import { LEVELS } from './constants';
import { audioService } from './services/audioService';

const SAVE_KEY = 'sweet_crush_save_data';

interface SavedData {
  levelIndex: number;
  score: number;
  movesLeft: number;
  board?: BoardType;
}

const App: React.FC = () => {
  // Initial state setup with default values
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(LEVELS[0].moves);
  const [lastHint, setLastHint] = useState<MoveHint | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [boardKey, setBoardKey] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [initialBoard, setInitialBoard] = useState<BoardType | null>(null);

  const currentLevel = LEVELS[levelIndex];

  // Load progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const data: SavedData = JSON.parse(saved);
        if (typeof data.levelIndex === 'number' && LEVELS[data.levelIndex]) {
          setLevelIndex(data.levelIndex);
          setScore(data.score || 0);
          setMovesLeft(data.movesLeft ?? LEVELS[data.levelIndex].moves);
          if (data.board) {
            setInitialBoard(data.board);
          }
        }
      } catch (e) {
        console.error("Failed to load save data", e);
      }
    }
  }, []);

  // Save progress whenever key stats change
  useEffect(() => {
    const data: SavedData = {
      levelIndex,
      score,
      movesLeft,
    };
    const existing = localStorage.getItem(SAVE_KEY);
    const merged = existing ? { ...JSON.parse(existing), ...data } : data;
    localStorage.setItem(SAVE_KEY, JSON.stringify(merged));
  }, [levelIndex, score, movesLeft]);

  // Sync mute state with audio service
  useEffect(() => {
    audioService.setMuted(isMuted);
  }, [isMuted]);

  // Check for level completion or game over
  useEffect(() => {
    if (score >= currentLevel.targetScore && gameStatus === 'playing') {
      setGameStatus('level-complete');
      audioService.playLevelComplete();
    } else if (movesLeft <= 0 && score < currentLevel.targetScore && gameStatus === 'playing') {
      setGameStatus('game-over');
      audioService.playGameOver();
    }
  }, [score, movesLeft, currentLevel, gameStatus]);

  const nextLevel = () => {
    const nextIdx = levelIndex + 1;
    if (nextIdx < LEVELS.length) {
      setLevelIndex(nextIdx);
      setScore(0);
      setMovesLeft(LEVELS[nextIdx].moves);
      setGameStatus('playing');
      setLastHint(null);
      setInitialBoard(null);
      setBoardKey(prev => prev + 1);
      localStorage.removeItem(SAVE_KEY); 
    } else {
      alert("You beat all levels! 🎉");
      restartGame();
    }
  };

  const restartGame = () => {
    setLevelIndex(0);
    setScore(0);
    setMovesLeft(LEVELS[0].moves);
    setGameStatus('playing');
    setLastHint(null);
    setInitialBoard(null);
    setBoardKey(prev => prev + 1);
    localStorage.removeItem(SAVE_KEY);
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const togglePause = () => {
    if (gameStatus === 'playing') {
      setGameStatus('paused');
    } else if (gameStatus === 'paused') {
      setGameStatus('playing');
    }
  };

  const progressPercent = Math.min((score / currentLevel.targetScore) * 100, 100);

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center p-4 sm:p-8 relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-3 z-50">
        <button 
          onClick={toggleMute}
          className="p-3 bg-white rounded-full shadow-lg text-2xl hover:scale-110 transition-transform"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        <button 
          onClick={togglePause}
          disabled={gameStatus === 'level-complete' || gameStatus === 'game-over'}
          className="p-3 bg-white rounded-full shadow-lg text-2xl hover:scale-110 transition-transform disabled:opacity-50"
          title="Pause"
        >
          {gameStatus === 'paused' ? '▶️' : '⏸️'}
        </button>
      </div>

      {/* Header */}
      <header className="w-full max-w-2xl flex flex-col items-center gap-2 mb-8 text-center">
        <h1 className="text-5xl sm:text-6xl font-game text-pink-600 drop-shadow-md">
          SWEET <span className="text-purple-600">CRUSH</span> AI
        </h1>
        <div className="flex items-center gap-4 mt-2">
          <span className="px-4 py-1 bg-pink-200 text-pink-700 rounded-full font-game text-sm uppercase">
            Level {currentLevel.id}: {currentLevel.title}
          </span>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
        
        {/* Left Panel: Scoreboard & Moves */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-pink-400">
            <h2 className="text-xl font-game text-pink-600 mb-2 uppercase tracking-tighter">Current Score</h2>
            <div className="text-4xl font-game text-gray-800 tabular-nums">
              {score.toLocaleString()}
            </div>
            <div className="mt-4 h-3 bg-pink-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-400 to-purple-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-pink-400 mt-2 font-bold uppercase tracking-widest">Target: {currentLevel.targetScore.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-purple-400">
            <h2 className="text-xl font-game text-purple-600 mb-1 uppercase tracking-tighter">Moves Left</h2>
            <div className={`text-5xl font-game tabular-nums ${movesLeft < 5 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
              {movesLeft}
            </div>
          </div>
        </div>

        {/* Center Panel: Game Board */}
        <div className="lg:col-span-6 flex justify-center relative">
          <div className={gameStatus === 'game-over' ? 'board-lost' : ''}>
            <Board 
              key={boardKey}
              onScore={(points) => setScore(s => s + points)}
              onMove={() => setMovesLeft(m => Math.max(0, m - 1))}
              onHintReceived={setLastHint}
              isAiThinking={isAiThinking}
              setIsAiThinking={setIsAiThinking}
              gameStatus={gameStatus}
              initialBoard={initialBoard}
            />
          </div>

          {/* Overlays */}
          {gameStatus === 'paused' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-[2px]">
              <div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-pink-400 text-center animate-bounce-subtle max-w-sm w-full">
                <h2 className="text-5xl font-game text-pink-600 mb-6 drop-shadow-sm">PAUSED</h2>
                <div className="flex flex-col gap-3">
                  <button onClick={togglePause} className="w-full py-4 bg-pink-500 text-white font-game rounded-2xl text-xl hover:bg-pink-600 transition-colors shadow-lg active:scale-95">Resume</button>
                  <button onClick={restartGame} className="w-full py-4 bg-gray-200 text-gray-700 font-game rounded-2xl text-xl hover:bg-gray-300 transition-colors shadow-sm active:scale-95">Restart</button>
                </div>
              </div>
            </div>
          )}

          {gameStatus === 'level-complete' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-green-400 text-center animate-bounce-subtle max-w-sm">
                <h2 className="text-4xl font-game text-green-600 mb-4">Level Complete!</h2>
                <div className="text-6xl mb-4">✨🍰✨</div>
                <p className="text-gray-600 font-semibold mb-6">You smashed the target! Ready for more?</p>
                <button onClick={nextLevel} className="w-full py-4 bg-green-500 text-white font-game rounded-2xl text-xl hover:bg-green-600 transition-colors shadow-lg">Next Level ➔</button>
              </div>
            </div>
          )}

          {gameStatus === 'game-over' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[4px]">
              <div className="bg-white rounded-3xl p-10 shadow-2xl border-b-8 border-gray-400 text-center animate-game-over max-w-sm w-full relative overflow-hidden">
                {/* Decorative particles */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gray-200 via-gray-400 to-gray-200 opacity-50" />
                
                <div className="text-7xl mb-6 filter grayscale opacity-80">🍭💔</div>
                <h2 className="text-5xl font-game text-gray-700 mb-2 uppercase tracking-tighter">Out of Moves</h2>
                <p className="text-gray-400 font-bold text-sm mb-6 uppercase tracking-widest">The sweetness faded...</p>
                
                <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-200">
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase mb-2">
                    <span>Final Score</span>
                    <span>{Math.round(progressPercent)}% of Goal</span>
                  </div>
                  <div className="text-4xl font-game text-gray-800 shimmer-text mb-4">
                    {score.toLocaleString()}
                  </div>
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden p-1 shadow-inner">
                    <div 
                      className="h-full bg-gray-400 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={restartGame}
                    className="w-full py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-game rounded-2xl text-2xl hover:brightness-110 transition-all shadow-xl active:scale-95 border-b-4 border-black/20"
                  >
                    Try Again ↺
                  </button>
                  <p className="text-xs text-gray-400 font-semibold italic">Don't give up! Every candy crush counts.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: AI Coach */}
        <div className="lg:col-span-3">
          <div className="bg-indigo-600 rounded-3xl p-6 shadow-2xl text-white min-h-[300px] flex flex-col relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-50" />
            <div className="flex items-center gap-3 mb-4 z-10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🤖</div>
              <h2 className="text-xl font-game tracking-tight">AI Game Coach</h2>
            </div>
            <div className="flex-1 z-10 flex flex-col justify-center">
              {gameStatus === 'game-over' ? (
                <p className="text-indigo-200 text-center italic">"Close one! A slightly different swap might have saved the day. Let's try once more!"</p>
              ) : isAiThinking ? (
                <div className="space-y-4">
                  <div className="h-4 bg-white/10 rounded animate-pulse w-full" />
                  <div className="h-4 bg-white/10 rounded animate-pulse w-3/4" />
                </div>
              ) : lastHint ? (
                <div className="animate-fade-in">
                  <p className="text-indigo-100 italic leading-relaxed mb-4">"{lastHint.explanation}"</p>
                </div>
              ) : (
                <p className="text-indigo-200 text-center italic">"I'm analyzing the board... Level {currentLevel.id} is a bit tougher! Need a hint?"</p>
              )}
            </div>
          </div>
        </div>

      </main>

      <footer className="mt-12 text-pink-300 text-sm font-semibold text-center z-10">
        Created by a Senior Frontend Engineer | &copy; 2024 Sweet Crush AI
      </footer>
    </div>
  );
};

export default App;
