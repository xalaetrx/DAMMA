import React from 'react';
import { Piece as PieceType } from '../../types';
import './Piece.css';

interface PieceProps {
  piece: PieceType;
  isSelected: boolean;
}

const PieceComponent: React.FC<PieceProps> = ({ piece, isSelected }) => {
  const isWhite = piece.player === 'white';

  // Clean Matte Design
  const baseClasses = `
    w-full h-full rounded-full shadow-lg relative flex items-center justify-center
    transition-all duration-200 ease-out
    ${isSelected ? 'scale-110 shadow-xl z-20' : 'scale-100'}
  `;

  // White: Bone/Light Grey | Black: Dark Slate
  const colorClasses = isWhite
    ? 'bg-slate-200 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]'
    : 'bg-slate-800 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.5)] border border-slate-700';

  return (
    <div className={`${baseClasses} ${colorClasses}`}>

      {/* Inner Indent for realism */}
      <div className={`w-[70%] h-[70%] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${isWhite ? 'bg-slate-100' : 'bg-slate-900'} flex items-center justify-center`}>

        {/* King Icon (Crown) */}
        {piece.isKing && (
          <svg xmlns="http://www.w3.org/2000/svg" width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`animate-in zoom-in duration-300 ${isWhite ? 'text-indigo-500' : 'text-indigo-400'} drop-shadow-sm`}
          >
            <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
          </svg>
        )}

      </div>

      {/* King Halo (Clean Neon Ring) */}
      {piece.isKing && (
        <div className="absolute inset-[-4px] rounded-full border-[2px] border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-pulse"></div>
      )}
    </div>
  );
};

export default PieceComponent;
