import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Check } from 'lucide-react';

interface CredSliderProps {
  label: string;
  confirmedLabel?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  variant?: 'mint' | 'crimson';
}

export const CredSlider: React.FC<CredSliderProps> = ({
  label,
  confirmedLabel = 'CONFIRMED',
  onConfirm,
  disabled = false,
  variant = 'mint',
}) => {
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const thumbSize = 48; // px

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || isConfirmed) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const maxDrag = rect.width - thumbSize - 8;
    const currentX = e.clientX - rect.left - thumbSize / 2;
    const progress = Math.max(0, Math.min(1, currentX / maxDrag));
    setDragProgress(progress);
  };

  const handlePointerUp = async () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragProgress > 0.8) {
      setDragProgress(1);
      setIsConfirmed(true);
      try {
        await onConfirm();
      } catch (e) {
        setIsConfirmed(false);
        setDragProgress(0);
      }
    } else {
      // Spring back to start
      setDragProgress(0);
    }
  };

  return (
    <div
      ref={trackRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative h-14 w-full select-none overflow-hidden rounded-full border border-obsidian-border bg-obsidian-well p-1 shadow-well-inset transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* Background fill based on progress */}
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-75 ${
          variant === 'mint'
            ? 'bg-gradient-to-r from-cred-mint-dark/20 to-cred-mint/40'
            : 'bg-gradient-to-r from-cred-crimson/20 to-cred-crimson/40'
        }`}
        style={{ width: `${Math.max(thumbSize, dragProgress * 100)}%` }}
      />

      {/* Label text in center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className={`text-xs font-semibold tracking-widest uppercase transition-opacity duration-200 ${
            isConfirmed ? (variant === 'mint' ? 'text-cred-mint' : 'text-cred-crimson') : 'text-slate-400'
          }`}
          style={{ opacity: isConfirmed ? 1 : Math.max(0.2, 1 - dragProgress * 1.5) }}
        >
          {isConfirmed ? confirmedLabel : label}
        </span>
      </div>

      {/* Draggable thumb pill */}
      <div
        onPointerDown={handlePointerDown}
        className={`absolute top-1 bottom-1 flex items-center justify-center rounded-full transition-shadow duration-150 ${
          variant === 'mint'
            ? 'bg-gradient-to-br from-slate-200 to-cred-mint text-obsidian shadow-pill-raised shadow-cred-mint/30 hover:shadow-neon-mint'
            : 'bg-gradient-to-br from-slate-200 to-cred-crimson text-obsidian shadow-pill-raised shadow-cred-crimson/30 hover:shadow-neon-crimson'
        }`}
        style={{
          width: `${thumbSize}px`,
          height: `${thumbSize}px`,
          left: '4px',
          transform: `translateX(${dragProgress * ((trackRef.current?.clientWidth || 300) - thumbSize - 8)}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s ease-out',
        }}
      >
        {isConfirmed ? (
          <Check className="w-5 h-5 stroke-[3] text-obsidian animate-bounce" />
        ) : (
          <ChevronRight className="w-5 h-5 stroke-[2.5] text-obsidian animate-pulse" />
        )}
      </div>
    </div>
  );
};
