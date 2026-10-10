import React from 'react';
import { SubjectInfo } from '../../types';
import { getSubject } from '../../lib/constants';

interface Subject3DIconProps {
  subject: string | SubjectInfo;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

export const Subject3DIcon: React.FC<Subject3DIconProps> = ({
  subject,
  size = 'sm',
  className = '',
  showTooltip = false,
}) => {
  const subj = typeof subject === 'string' ? getSubject(subject) : subject;
  const icon = subj.icon3d || '📚';

  const sizeClasses = {
    xs: 'w-5 h-5 text-[11px] rounded-md shadow-xs',
    sm: 'w-7 h-7 text-[14px] rounded-lg shadow-sm',
    md: 'w-9 h-9 text-[18px] rounded-xl shadow-md',
    lg: 'w-11 h-11 text-[22px] rounded-2xl shadow-lg',
  }[size];

  return (
    <span
      title={showTooltip ? `${subj.name} (${subj.categoryLabel || 'درس'})` : undefined}
      className={`inline-flex items-center justify-center shrink-0 select-none relative overflow-hidden transition-transform duration-200 hover:scale-105 ${sizeClasses} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${subj.c1 || subj.color} 0%, ${subj.c2 || subj.color} 100%)`,
        borderTop: '1px solid rgba(255, 255, 255, 0.45)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.25)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.25)',
        boxShadow: `0 3px 8px -2px ${subj.color}45, inset 0 1px 1.5px rgba(255,255,255,0.4), inset 0 -2px 3px rgba(0,0,0,0.25)`,
      }}
    >
      {/* 3D Gloss Highlight Sheen */}
      <span
        className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-inherit opacity-30"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)',
        }}
      />
      {/* 3D Emoji glyph with slight drop shadow */}
      <span
        className="relative z-10 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] leading-none transform transition-transform"
        role="img"
        aria-label={subj.name}
      >
        {icon}
      </span>
    </span>
  );
};
