
import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { BoardType, Position, MoveHint, GameStatus, CandyType, CandyColor, Candy, PowerupType } from '../types';
import { generateBoard, checkMatches, applyGravity, isAdjacent, createCandy } from '../services/gameLogic';
import { CandyPiece } from './CandyPiece';
import { getGameHint } from '../services/geminiService';
import { audioService } from '../services/audioService';
import { GRID_SIZE, CANDY_COLORS } from '../constants';

const SAVE_KEY = 'sweet_crush_save_data';

interface BoardProps {
  onScore: (points: number, clearedCandies: Candy[]) => void;
  onMove: () => void;
  onHintReceived: (hint: MoveHint | null) => void;
  isAiThinking: boolean;
  setIsAiThinking: (val: boolean) => void;
  gameStatus: GameStatus;
  initialBoard: BoardType | null;
  levelId: number;
  activePowerup: PowerupType | null;
  onUsePowerup: (type: PowerupType) => void;
}

export interface BoardRef {
  triggerUfo: () => Promise<void>;
  triggerPartyBooster: () => Promise<void>;
}

const STREAK_DURATION = 7000;

interface FloatingScore {
  id: number;
  score: number;
  multiplier: number;
  x: number;
  y: number;
}

interface ActiveBeam {
  id: number;
  type: 'h' | 'v';
  index: number;
}

export const Board = forwardRef<BoardRef, BoardProps>(({ 
  onScore, 
  onMove, 
  onHintReceived, 
  isAiThinking, 
  setIsAiThinking, 
  gameStatus,
  initialBoard,
  levelId,
  activePowerup,
  onUsePowerup
}, ref) => {
  const [board, setBoard] = useState<BoardType>(() => initialBoard || generateBoard(levelId));
  const [selected, setSelected] = useState<Position | null>(null);
  const [matchedPositions, setMatchedPositions] = useState<Position[]>([]);
  const [currentHint, setCurrentHint] = useState<MoveHint | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [combo, setCombo] = useState(1);
  const [showCombo, setShowCombo] = useState(false);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [activeBeams, setActiveBeams] = useState<ActiveBeam[]>([]);

  const [streak, setStreak] = useState(1);
  const [streakProgress, setStreakProgress] = useState(0);
  
  const lastMoveTargetRef = useRef<Position | null>(null);
  const nextFloatingId = useRef(0);
  const nextBeamId = useRef(0);

  useImperativeHandle(ref, () => ({
    triggerUfo: async () => {
      await handleUfo();
    },
    triggerPartyBooster: async () => {
      await handlePartyBooster();
    }
  }));

  useEffect(() => {
    if (initialBoard) {
      setBoard(initialBoard);
    } else {
      setBoard(generateBoard(levelId));
    }
  }, [initialBoard, levelId]);

  useEffect(() => {
    const existing = localStorage.getItem(SAVE_KEY);
    const data = existing ? JSON.parse(existing) : {};
    data.board = board;
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }, [board]);

  useEffect(() => {
    if (streak > 1 && !isProcessing && gameStatus === 'playing') {
      const interval = setInterval(() => {
        setStreakProgress(prev => {
          const next = prev - (100 / (STREAK_DURATION / 100));
          if (next <= 0) {
            setStreak(1);
            return 0;
          }
          return next;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [streak, isProcessing, gameStatus]);

  const addFloatingScore = (points: number, multiplier: number, positions: Position[]) => {
    if (positions.length === 0) return;
    const avgRow = positions.reduce((acc, p) => acc + p.row, 0) / positions.length;
    const avgCol = positions.reduce((acc, p) => acc + p.col, 0) / positions.length;
    const id = nextFloatingId.current++;
    setFloatingScores(prev => [...prev, { id, score: points, multiplier, x: avgCol * 12.5 + 6.25, y: avgRow * 12.5 + 6.25 }]);
    setTimeout(() => setFloatingScores(prev => prev.filter(s => s.id !== id)), 1000);
  };

  const triggerStripeBeams = useCallback((matches: Position[], currentBoard: BoardType) => {
    const beams: ActiveBeam[] = [];
    matches.forEach(p => {
      const candy = currentBoard[p.row] ? currentBoard[p.row][p.col] : null;
      if (candy?.type === CandyType.STRIPE_H) {
        beams.push({ id: nextBeamId.current++, type: 'h', index: p.row });
      } else if (candy?.type === CandyType.STRIPE_V) {
        beams.push({ id: nextBeamId.current++, type: 'v', index: p.col });
      }
    });

    if (beams.length > 0) {
      setActiveBeams(prev => [...prev, ...beams]);
      setTimeout(() => {
        const beamIds = new Set(beams.map(b => b.id));
        setActiveBeams(prev => prev.filter(b => !beamIds.has(b.id)));
      }, 600);
    }
  }, []);

  const getMatchBoundingBox = (matches: Position[]) => {
    if (matches.length === 0) return null;
    let minR = GRID_SIZE, maxR = 0, minC = GRID_SIZE, maxC = 0;
    matches.forEach(p => {
      minR = Math.min(minR, p.row);
      maxR = Math.max(maxR, p.row);
      minC = Math.min(minC, p.col);
      maxC = Math.max(maxC, p.col);
    });
    return {
      top: `${minR * 12.5}%`,
      left: `${minC * 12.5}%`,
      width: `${(maxC - minC + 1) * 12.5}%`,
      height: `${(maxR - minR + 1) * 12.5}%`,
    };
  };

  const processBoard = useCallback(async (currentBoard: BoardType) => {
    setIsProcessing(true);
    let tempBoard = JSON.parse(JSON.stringify(currentBoard));
    let currentMultiplier = 1;
    let isFirstIteration = true;
    let anyMatchesMade = false;
    
    while (true) {
      const { matchedPositions: matches, damagedPositions: damaged, specialsToSpawn } = checkMatches(
        tempBoard, 
        isFirstIteration ? lastMoveTargetRef.current || undefined : undefined
      );
      
      if (matches.length === 0 && damaged.length === 0) break;
      anyMatchesMade = true;

      triggerStripeBeams(matches, tempBoard);

      if (currentMultiplier >= 3) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 300);
      }

      const activatedSpecials = matches.some(m => tempBoard[m.row]?.[m.col]?.type !== CandyType.REGULAR);
      if (activatedSpecials) audioService.playSpecial();
      else audioService.playMatch();

      setCombo(currentMultiplier);
      if (currentMultiplier > 1) setShowCombo(true);
      
      setMatchedPositions([...matches, ...damaged]);
      const streakMultiplier = 1 + (streak - 1) * 0.5;
      const pointsBase = matches.length * 10 + damaged.length * 20;
      const finalPoints = Math.round(pointsBase * currentMultiplier * streakMultiplier);
      
      const clearedForGoals: Candy[] = [];
      const actualClearedMatches: Position[] = [];
      matches.forEach(p => {
        const c = tempBoard[p.row]?.[p.col];
        if (c && (c.type === CandyType.JELLY)) {
          c.health = (c.health || 1) - 1;
          if (c.health <= 0) {
            clearedForGoals.push({ ...c });
            actualClearedMatches.push(p);
          }
        } else if (c) {
          clearedForGoals.push({ ...c });
          actualClearedMatches.push(p);
        }
      });

      const actualClearedDamaged: Position[] = [];
      damaged.forEach(p => {
        const c = tempBoard[p.row]?.[p.col];
        if (c && c.type === CandyType.ROCK) {
          c.health = (c.health || 1) - 1;
          if (c.health <= 0) {
            clearedForGoals.push({ ...c });
            actualClearedDamaged.push(p);
          }
        }
      });

      onScore(finalPoints, clearedForGoals);
      addFloatingScore(pointsBase, currentMultiplier * streakMultiplier, [...matches, ...damaged]);
      
      await new Promise(r => setTimeout(r, 450));
      
      actualClearedMatches.forEach(p => { if (tempBoard[p.row]) tempBoard[p.row][p.col] = null; });
      actualClearedDamaged.forEach(p => { if (tempBoard[p.row]) tempBoard[p.row][p.col] = null; });
      
      specialsToSpawn.forEach(s => { 
        if (tempBoard[s.pos.row] && tempBoard[s.pos.row][s.pos.col] === null) {
          tempBoard[s.pos.row][s.pos.col] = createCandy(s.color, s.type); 
        }
      });

      setBoard([...tempBoard]);
      setMatchedPositions([]);

      await new Promise(r => setTimeout(r, 250));
      const { newBoard } = applyGravity(tempBoard);
      tempBoard = newBoard;
      setBoard([...tempBoard]);
      
      currentMultiplier++;
      isFirstIteration = false;
    }
    
    if (anyMatchesMade) {
      setStreak(prev => Math.min(prev + 1, 10));
      setStreakProgress(100);
    }

    setIsProcessing(false);
    lastMoveTargetRef.current = null;
    setTimeout(() => { setShowCombo(false); setCombo(1); }, 1200);
  }, [onScore, streak, triggerStripeBeams]);

  const executeSpecialCombo = async (p1: Position, p2: Position, b: BoardType) => {
    const c1 = b[p1.row]?.[p1.col];
    const c2 = b[p2.row]?.[p2.col];
    if (!c1 || !c2) return;

    onMove();
    setIsProcessing(true);
    let targetPositions: Position[] = [];
    const newBoard: BoardType = JSON.parse(JSON.stringify(b));

    const types = [c1.type, c2.type];

    if (types.filter(t => t === CandyType.COLOR_BOMB).length === 2) {
      audioService.playSpecial();
      setIsShaking(true);
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) targetPositions.push({ row: r, col: c });
      }
    } 
    else if (types.includes(CandyType.COLOR_BOMB)) {
      const other = c1.type === CandyType.COLOR_BOMB ? c2 : c1;
      const targetColor = other.color;
      
      if (other.type === CandyType.BOMB) {
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (newBoard[r]?.[c]?.color === targetColor) {
              newBoard[r][c] = createCandy(targetColor, CandyType.BOMB);
              targetPositions.push({ row: r, col: c });
            }
          }
        }
      } else if (other.type === CandyType.STRIPE_H || other.type === CandyType.STRIPE_V) {
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (newBoard[r]?.[c]?.color === targetColor) {
              const type = Math.random() > 0.5 ? CandyType.STRIPE_H : CandyType.STRIPE_V;
              newBoard[r][c] = createCandy(targetColor, type);
              targetPositions.push({ row: r, col: c });
            }
          }
        }
      } else {
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (newBoard[r]?.[c]?.color === targetColor) targetPositions.push({ row: r, col: c });
          }
        }
      }
      targetPositions.push(c1.type === CandyType.COLOR_BOMB ? p1 : p2);
    }
    else if (types.filter(t => t === CandyType.BOMB).length === 2) {
      audioService.playSpecial();
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const r = p2.row + dr, c = p2.col + dc;
          if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) targetPositions.push({ row: r, col: c });
        }
      }
    }
    else if (types.includes(CandyType.BOMB) && (types.includes(CandyType.STRIPE_H) || types.includes(CandyType.STRIPE_V))) {
      audioService.playSpecial();
      for (let i = -1; i <= 1; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          const r1 = p2.row + i;
          if (r1 >= 0 && r1 < GRID_SIZE) targetPositions.push({ row: r1, col: j });
          const c1 = p2.col + i;
          if (c1 >= 0 && c1 < GRID_SIZE) targetPositions.push({ row: j, col: c1 });
        }
      }
    }
    else if ((c1.type === CandyType.STRIPE_H || c1.type === CandyType.STRIPE_V) && (c2.type === CandyType.STRIPE_H || c2.type === CandyType.STRIPE_V)) {
      audioService.playSpecial();
      for (let i = 0; i < GRID_SIZE; i++) {
        targetPositions.push({ row: p2.row, col: i });
        targetPositions.push({ row: i, col: p2.col });
      }
    }

    if (targetPositions.length > 0) {
      setMatchedPositions(targetPositions);
      audioService.playSpecial();
      
      if (targetPositions.length > 30) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 800);
      }

      await new Promise(r => setTimeout(r, 600));

      const { matchedPositions: additional } = checkMatches(newBoard);
      const allToClear = Array.from(new Set([...targetPositions.map(p => `${p.row}-${p.col}`), ...additional.map(p => `${p.row}-${p.col}`)]))
        .map(s => { const [r, c] = s.split('-').map(Number); return { row: r, col: c }; });

      const clearedForGoals: Candy[] = [];
      allToClear.forEach(p => {
        const c = newBoard[p.row] ? newBoard[p.row][p.col] : null;
        if (c && c.type !== CandyType.ROCK) {
          clearedForGoals.push({ ...c });
          newBoard[p.row][p.col] = null;
        }
      });

      const baseScore = allToClear.length * 25;
      onScore(baseScore, clearedForGoals);
      addFloatingScore(baseScore, 1, allToClear);

      setBoard([...newBoard]);
      setMatchedPositions([]);
      const { newBoard: gravityBoard } = applyGravity(newBoard);
      setBoard(gravityBoard);
      setSelected(null);
      setStreak(prev => Math.min(prev + 1, 10));
      setStreakProgress(100);
      processBoard(gravityBoard);
    }
  };

  const handleLollipopHammer = async (row: number, col: number) => {
    const candy = board[row][col];
    if (!candy) return;
    
    setIsProcessing(true);
    audioService.playSpecial();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 200);

    let tempBoard = JSON.parse(JSON.stringify(board));
    const target = tempBoard[row][col];
    const cleared: Candy[] = [];

    if (target.health && target.health > 1) {
      target.health -= 1;
    } else {
      cleared.push({ ...target });
      tempBoard[row][col] = null;
    }

    onScore(150, cleared);
    setBoard(tempBoard);
    onUsePowerup(PowerupType.LOLLIPOP_HAMMER);

    await new Promise(r => setTimeout(r, 300));
    const { newBoard: gravityBoard } = applyGravity(tempBoard);
    setBoard(gravityBoard);
    processBoard(gravityBoard);
  };

  const handleUfo = async () => {
    setIsProcessing(true);
    audioService.playSpecial();
    
    let tempBoard = JSON.parse(JSON.stringify(board));
    const targetPositions: Position[] = [];
    
    // Spawn 3 special candies randomly
    for (let i = 0; i < 3; i++) {
      let r, c;
      let attempts = 0;
      do {
        r = Math.floor(Math.random() * GRID_SIZE);
        c = Math.floor(Math.random() * GRID_SIZE);
        attempts++;
      } while ((!tempBoard[r][c] || tempBoard[r][c].type !== CandyType.REGULAR) && attempts < 50);
      
      const type = Math.random() > 0.5 ? CandyType.STRIPE_H : CandyType.STRIPE_V;
      tempBoard[r][c] = createCandy(tempBoard[r][c]?.color || CANDY_COLORS[0], type);
      targetPositions.push({ row: r, col: c });
    }

    setMatchedPositions(targetPositions);
    setBoard(tempBoard);
    onUsePowerup(PowerupType.UFO);
    
    await new Promise(r => setTimeout(r, 600));
    setMatchedPositions([]);
    processBoard(tempBoard);
  };

  const handlePartyBooster = async () => {
    setIsProcessing(true);
    audioService.playSpecial();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 800);

    let tempBoard = JSON.parse(JSON.stringify(board));
    const randomColor = CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)];
    const cleared: Candy[] = [];
    const matched: Position[] = [];

    // Clear all of one color and spawn 4 specials
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (tempBoard[r][c]?.color === randomColor) {
          cleared.push({ ...tempBoard[r][c] });
          matched.push({ row: r, col: c });
          tempBoard[r][c] = null;
        }
      }
    }

    // Spawn 4 specials in place of some cleared ones
    for (let i = 0; i < 4; i++) {
       const posIdx = Math.floor(Math.random() * matched.length);
       const pos = matched[posIdx];
       const types = [CandyType.BOMB, CandyType.COLOR_BOMB, CandyType.STRIPE_H, CandyType.STRIPE_V];
       tempBoard[pos.row][pos.col] = createCandy(randomColor, types[i % types.length]);
    }

    setMatchedPositions(matched);
    onScore(cleared.length * 100, cleared);
    setBoard(tempBoard);
    onUsePowerup(PowerupType.PARTY_BOOSTER);

    await new Promise(r => setTimeout(r, 800));
    setMatchedPositions([]);
    const { newBoard: gravityBoard } = applyGravity(tempBoard);
    setBoard(gravityBoard);
    processBoard(gravityBoard);
  };

  const handlePieceClick = async (row: number, col: number) => {
    if (isProcessing || gameStatus !== 'playing') return;

    if (activePowerup === PowerupType.LOLLIPOP_HAMMER) {
      await handleLollipopHammer(row, col);
      return;
    }

    const currentCandy = board[row] ? board[row][col] : null;
    if (currentCandy?.type === CandyType.ROCK) return;

    if (!selected) {
      setSelected({ row, col });
      audioService.playSwap(); 
      return;
    }

    const first = selected;
    const second = { row, col };
    if (first.row === second.row && first.col === second.col) {
      setSelected(null);
      return;
    }

    if (isAdjacent(first, second)) {
      const candy1 = board[first.row] ? board[first.row][first.col] : null;
      const candy2 = board[second.row] ? board[second.row][second.col] : null;
      if (!candy1 || !candy2) return;

      if (activePowerup === PowerupType.FREE_SWITCH) {
        audioService.playSwap();
        const newBoard: BoardType = JSON.parse(JSON.stringify(board));
        newBoard[first.row][first.col] = candy2;
        newBoard[second.row][second.col] = candy1;
        setBoard(newBoard);
        setSelected(null);
        onUsePowerup(PowerupType.FREE_SWITCH);
        processBoard(newBoard);
        return;
      }

      const isAnySpecial = (c: Candy) => c.type !== CandyType.REGULAR && c.type !== CandyType.JELLY && c.type !== CandyType.ROCK;
      
      if (isAnySpecial(candy1) && isAnySpecial(candy2)) {
        await executeSpecialCombo(first, second, board);
        return;
      }
      
      if (candy1.type === CandyType.COLOR_BOMB || candy2.type === CandyType.COLOR_BOMB) {
        await executeSpecialCombo(first, second, board);
        return;
      }

      audioService.playSwap();
      const newBoard: BoardType = JSON.parse(JSON.stringify(board));
      newBoard[first.row][first.col] = candy2;
      newBoard[second.row][second.col] = candy1;

      const { matchedPositions: matches } = checkMatches(newBoard, second);
      if (matches.length > 0) {
        onMove(); 
        setBoard(newBoard);
        setSelected(null);
        setCurrentHint(null);
        onHintReceived(null);
        lastMoveTargetRef.current = second;
        processBoard(newBoard);
      } else {
        setSelected(null);
      }
    } else {
      setSelected(second);
      audioService.playSwap();
    }
  };

  const handleRequestHint = async () => {
    if (isProcessing || isAiThinking || gameStatus !== 'playing') return;
    setIsAiThinking(true);
    const hint = await getGameHint(board);
    setCurrentHint(hint);
    onHintReceived(hint);
    setIsAiThinking(false);
  };

  const getComboGradient = () => {
    if (combo < 3) return 'from-yellow-400 to-orange-500';
    if (combo < 5) return 'from-orange-500 to-red-600';
    if (combo < 8) return 'from-red-600 to-purple-600';
    return 'from-purple-600 to-indigo-700';
  };

  const getStreakText = () => {
    if (streak <= 1) return "";
    if (streak <= 2) return "SWEET!";
    if (streak <= 4) return "TASTY!";
    if (streak <= 6) return "DELICIOUS!";
    if (streak <= 8) return "UNBELIEVABLE!";
    return "DIVINE!";
  };

  const matchBox = getMatchBoundingBox(matchedPositions);

  return (
    <div className="flex flex-col items-center gap-6 relative">
      <div className={`w-full max-w-sm transition-all duration-500 ${streak > 1 ? 'opacity-100' : 'opacity-0 scale-95'}`}>
        <div className="flex justify-between items-end mb-1">
          <span className={`font-game text-xl italic ${streak > 1 ? 'streak-active' : ''} text-orange-600 drop-shadow-sm`}>
            {getStreakText()}
          </span>
          <span className="font-game text-2xl text-red-600">
            STREAK x{(1 + (streak - 1) * 0.5).toFixed(1)}
          </span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner p-0.5 border border-white/50">
          <div 
            className="h-full streak-gradient rounded-full transition-all duration-100 ease-linear shadow-sm"
            style={{ width: `${streakProgress}%` }}
          />
        </div>
      </div>

      {showCombo && combo > 1 && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 animate-combo pointer-events-none">
          <div className={`
            bg-gradient-to-r ${getComboGradient()} text-white px-8 py-3 rounded-full font-game text-3xl shadow-2xl ring-4 ring-white
            ${combo >= 3 ? 'combo-glow scale-110' : ''}
          `}>
            {combo >= 5 ? 'SUPER ' : ''}COMBO x{combo}
          </div>
        </div>
      )}

      <div className={`
        relative bg-pink-100 p-4 rounded-3xl shadow-inner border-4 border-pink-200 transition-all duration-500
        ${gameStatus !== 'playing' ? 'opacity-50 pointer-events-none' : 'opacity-100'}
        ${isShaking ? 'animate-shake' : ''}
        ${streak > 4 ? 'ring-4 ring-orange-400' : ''}
        ${activePowerup ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
      `}>
        {activePowerup && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-pink-900 font-game px-6 py-2 rounded-full shadow-lg border-2 border-white animate-bounce whitespace-nowrap">
            USE {activePowerup.replace(/_/g, ' ').toUpperCase()}
          </div>
        )}

        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
          {floatingScores.map(fs => (
            <div 
              key={fs.id}
              className="absolute font-game text-xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] animate-float-score whitespace-nowrap"
              style={{ left: `${fs.x}%`, top: `${fs.y}%` }}
            >
              +{fs.score}{fs.multiplier > 1 ? ` x${fs.multiplier.toFixed(1)}` : ''}
            </div>
          ))}

          {activeBeams.map(beam => (
            <div 
              key={beam.id}
              className={`absolute pointer-events-none z-10 ${
                beam.type === 'h' ? 'h-12 w-full left-0 animate-beam-h bg-white/40 shadow-[0_0_20px_white]' : 'w-12 h-full top-0 animate-beam-v bg-white/40 shadow-[0_0_20px_white]'
              }`}
              style={{ 
                top: beam.type === 'h' ? `${beam.index * 12.5 + 6.25}%` : 0,
                left: beam.type === 'v' ? `${beam.index * 12.5 + 6.25}%` : 0,
                transform: beam.type === 'h' ? 'translateY(-50%)' : 'translateX(-50%)'
              }}
            />
          ))}

          {combo >= 3 && matchBox && (
            <div 
              className="absolute border-4 border-white/60 rounded-2xl animate-match-glow z-10 bg-white/10"
              style={{ ...matchBox }}
            />
          )}
        </div>

        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(8, minmax(0, 1fr))' }}>
          {board.map((row, rIdx) => 
            row.map((candy, cIdx) => (
              <div key={`${rIdx}-${cIdx}`} className="w-10 h-10 sm:w-12 sm:h-12">
                <CandyPiece
                  candy={candy}
                  pos={{ row: rIdx, col: cIdx }}
                  onClick={() => handlePieceClick(rIdx, cIdx)}
                  isSelected={selected?.row === rIdx && selected?.col === cIdx}
                  isHinted={
                    (currentHint?.from.row === rIdx && currentHint?.from.col === cIdx) ||
                    (currentHint?.to.row === rIdx && currentHint?.to.col === cIdx)
                  }
                  isMatched={matchedPositions.some(p => p.row === rIdx && p.col === cIdx)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={handleRequestHint}
        disabled={isProcessing || isAiThinking || gameStatus !== 'playing'}
        className={`
          px-8 py-3 rounded-full font-game text-white shadow-lg transition-all
          ${isProcessing || isAiThinking || gameStatus !== 'playing'
            ? 'bg-gray-400 cursor-not-allowed opacity-50' 
            : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-105 active:scale-95'}
        `}
      >
        {isAiThinking ? 'AI Coach is Thinking...' : 'Get AI Hint ✨'}
      </button>
    </div>
  );
});
