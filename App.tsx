
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Board, BoardRef } from './components/Board';
import { MoveHint, GameStatus, BoardType, Candy, GoalType, CandyColor, CandyType, PowerupType, PreGameBoosterType } from './types';
import { LEVELS, CandyIcon, PRE_GAME_BOOSTERS_CONFIG, GRID_SIZE } from './constants';
import { audioService } from './services/audioService';
import { generateBoard, createCandy } from './services/gameLogic';

const SAVE_KEY = 'sweet_crush_save_data';

interface SavedData {
  levelIndex: number;
  score: number;
  movesLeft: number;
  board?: BoardType;
  goalProgress?: Record<string, number>;
  powerups?: Record<PowerupType, number>;
  preGameInventory?: Record<PreGameBoosterType, number>;
}

const App: React.FC = () => {
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(LEVELS[0].moves);
  const [lastHint, setLastHint] = useState<MoveHint | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('setup');
  const [boardKey, setBoardKey] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [initialBoard, setInitialBoard] = useState<BoardType | null>(null);
  const [goalProgress, setGoalProgress] = useState<Record<string, number>>({});
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [activePowerup, setActivePowerup] = useState<PowerupType | null>(null);
  const boardRef = useRef<BoardRef>(null);

  const [powerups, setPowerups] = useState<Record<PowerupType, number>>({
    [PowerupType.LOLLIPOP_HAMMER]: 3,
    [PowerupType.FREE_SWITCH]: 2,
    [PowerupType.EXTRA_MOVES_5]: 2,
    [PowerupType.UFO]: 1,
    [PowerupType.PARTY_BOOSTER]: 1
  });

  const [preGameInventory, setPreGameInventory] = useState<Record<PreGameBoosterType, number>>({
    [PreGameBoosterType.FISH]: 5,
    [PreGameBoosterType.COLOR_BOMB]: 3,
    [PreGameBoosterType.COCONUT_WHEEL]: 2,
    [PreGameBoosterType.STRIPED_WRAPPED]: 3,
    [PreGameBoosterType.LUCKY_CANDY]: 4,
    [PreGameBoosterType.EXTRA_MOVES]: 10,
  });

  const [selectedBoosters, setSelectedBoosters] = useState<Set<PreGameBoosterType>>(new Set());

  const currentLevel = LEVELS[levelIndex];

  const goalsMet = useMemo(() => {
    return currentLevel.goals.every((goal) => {
      const progressKey = `${goal.type}-${goal.target}`;
      return (goalProgress[progressKey] || 0) >= goal.count;
    });
  }, [currentLevel.goals, goalProgress]);

  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const data: SavedData = JSON.parse(saved);
        if (typeof data.levelIndex === 'number' && LEVELS[data.levelIndex]) {
          setLevelIndex(data.levelIndex);
          setScore(data.score || 0);
          setMovesLeft(data.movesLeft ?? LEVELS[data.levelIndex].moves);
          setGoalProgress(data.goalProgress || {});
          if (data.powerups) setPowerups(data.powerups);
          setPreGameInventory(data.preGameInventory || {
            [PreGameBoosterType.FISH]: 5,
            [PreGameBoosterType.COLOR_BOMB]: 3,
            [PreGameBoosterType.COCONUT_WHEEL]: 2,
            [PreGameBoosterType.STRIPED_WRAPPED]: 3,
            [PreGameBoosterType.LUCKY_CANDY]: 4,
            [PreGameBoosterType.EXTRA_MOVES]: 10,
          });
          if (data.board) {
            setInitialBoard(data.board);
            setGameStatus('playing');
          }
        }
      } catch (e) {
        console.error("Failed to load save data", e);
      }
    }
  }, []);

  useEffect(() => {
    const data: SavedData = {
      levelIndex,
      score,
      movesLeft,
      goalProgress,
      powerups,
      preGameInventory
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }, [levelIndex, score, movesLeft, goalProgress, powerups, preGameInventory]);

  useEffect(() => {
    audioService.setMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    if (gameStatus === 'playing') {
      if (score >= currentLevel.targetScore && goalsMet) {
        setGameStatus('level-complete');
        audioService.playLevelComplete();
      } else if (movesLeft <= 0) {
        setGameStatus('game-over');
        audioService.playGameOver();
      }
    }
  }, [score, goalsMet, movesLeft, currentLevel, gameStatus]);

  const handleScore = (points: number, clearedCandies: Candy[]) => {
    setScore(s => s + points);
    setGoalProgress(prev => {
      const next = { ...prev };
      clearedCandies.forEach(candy => {
        const colorKey = `${GoalType.COLLECT_COLOR}-${candy.color}`;
        next[colorKey] = (next[colorKey] || 0) + 1;
        const typeKey = `${GoalType.COLLECT_TYPE}-${candy.type}`;
        next[typeKey] = (next[typeKey] || 0) + 1;
      });
      return next;
    });
  };

  const selectLevel = (idx: number) => {
    setLevelIndex(idx);
    setScore(0);
    setGoalProgress({});
    setGameStatus('setup');
    setLastHint(null);
    setInitialBoard(null);
    setBoardKey(prev => prev + 1);
    setShowLevelSelect(false);
    setActivePowerup(null);
    setSelectedBoosters(new Set());
  };

  const nextLevel = () => {
    const nextIdx = (levelIndex + 1) % LEVELS.length;
    selectLevel(nextIdx);
  };

  const startLevel = () => {
    let board = generateBoard(currentLevel.id);
    let extraMoves = 0;

    selectedBoosters.forEach(type => {
      setPreGameInventory(prev => ({ ...prev, [type]: prev[type] - 1 }));

      if (type === PreGameBoosterType.EXTRA_MOVES) {
        extraMoves += 3;
      } else {
        const inject = (candyType: CandyType) => {
          let r, c;
          do {
            r = Math.floor(Math.random() * GRID_SIZE);
            c = Math.floor(Math.random() * GRID_SIZE);
          } while (!board[r][c] || board[r][c]?.type !== CandyType.REGULAR);
          board[r][c] = createCandy(board[r][c]?.color, candyType);
        };

        if (type === PreGameBoosterType.COLOR_BOMB) inject(CandyType.COLOR_BOMB);
        if (type === PreGameBoosterType.STRIPED_WRAPPED) {
          inject(CandyType.STRIPE_H);
          inject(CandyType.BOMB);
        }
        if (type === PreGameBoosterType.FISH) {
           inject(CandyType.STRIPE_V);
           inject(CandyType.STRIPE_H);
        }
        if (type === PreGameBoosterType.COCONUT_WHEEL) {
           inject(CandyType.STRIPE_H);
        }
        if (type === PreGameBoosterType.LUCKY_CANDY) {
           inject(CandyType.BOMB);
           inject(CandyType.COLOR_BOMB);
        }
      }
    });

    setMovesLeft(currentLevel.moves + extraMoves);
    setInitialBoard(board);
    setGameStatus('playing');
    audioService.playSwap();
  };

  const restartGame = () => {
    selectLevel(levelIndex);
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const togglePause = () => {
    if (gameStatus === 'playing') setGameStatus('paused');
    else if (gameStatus === 'paused') setGameStatus('playing');
  };

  const togglePreGameBooster = (type: PreGameBoosterType) => {
    if (preGameInventory[type] <= 0) return;
    setSelectedBoosters(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const togglePowerup = (type: PowerupType) => {
    if (powerups[type] <= 0) return;
    
    // Instant triggers for non-targeting boosters
    if (type === PowerupType.EXTRA_MOVES_5) {
      setMovesLeft(m => m + 5);
      handleUsePowerup(PowerupType.EXTRA_MOVES_5);
      audioService.playSpecial();
      return;
    }

    if (type === PowerupType.UFO) {
      boardRef.current?.triggerUfo();
      return;
    }

    if (type === PowerupType.PARTY_BOOSTER) {
      boardRef.current?.triggerPartyBooster();
      return;
    }

    // Toggle targeting mode for Hammer and Switch
    if (activePowerup === type) setActivePowerup(null);
    else setActivePowerup(type);
  };

  const handleUsePowerup = (type: PowerupType) => {
    setPowerups(prev => ({ ...prev, [type]: prev[type] - 1 }));
    setActivePowerup(null);
  };

  const progressPercent = Math.min((score / currentLevel.targetScore) * 100, 100);

  if (gameStatus === 'setup') {
    return (
      <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-8">
        <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl border-b-8 border-pink-400 relative animate-bounce-subtle">
          <header className="text-center mb-8">
            <h2 className="text-5xl font-game text-pink-600 mb-2 drop-shadow-sm uppercase">Level {currentLevel.title}</h2>
            <p className="text-pink-400 font-bold tracking-widest uppercase text-sm">Target: {currentLevel.targetScore.toLocaleString()}</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
             <div className="bg-pink-50 rounded-3xl p-6 border-2 border-pink-100">
               <h3 className="font-game text-pink-600 mb-4 text-center">Level Goals</h3>
               <div className="flex justify-center gap-4">
                 {currentLevel.goals.map((goal, idx) => (
                   <div key={idx} className="flex flex-col items-center">
                     <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center text-3xl mb-1 ring-2 ring-pink-200">
                        {goal.type === GoalType.COLLECT_COLOR ? <CandyIcon color={goal.target as CandyColor} /> : '🍬'}
                     </div>
                     <span className="font-game text-pink-700">x{goal.count}</span>
                   </div>
                 ))}
               </div>
             </div>
             
             <div className="bg-purple-50 rounded-3xl p-6 border-2 border-purple-100">
               <h3 className="font-game text-purple-600 mb-4 text-center">Base Moves</h3>
               <div className="flex items-center justify-center h-16">
                 <span className="text-5xl font-game text-purple-700">{currentLevel.moves}</span>
               </div>
             </div>
          </div>

          <div className="mb-10">
            <h3 className="font-game text-gray-700 mb-6 text-center uppercase tracking-widest text-lg">Pick Your Boosters</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
               {PRE_GAME_BOOSTERS_CONFIG.map(booster => {
                 const isSelected = selectedBoosters.has(booster.type);
                 const count = preGameInventory[booster.type];
                 return (
                   <button
                     key={booster.type}
                     onClick={() => togglePreGameBooster(booster.type)}
                     disabled={count <= 0}
                     title={booster.desc}
                     className={`
                       flex flex-col items-center gap-2 group relative
                       ${count <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                     `}
                   >
                     <div className={`
                       w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all
                       ${isSelected ? 'bg-yellow-400 scale-110 ring-4 ring-pink-300 animate-pulse' : 'bg-pink-100 hover:bg-pink-200'}
                     `}>
                        {booster.icon}
                        {isSelected && <div className="absolute top-0 right-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs border-2 border-white">✓</div>}
                     </div>
                     <div className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold text-pink-600 shadow-sm border border-pink-100">
                       {count}
                     </div>
                   </button>
                 );
               })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
             <button 
               onClick={startLevel}
               className="w-full py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-game rounded-[2rem] text-3xl hover:brightness-110 shadow-xl active:scale-95 transition-all"
             >
               Play!
             </button>
             <button 
               onClick={() => setShowLevelSelect(true)}
               className="text-pink-400 font-bold hover:text-pink-600 transition-colors"
             >
               Back to Map
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center p-4 sm:p-8 relative">
      <div className="absolute top-4 right-4 flex flex-col gap-3 z-50">
        <button onClick={toggleMute} title="Toggle Mute" className="p-3 bg-white rounded-full shadow-lg text-2xl hover:scale-110 transition-transform">{isMuted ? '🔇' : '🔊'}</button>
        <button onClick={() => setShowLevelSelect(true)} title="Level Selection" className="p-3 bg-white rounded-full shadow-lg text-2xl hover:scale-110 transition-transform">🗺️</button>
        <button onClick={togglePause} title="Pause Game" disabled={gameStatus === 'level-complete' || gameStatus === 'game-over'} className="p-3 bg-white rounded-full shadow-lg text-2xl hover:scale-110 transition-transform disabled:opacity-50">{gameStatus === 'paused' ? '▶️' : '⏸️'}</button>
      </div>

      <header className="w-full max-w-2xl flex flex-col items-center gap-2 mb-8 text-center">
        <h1 className="text-5xl sm:text-6xl font-game text-pink-600 drop-shadow-md">SWEET <span className="text-purple-600">CRUSH</span> AI</h1>
        <div className="flex items-center gap-4 mt-2">
          <span className="px-6 py-2 bg-pink-600 text-white rounded-full font-game text-xl shadow-lg border-2 border-white">LEVEL {currentLevel.title}</span>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative mb-12">
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-indigo-400">
            <h2 className="text-xl font-game text-indigo-600 mb-4 uppercase tracking-tighter">Level Goals</h2>
            <div className="space-y-4">
              {currentLevel.goals.map((goal, idx) => {
                const progressKey = `${goal.type}-${goal.target}`;
                const current = goalProgress[progressKey] || 0;
                const isComplete = current >= goal.count;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center relative overflow-hidden shadow-sm">
                      {goal.type === GoalType.COLLECT_COLOR ? <CandyIcon color={goal.target as CandyColor} /> : <div className="text-2xl">{goal.target === CandyType.STRIPE_H && '➖'}{goal.target === CandyType.STRIPE_V && '｜'}{goal.target === CandyType.BOMB && '💣'}{goal.target === CandyType.COLOR_BOMB && '🍭'}{goal.target === CandyType.ROCK && '🗿'}{goal.target === CandyType.JELLY && '🧊'}</div>}
                      {isComplete && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center text-green-600 font-bold text-xl">✓</div>}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs font-bold text-gray-400 mb-1 uppercase"><span>{current} / {goal.count}</span>{isComplete && <span className="text-green-500">Done!</span>}</div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-indigo-400'}`} style={{ width: `${Math.min((current / goal.count) * 100, 100)}%` }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-pink-400">
            <h2 className="text-xl font-game text-pink-600 mb-2 uppercase tracking-tighter">Target Score</h2>
            <div className="text-4xl font-game text-gray-800 tabular-nums">{score.toLocaleString()}</div>
            <div className="mt-4 h-3 bg-pink-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-pink-400 to-purple-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} /></div>
            <p className="text-xs text-pink-400 mt-2 font-bold uppercase tracking-widest">Goal: {currentLevel.targetScore.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-purple-400">
            <h2 className="text-xl font-game text-purple-600 mb-1 uppercase tracking-tighter">Moves</h2>
            <div className={`text-5xl font-game tabular-nums ${movesLeft < 5 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>{movesLeft}</div>
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col items-center gap-8 relative">
          <div className={gameStatus === 'game-over' ? 'board-lost' : ''}>
            <Board 
              ref={boardRef}
              key={boardKey}
              levelId={currentLevel.id}
              onScore={handleScore}
              onMove={() => setMovesLeft(m => Math.max(0, m - 1))}
              onHintReceived={setLastHint}
              isAiThinking={isAiThinking}
              setIsAiThinking={setIsAiThinking}
              gameStatus={gameStatus}
              initialBoard={initialBoard}
              activePowerup={activePowerup}
              onUsePowerup={handleUsePowerup}
            />
          </div>

          <div className="flex gap-4 p-4 bg-white/60 backdrop-blur-md rounded-[2.5rem] shadow-xl border-2 border-white/50">
             <div className="flex flex-col items-center gap-1">
               <button onClick={() => togglePowerup(PowerupType.LOLLIPOP_HAMMER)} disabled={powerups[PowerupType.LOLLIPOP_HAMMER] <= 0} className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl transition-all shadow-md ${activePowerup === PowerupType.LOLLIPOP_HAMMER ? 'bg-yellow-400 scale-110 ring-4 ring-pink-300 animate-pulse' : 'bg-pink-100 hover:bg-pink-200'} ${powerups[PowerupType.LOLLIPOP_HAMMER] <= 0 ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}>🍭</button>
               <span className="text-[10px] font-bold text-pink-600 bg-white px-2 py-0.5 rounded-full shadow-sm">{powerups[PowerupType.LOLLIPOP_HAMMER]}</span>
             </div>
             <div className="flex flex-col items-center gap-1">
               <button onClick={() => togglePowerup(PowerupType.EXTRA_MOVES_5)} disabled={powerups[PowerupType.EXTRA_MOVES_5] <= 0} className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl transition-all shadow-md ${activePowerup === PowerupType.EXTRA_MOVES_5 ? 'bg-yellow-400 scale-110 ring-4 ring-pink-300 animate-pulse' : 'bg-pink-100 hover:bg-pink-200'} ${powerups[PowerupType.EXTRA_MOVES_5] <= 0 ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}>🖐️</button>
               <span className="text-[10px] font-bold text-pink-600 bg-white px-2 py-0.5 rounded-full shadow-sm">{powerups[PowerupType.EXTRA_MOVES_5]}</span>
             </div>
             <div className="flex flex-col items-center gap-1">
               <button onClick={() => togglePowerup(PowerupType.FREE_SWITCH)} disabled={powerups[PowerupType.FREE_SWITCH] <= 0} className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl transition-all shadow-md ${activePowerup === PowerupType.FREE_SWITCH ? 'bg-yellow-400 scale-110 ring-4 ring-pink-300 animate-pulse' : 'bg-pink-100 hover:bg-pink-200'} ${powerups[PowerupType.FREE_SWITCH] <= 0 ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}>🔄</button>
               <span className="text-[10px] font-bold text-pink-600 bg-white px-2 py-0.5 rounded-full shadow-sm">{powerups[PowerupType.FREE_SWITCH]}</span>
             </div>
             <div className="flex flex-col items-center gap-1">
               <button onClick={() => togglePowerup(PowerupType.UFO)} disabled={powerups[PowerupType.UFO] <= 0} className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl transition-all shadow-md ${activePowerup === PowerupType.UFO ? 'bg-yellow-400 scale-110 ring-4 ring-pink-300 animate-pulse' : 'bg-pink-100 hover:bg-pink-200'} ${powerups[PowerupType.UFO] <= 0 ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}>🛸</button>
               <span className="text-[10px] font-bold text-pink-600 bg-white px-2 py-0.5 rounded-full shadow-sm">{powerups[PowerupType.UFO]}</span>
             </div>
             <div className="flex flex-col items-center gap-1">
               <button onClick={() => togglePowerup(PowerupType.PARTY_BOOSTER)} disabled={powerups[PowerupType.PARTY_BOOSTER] <= 0} className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl transition-all shadow-md ${activePowerup === PowerupType.PARTY_BOOSTER ? 'bg-yellow-400 scale-110 ring-4 ring-pink-300 animate-pulse' : 'bg-pink-100 hover:bg-pink-200'} ${powerups[PowerupType.PARTY_BOOSTER] <= 0 ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}>🎉</button>
               <span className="text-[10px] font-bold text-pink-600 bg-white px-2 py-0.5 rounded-full shadow-sm">{powerups[PowerupType.PARTY_BOOSTER]}</span>
             </div>
          </div>

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
                <p className="text-gray-600 font-semibold mb-6">You reached the goal and smashed the target!</p>
                <button onClick={nextLevel} className="w-full py-4 bg-green-500 text-white font-game rounded-2xl text-xl hover:bg-green-600 transition-colors shadow-lg">Next Level ➔</button>
              </div>
            </div>
          )}

          {gameStatus === 'game-over' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[4px]">
              <div className="bg-white rounded-3xl p-10 shadow-2xl border-b-8 border-gray-400 text-center animate-game-over max-w-sm w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gray-200 via-gray-400 to-gray-200 opacity-50" />
                <div className="text-7xl mb-6 filter grayscale opacity-80">🍭💔</div>
                <h2 className="text-5xl font-game text-gray-700 mb-2 uppercase tracking-tighter">Out of Moves</h2>
                <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-200"><div className="text-4xl font-game text-gray-800 shimmer-text mb-4">{score.toLocaleString()}</div></div>
                <button onClick={restartGame} className="w-full py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-game rounded-2xl text-2xl hover:brightness-110 shadow-xl">Try Again ↺</button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="bg-indigo-600 rounded-3xl p-6 shadow-2xl text-white min-h-[300px] flex flex-col relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-50" />
            <div className="flex items-center gap-3 mb-4 z-10"><div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🤖</div><h2 className="text-xl font-game tracking-tight">AI Game Coach</h2></div>
            <div className="flex-1 z-10 flex flex-col justify-center">{gameStatus === 'game-over' ? (<p className="text-indigo-200 text-center italic">"Close one! A slightly different swap might have saved the day. Let's try once more!"</p>) : isAiThinking ? (<div className="space-y-4"><div className="h-4 bg-white/10 rounded animate-pulse w-full" /><div className="h-4 bg-white/10 rounded animate-pulse w-3/4" /></div>) : lastHint ? (<div className="animate-fade-in"><p className="text-indigo-100 italic leading-relaxed mb-4">"{lastHint.explanation}"</p></div>) : (<p className="text-indigo-200 text-center italic">"Focus on the targets in the top left! This level requires specific matches."</p>)}</div>
          </div>
        </div>
      </main>

      {showLevelSelect && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-8 shadow-2xl border-8 border-pink-200 relative animate-bounce-subtle">
            <button onClick={() => setShowLevelSelect(false)} className="absolute -top-4 -right-4 w-12 h-12 bg-pink-500 text-white rounded-full flex items-center justify-center text-2xl shadow-lg border-4 border-white hover:scale-110 transition-transform">✕</button>
            <h2 className="text-4xl font-game text-pink-600 mb-8 text-center uppercase tracking-widest">Select Level</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 overflow-y-auto max-h-[60vh] p-2">
              {LEVELS.map((lvl, idx) => (<button key={lvl.id} onClick={() => selectLevel(idx)} className={`aspect-square rounded-2xl font-game text-2xl flex items-center justify-center transition-all ${levelIndex === idx ? 'bg-pink-600 text-white ring-4 ring-pink-300 scale-105' : 'bg-pink-100 text-pink-700 hover:bg-pink-200 hover:scale-105 shadow-md active:scale-95'}`}>{lvl.title}</button>))}
            </div>
          </div>
        </div>
      )}

      <footer className="mt-12 text-pink-300 text-sm font-semibold text-center z-10">Created by a Senior Frontend Engineer | &copy; 2024 Sweet Crush AI</footer>
    </div>
  );
};

export default App;
