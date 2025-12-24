
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BoardType, Position, MoveHint, GameStatus, CandyType, CandyColor } from '../types';
import { generateBoard, checkMatches, applyGravity, isAdjacent, createCandy } from '../services/gameLogic';
import { CandyPiece } from './CandyPiece';
import { getGameHint } from '../services/geminiService';
import { audioService } from '../services/audioService';
import { GRID_SIZE } from '../constants';

const SAVE_KEY = 'sweet_crush_save_data';

interface BoardProps {
  onScore: (points: number) => void;
  onMove: () => void;
  onHintReceived: (hint: MoveHint | null) => void;
  isAiThinking: boolean;
  setIsAiThinking: (val: boolean) => void;
  gameStatus: GameStatus;
  initialBoard: BoardType | null;
  key?: number | string; // Used to force reset board on level change
}

const STREAK_DURATION = 7000; // 7 seconds

interface FloatingScore {
  id: number;
  score: number;
  multiplier: number;
  x: number;
  y: number;
}

export const Board: React.FC<BoardProps> = ({ 
  onScore, 
  onMove, 
  onHintReceived, 
  isAiThinking, 
  setIsAiThinking, 
  gameStatus,
  initialBoard 
}) => {
  const [board, setBoard] = useState<BoardType>(() => initialBoard || generateBoard());
  const [selected, setSelected] = useState<Position | null>(null);
  const [matchedPositions, setMatchedPositions] = useState<Position[]>([]);
  const [currentHint, setCurrentHint] = useState<MoveHint | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [combo, setCombo] = useState(1);
  const [showCombo, setShowCombo] = useState(false);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [isShaking, setIsShaking] = useState(false);

  const [streak, setStreak] = useState(1);
  const [streakProgress, setStreakProgress] = useState(0);
  
  const lastMoveTargetRef = useRef<Position | null>(null);
  const nextFloatingId = useRef(0);

  // Update board if initialBoard changes (e.g. on load)
  useEffect(() => {
    if (initialBoard) {
      setBoard(initialBoard);
    }
  }, [initialBoard]);

  // Save board whenever it changes
  useEffect(() => {
    const existing = localStorage.getItem(SAVE_KEY);
    const data = existing ? JSON.parse(existing) : {};
    data.board = board;
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }, [board]);

  useEffect(() => {
    // Streak reset logic on start
    setCombo(1);
    setShowCombo(false);
    setFloatingScores([]);
    setStreak(1);
    setStreakProgress(0);
  }, []);

  useEffect(() => {
    // Halt streak decay if paused or processing matches
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

  const processBoard = useCallback(async (currentBoard: BoardType) => {
    setIsProcessing(true);
    let tempBoard = JSON.parse(JSON.stringify(currentBoard));
    let currentMultiplier = 1;
    let isFirstIteration = true;
    let anyMatchesMade = false;
    
    while (true) {
      const { matchedPositions: matches, specialsToSpawn } = checkMatches(
        tempBoard, 
        isFirstIteration ? lastMoveTargetRef.current || undefined : undefined
      );
      
      if (matches.length === 0) break;
      anyMatchesMade = true;

      if (currentMultiplier >= 3) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 300);
      }

      const activatedSpecials = matches.some(m => tempBoard[m.row][m.col]?.type !== CandyType.REGULAR);
      if (activatedSpecials) audioService.playSpecial();
      else audioService.playMatch();

      setCombo(currentMultiplier);
      if (currentMultiplier > 1) setShowCombo(true);
      
      setMatchedPositions(matches);
      const streakMultiplier = 1 + (streak - 1) * 0.5;
      const pointsBase = matches.length * 10;
      const finalPoints = Math.round(pointsBase * currentMultiplier * streakMultiplier);
      
      onScore(finalPoints);
      addFloatingScore(pointsBase, currentMultiplier * streakMultiplier, matches);
      
      await new Promise(r => setTimeout(r, 450));
      matches.forEach(p => { tempBoard[p.row][p.col] = null; });
      specialsToSpawn.forEach(s => { tempBoard[s.pos.row][s.pos.col] = createCandy(s.color, s.type); });

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
  }, [onScore, streak]);

  const handlePieceClick = async (row: number, col: number) => {
    if (isProcessing || gameStatus !== 'playing') return;

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
      audioService.playSwap();
      const newBoard: BoardType = JSON.parse(JSON.stringify(board));
      const candy1 = newBoard[first.row][first.col];
      const candy2 = newBoard[second.row][second.col];
      
      if (!candy1 || !candy2) return;

      if (candy1.type === CandyType.COLOR_BOMB || candy2.type === CandyType.COLOR_BOMB) {
        onMove();
        const otherCandy = candy1.type === CandyType.COLOR_BOMB ? candy2 : candy1;
        const colorBombPos = candy1.type === CandyType.COLOR_BOMB ? first : second;
        
        let targetPositions: Position[] = [];
        
        if (otherCandy.type === CandyType.COLOR_BOMB) {
          audioService.playSpecial();
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
          for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) targetPositions.push({ row: r, col: c });
          }
        } else {
          const targetColor = otherCandy.color;
          const upgradeType = otherCandy.type;

          for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
              if (newBoard[r][c]?.color === targetColor) {
                if (upgradeType !== CandyType.REGULAR) {
                  newBoard[r][c] = { ...newBoard[r][c]!, type: upgradeType };
                }
                targetPositions.push({ row: r, col: c });
              }
            }
          }
          targetPositions.push(colorBombPos);
        }

        audioService.playSpecial();
        setMatchedPositions(targetPositions);
        
        const streakMultiplier = 1 + (streak - 1) * 0.5;
        const baseScore = targetPositions.length * 20;
        onScore(Math.round(baseScore * streakMultiplier));
        addFloatingScore(baseScore, streakMultiplier, targetPositions);
        
        await new Promise(r => setTimeout(r, 600));

        const finalMatches = checkMatches(newBoard).matchedPositions;
        const combinedMatches = Array.from(new Set([...targetPositions.map(p => `${p.row}-${p.col}`), ...finalMatches.map(p => `${p.row}-${p.col}`)]))
          .map(s => { const [r, c] = s.split('-').map(Number); return { row: r, col: c }; });

        combinedMatches.forEach(p => { newBoard[p.row][p.col] = null; });
        
        setBoard([...newBoard]);
        setMatchedPositions([]);
        const { newBoard: gravityBoard } = applyGravity(newBoard);
        setBoard(gravityBoard);
        setSelected(null);
        setStreak(prev => Math.min(prev + 1, 10));
        setStreakProgress(100);
        processBoard(gravityBoard);
        return;
      }

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
            ${combo >= 5 ? 'combo-glow scale-110' : ''}
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
      `}>
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
};
