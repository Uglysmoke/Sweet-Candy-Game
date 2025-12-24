
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

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full h-full rounded-xl flex items-center justify-center
        transition-all duration-300 ease-out transform
        ${isColorBomb ? 'animate-rainbow' : CANDY_STYLES[candy.color]}
        ${isSelected ? 'scale-110 ring-4 ring-white z-10 shadow-xl' : 'scale-100'}
        ${isHinted ? 'animate-bounce-subtle ring-2 ring-yellow-400' : ''}
        ${isMatched ? 'opacity-0 scale-50 rotate-90' : 'opacity-100'}
        ${isBomb ? 'brightness-125 saturate-150' : ''}
        hover:brightness-110 active:scale-95 shadow-md overflow-hidden
      `}
    >
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />

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

      {/* Color Bomb Sprinkles Effect */}
      {isColorBomb && (
        <div className="absolute inset-0 flex items-center justify-center opacity-50 z-0">
          <div className="w-full h-full bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:6px_6px]" />
        </div>
      )}

      <div className={`text-2xl drop-shadow-sm select-none z-10 
        ${isBomb ? 'scale-125' : ''}
        ${isColorBomb ? 'scale-110' : ''}
      `}>
        {isColorBomb ? '🍭' : <CandyIcon color={candy.color} />}
      </div>

      {(isBomb || isColorBomb) && (
         <div className={`absolute top-0 right-0 p-0.5 text-[8px] text-white leading-none rounded-bl-lg font-bold
           ${isBomb ? 'bg-black/40' : 'bg-white/20 backdrop-blur-sm'}
         `}>
           {isBomb ? 'BOMB' : 'WILD'}
         </div>
      )}

      {isSelected && (
        <div className="absolute inset-0 bg-white/20 rounded-xl animate-pulse z-20" />
      )}
    </button>
  );
};
