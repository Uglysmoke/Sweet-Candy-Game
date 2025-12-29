
import React from 'react';
import { Candy, CandyColor, CandyType, Position } from '../types';
import { CANDY_STYLES, CandyIcon } from '../constants';

interface CandyPieceProps {
  candy: Candy | null;
  pos: Position;
  isSelected: boolean;
  isHinted: boolean;
  onClick: () => void;
  isMatched: boolean;
}

export const CandyPiece: React.FC<CandyPieceProps> = ({ 
  candy, 
  pos, 
  isSelected, 
  isHinted, 
  onClick, 
  isMatched 
}) => {
  if (!candy) return <div className="w-full h-full bg-white/10 rounded-lg" />;

  const isStripeH = candy.type === CandyType.STRIPE_H;
  const isStripeV = candy.type === CandyType.STRIPE_V;
  const isBomb = candy.type === CandyType.BOMB;
  const isColorBomb = candy.type === CandyType.COLOR_BOMB;
  const isRock = candy.type === CandyType.ROCK;
  const isJelly = candy.type === CandyType.JELLY;
  const isHealthyJelly = isJelly && (candy.health || 0) > 1;
  const isHealthyRock = isRock && (candy.health || 0) > 1;

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full h-full rounded-xl flex items-center justify-center
        transition-all duration-300 ease-out transform
        ${isColorBomb ? 'animate-rainbow' : isRock ? 'bg-gradient-to-br from-gray-400 to-gray-700 shadow-gray-500' : CANDY_STYLES[candy.color]}
        ${isSelected && !isRock ? 'scale-110 ring-4 ring-white z-10 shadow-xl' : 'scale-100'}
        ${isHinted ? 'animate-bounce-subtle ring-2 ring-yellow-400' : ''}
        ${isMatched ? 'animate-candy-match z-20' : 'opacity-100'}
        ${isBomb ? 'brightness-125 saturate-150' : ''}
        ${isRock ? 'cursor-default' : 'hover:brightness-110 active:scale-95'}
        shadow-md overflow-hidden
      `}
    >
      {/* Glossy Overlay */}
      {!isRock && <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />}

      {/* Jelly Overlay */}
      {isJelly && (
        <div className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-500 ${isHealthyJelly ? 'opacity-70' : 'opacity-30'}`}>
          <div className="w-full h-full bg-blue-300/40 backdrop-blur-[2px] rounded-xl border-2 border-white/40 shadow-inner" />
          <div className="absolute top-1 left-1 w-2 h-2 bg-white/60 rounded-full blur-[1px]" />
        </div>
      )}

      {/* Rock Cracks */}
      {isRock && !isHealthyRock && (
        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-40 pointer-events-none">
          <div className="w-full h-full border-2 border-white/20 rounded-xl" style={{ backgroundImage: 'linear-gradient(45deg, transparent 48%, white 50%, transparent 52%), linear-gradient(-45deg, transparent 48%, white 50%, transparent 52%)', backgroundSize: '15px 15px' }} />
        </div>
      )}

      {/* Stripe Overlays */}
      {isStripeH && (
        <div className="absolute inset-x-0 h-1 bg-white/40 shadow-[0_0_8px_white] z-10" />
      )}
      {isStripeV && (
        <div className="absolute inset-y-0 w-1 bg-white/40 shadow-[0_0_8px_white] z-10" />
      )}
      
      {/* Bomb Glow */}
      {isBomb && (
        <div className="absolute inset-0 bg-black/10 rounded-xl border-2 border-white/50 animate-pulse z-0" />
      )}

      <div className={`text-2xl drop-shadow-sm select-none z-10 
        ${isBomb ? 'scale-125' : ''}
        ${isColorBomb ? 'scale-110' : ''}
        ${isRock ? 'scale-90 opacity-60' : ''}
      `}>
        {isColorBomb ? '🍭' : isRock ? '🗿' : <CandyIcon color={candy.color} />}
      </div>

      {(isBomb || isColorBomb || isRock || isJelly) && (
         <div className={`absolute top-0 right-0 p-0.5 text-[7px] text-white leading-none rounded-bl-md font-bold
           ${isBomb ? 'bg-black/40' : isRock ? 'bg-gray-800' : 'bg-white/20 backdrop-blur-sm'}
         `}>
           {isBomb ? 'BOMB' : isColorBomb ? 'WILD' : isRock ? `HP:${candy.health}` : `GEL:${candy.health}`}
         </div>
      )}

      {isSelected && !isRock && (
        <div className="absolute inset-0 bg-white/20 rounded-xl animate-pulse z-20" />
      )}
    </button>
  );
};
