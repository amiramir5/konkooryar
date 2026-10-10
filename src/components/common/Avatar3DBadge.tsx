import React from 'react';
import { User, Shield, Sparkles, Heart, Crown } from 'lucide-react';

interface Avatar3DBadgeProps {
  role: 'husband' | 'wife' | 'user' | 'partner';
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isStudying?: boolean;
  className?: string;
}

export const Avatar3DBadge: React.FC<Avatar3DBadgeProps> = ({
  role,
  name,
  size = 'md',
  isStudying = false,
  className = '',
}) => {
  const isMale = role === 'husband' || role === 'user';
  
  const sizeMap = {
    sm: {
      container: 'w-8 h-8 text-[10px]',
      icon: 'w-4 h-4',
      badge: 'w-2 h-2',
    },
    md: {
      container: 'w-11 h-11 text-xs',
      icon: 'w-5 h-5',
      badge: 'w-2.5 h-2.5',
    },
    lg: {
      container: 'w-14 h-14 text-sm',
      icon: 'w-7 h-7',
      badge: 'w-3 h-3',
    },
    xl: {
      container: 'w-20 h-20 text-base',
      icon: 'w-10 h-10',
      badge: 'w-4 h-4',
    },
  }[size];

  // Distinctive 3D gradient palettes
  const gradientClass = isMale
    ? 'from-blue-600 via-indigo-600 to-sky-700 text-white shadow-blue-500/30'
    : 'from-sky-500 via-blue-600 to-indigo-700 text-white shadow-sky-500/30';

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* 3D ambient layer & ring */}
      <div
        className={`relative ${sizeMap.container} rounded-2xl bg-gradient-to-br ${gradientClass} p-0.5 shadow-lg transition-transform duration-200 hover:scale-105 select-none`}
        style={{
          boxShadow: isStudying
            ? isMale
              ? '0 8px 20px -2px rgba(37, 99, 235, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
              : '0 8px 20px -2px rgba(14, 165, 233, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
            : '0 4px 12px -2px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
        }}
      >
        {/* Inner 3D specular highlight surface */}
        <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-white/20 via-transparent to-black/20 flex items-center justify-center relative overflow-hidden backdrop-blur-xs">
          {/* Top gloss arc */}
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-t-[14px]" />
          
          {/* 3D Modern Glyph */}
          <div className="relative z-10 flex flex-col items-center justify-center text-white drop-shadow-md">
            {isMale ? (
              <User className={sizeMap.icon} strokeWidth={2.4} />
            ) : (
              <Crown className={sizeMap.icon} strokeWidth={2.2} />
            )}
          </div>
        </div>
      </div>

      {/* Online/Studying Pulse Indicator */}
      {isStudying && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${sizeMap.badge} rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-sm animate-pulse`}
          title="در حال مطالعه زنده"
        />
      )}
    </div>
  );
};
