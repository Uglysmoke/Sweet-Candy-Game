
import { Candy, CandyColor, CandyType, BoardType, Position } from '../types';
import { GRID_SIZE, CANDY_COLORS } from '../constants';

export const createCandy = (color?: CandyColor, type: CandyType = CandyType.REGULAR): Candy => {
  const healthMap: Record<string, number> = {
    [CandyType.ROCK]: 2,
    [CandyType.JELLY]: 2,
  };
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    color: color || CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)],
    type,
    health: healthMap[type] || 0
  };
};

export const generateBoard = (levelId: number = 1): BoardType => {
  const board: BoardType = [];
  const useRocks = levelId >= 8;
  const useJelly = levelId >= 9;

  for (let r = 0; r < GRID_SIZE; r++) {
    const row: (Candy | null)[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      // Logic to place blockers for specific levels
      if (useRocks && (r === 3 || r === 4) && (c === 3 || c === 4)) {
        row.push(createCandy(undefined, CandyType.ROCK));
        continue;
      }
      
      if (useJelly && Math.random() < 0.1) {
        row.push(createCandy(undefined, CandyType.JELLY));
        continue;
      }

      let color: CandyColor;
      do {
        color = CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)];
      } while (
        (r >= 2 && board[r-1]?.[c]?.color === color && board[r-2]?.[c]?.color === color) ||
        (c >= 2 && row[c-1]?.color === color && row[c-2]?.color === color)
      );
      row.push(createCandy(color));
    }
    board.push(row);
  }
  return board;
};

interface MatchResult {
  matchedPositions: Position[];
  damagedPositions: Position[]; // For ROCKs
  specialsToSpawn: { pos: Position; color: CandyColor; type: CandyType }[];
}

export const checkMatches = (board: BoardType, lastMoveTarget?: Position): MatchResult => {
  const hMatches: Position[][] = [];
  const vMatches: Position[][] = [];
  const matchedSet: Set<string> = new Set();
  const damagedSet: Set<string> = new Set();
  const specialsToSpawn: { pos: Position; color: CandyColor; type: CandyType }[] = [];

  // 1. Find all horizontal matches
  for (let r = 0; r < GRID_SIZE; r++) {
    let count = 1;
    for (let c = 1; c <= GRID_SIZE; c++) {
      const curr = (c < GRID_SIZE && board[r]) ? board[r][c] : null;
      const prev = board[r] ? board[r][c-1] : null;
      const isMatchable = curr?.type !== CandyType.ROCK && prev?.type !== CandyType.ROCK && curr?.type !== CandyType.COLOR_BOMB;
      
      if (c < GRID_SIZE && curr?.color === prev?.color && curr !== null && isMatchable) {
        count++;
      } else {
        if (count >= 3) {
          const match = [];
          for (let i = 0; i < count; i++) match.push({ row: r, col: c - 1 - i });
          hMatches.push(match);
        }
        count = 1;
      }
    }
  }

  // 2. Find all vertical matches
  for (let c = 0; c < GRID_SIZE; c++) {
    let count = 1;
    for (let r = 1; r <= GRID_SIZE; r++) {
      const curr = (r < GRID_SIZE && board[r]) ? board[r][c] : null;
      const prev = board[r-1] ? board[r-1][c] : null;
      const isMatchable = curr?.type !== CandyType.ROCK && prev?.type !== CandyType.ROCK && curr?.type !== CandyType.COLOR_BOMB;

      if (r < GRID_SIZE && curr?.color === prev?.color && curr !== null && isMatchable) {
        count++;
      } else {
        if (count >= 3) {
          const match = [];
          for (let i = 0; i < count; i++) match.push({ row: r - 1 - i, col: c });
          vMatches.push(match);
        }
        count = 1;
      }
    }
  }

  const k = (p: Position) => `${p.row}-${p.col}`;

  // 3. Complex Match Logic
  const processedH = new Set<number>();
  const processedV = new Set<number>();

  hMatches.forEach((hm, hIdx) => {
    vMatches.forEach((vm, vIdx) => {
      const intersection = hm.find(hp => vm.some(vp => vp.row === hp.row && vp.col === hp.col));
      if (intersection) {
        const combined = [...hm, ...vm];
        combined.forEach(p => matchedSet.add(k(p)));
        const color = board[intersection.row]?.[intersection.col]?.color || CandyColor.RED;
        specialsToSpawn.push({ pos: intersection, color, type: CandyType.BOMB });
        processedH.add(hIdx);
        processedV.add(vIdx);
      }
    });
  });

  hMatches.forEach((hm, idx) => {
    if (processedH.has(idx) || hm.length === 0) return;
    hm.forEach(p => matchedSet.add(k(p)));
    const color = board[hm[0].row]?.[hm[0].col]?.color || CandyColor.RED;
    if (hm.length >= 5) {
      const pos = lastMoveTarget && hm.some(p => k(p) === k(lastMoveTarget)) ? lastMoveTarget : hm[Math.floor(hm.length / 2)];
      specialsToSpawn.push({ pos, color, type: CandyType.COLOR_BOMB });
    } else if (hm.length === 4) {
      const pos = lastMoveTarget && hm.some(p => k(p) === k(lastMoveTarget)) ? lastMoveTarget : hm[Math.floor(hm.length / 2)];
      specialsToSpawn.push({ pos, color, type: CandyType.STRIPE_V });
    }
  });

  vMatches.forEach((vm, idx) => {
    if (processedV.has(idx) || vm.length === 0) return;
    vm.forEach(p => matchedSet.add(k(p)));
    const color = board[vm[0].row]?.[vm[0].col]?.color || CandyColor.RED;
    if (vm.length >= 5) {
      const pos = lastMoveTarget && vm.some(p => k(p) === k(lastMoveTarget)) ? lastMoveTarget : vm[Math.floor(vm.length / 2)];
      specialsToSpawn.push({ pos, color, type: CandyType.COLOR_BOMB });
    } else if (vm.length === 4) {
      const pos = lastMoveTarget && vm.some(p => k(p) === k(lastMoveTarget)) ? lastMoveTarget : vm[Math.floor(vm.length / 2)];
      specialsToSpawn.push({ pos, color, type: CandyType.STRIPE_H });
    }
  });

  // 4. Expansion Logic
  const expandedMatched: Set<string> = new Set(matchedSet);
  let queue = Array.from(matchedSet).map(s => {
    const [r, c] = s.split('-').map(Number);
    return { row: r, col: c };
  });
  const processedQueue = new Set<string>();

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const key = k(curr);
    if (processedQueue.has(key)) continue;
    processedQueue.add(key);

    const candy = board[curr.row]?.[curr.col];
    if (!candy) continue;

    // Special behavior for ROCK: Check neighbors of matched items
    const neighbors = [
      { row: curr.row - 1, col: curr.col },
      { row: curr.row + 1, col: curr.col },
      { row: curr.row, col: curr.col - 1 },
      { row: curr.row, col: curr.col + 1 },
    ];
    neighbors.forEach(n => {
      if (n.row >= 0 && n.row < GRID_SIZE && n.col >= 0 && n.col < GRID_SIZE) {
        if (board[n.row]?.[n.col]?.type === CandyType.ROCK) {
          damagedSet.add(k(n));
        }
      }
    });

    if (candy.type === CandyType.STRIPE_H) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const p = { row: curr.row, col: c };
        if (!expandedMatched.has(k(p))) { expandedMatched.add(k(p)); queue.push(p); }
      }
    } else if (candy.type === CandyType.STRIPE_V) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const p = { row: r, col: curr.col };
        if (!expandedMatched.has(k(p))) { expandedMatched.add(k(p)); queue.push(p); }
      }
    } else if (candy.type === CandyType.BOMB) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = curr.row + dr, c = curr.col + dc;
          if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            const p = { row: r, col: c };
            if (!expandedMatched.has(k(p))) { expandedMatched.add(k(p)); queue.push(p); }
          }
        }
      }
    } else if (candy.type === CandyType.COLOR_BOMB) {
      const randomColor = CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (board[r]?.[c]?.color === randomColor) {
            const p = { row: r, col: c };
            if (!expandedMatched.has(k(p))) { expandedMatched.add(k(p)); queue.push(p); }
          }
        }
      }
    }
  }

  return {
    matchedPositions: Array.from(expandedMatched).map(s => {
      const [r, c] = s.split('-').map(Number);
      return { row: r, col: c };
    }),
    damagedPositions: Array.from(damagedSet).map(s => {
      const [r, c] = s.split('-').map(Number);
      return { row: r, col: c };
    }),
    specialsToSpawn
  };
};

export const applyGravity = (board: BoardType): { newBoard: BoardType; spawned: number } => {
  const newBoard: BoardType = JSON.parse(JSON.stringify(board));
  let spawnedCount = 0;

  for (let c = 0; c < GRID_SIZE; c++) {
    let emptyRow = GRID_SIZE - 1;
    for (let r = GRID_SIZE - 1; r >= 0; r--) {
      if (newBoard[r] && newBoard[r][c] !== null) {
        const temp = newBoard[r][c];
        newBoard[r][c] = null;
        if (newBoard[emptyRow]) {
          newBoard[emptyRow][c] = temp;
          emptyRow--;
        }
      }
    }
    for (let r = emptyRow; r >= 0; r--) {
      if (newBoard[r]) {
        newBoard[r][c] = createCandy();
        spawnedCount++;
      }
    }
  }

  return { newBoard, spawned: spawnedCount };
};

export const isAdjacent = (pos1: Position, pos2: Position): boolean => {
  const dr = Math.abs(pos1.row - pos2.row);
  const dc = Math.abs(pos1.col - pos2.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
};

export const serializeBoard = (board: BoardType): string => {
  return board.map(row => row ? row.map(c => {
    const char = c?.color.charAt(0).toUpperCase() || '.';
    if (c?.type === CandyType.BOMB) return char + '*';
    if (c?.type === CandyType.STRIPE_H) return char + '-';
    if (c?.type === CandyType.STRIPE_V) return char + '|';
    if (c?.type === CandyType.COLOR_BOMB) return char + '@';
    if (c?.type === CandyType.ROCK) return 'X';
    if (c?.type === CandyType.JELLY) return char + 'J';
    return char;
  }).join(' ') : '').join('\n');
};
