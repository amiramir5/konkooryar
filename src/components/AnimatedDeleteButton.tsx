import React, { useState } from 'react';

interface AnimatedDeleteButtonProps {
  onDelete: () => void;
  title?: string;
  size?: 'sm' | 'md';
  confirmRequired?: boolean;
  className?: string;
}

/**
 * Animated delete button with Instagram/CodePen-style interactive micro-animation:
 * Animated SVG lid that opens on hover/click, vibration effect, and optional 
 * compact confirmation morphing without bulky buttons.
 */
export const AnimatedDeleteButton: React.FC<AnimatedDeleteButtonProps> = ({
  onDelete,
  title = 'حذف',
  size = 'md',
  confirmRequired = false,
  className = '',
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmRequired && !isConfirming) {
      setIsConfirming(true);
      return;
    }

    setIsDeleting(true);
    setTimeout(() => {
      onDelete();
      setIsDeleting(false);
      setIsConfirming(false);
    }, 350);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirming(false);
  };

  if (isConfirming) {
    return (
      <div
        className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-lg p-1 text-xs animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 px-1">
          حذف؟
        </span>
        <button
          type="button"
          onClick={handleClick}
          className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
        >
          بله
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-[11px] transition-colors cursor-pointer"
        >
          خیر
        </button>
      </div>
    );
  }

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
      className={`group relative inline-flex items-center justify-center rounded-lg transition-all cursor-pointer ${
        isSmall
          ? 'w-7 h-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50'
          : 'w-8 h-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/60 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/50'
      } ${isDeleting ? 'scale-90 opacity-40' : ''} ${className}`}
    >
      <svg
        className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} transition-transform duration-200 ${
          isDeleting ? 'animate-bounce' : ''
        }`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Animated Trash Lid */}
        <g
          className="transition-transform duration-200 origin-[4px_6px]"
          style={{
            transform: isHovered || isDeleting ? 'rotate(-25deg) translateY(-2px)' : 'none',
          }}
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </g>
        {/* Trash Can Body */}
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <line
          x1="10"
          y1="11"
          x2="10"
          y2="17"
          className={`transition-opacity duration-150 ${isHovered ? 'opacity-75' : 'opacity-40'}`}
        />
        <line
          x1="14"
          y1="11"
          x2="14"
          y2="17"
          className={`transition-opacity duration-150 ${isHovered ? 'opacity-75' : 'opacity-40'}`}
        />
      </svg>
    </button>
  );
};
