import React from 'react';

interface InsetWellProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'none' | 'mint' | 'crimson' | 'gold';
}

export const InsetWell: React.FC<InsetWellProps> = ({
  children,
  className = '',
  glow = 'none',
}) => {
  const glowStyles = {
    none: '',
    mint: 'border-cred-mint/30 shadow-neon-mint',
    crimson: 'border-cred-crimson/30 shadow-neon-crimson',
    gold: 'border-cred-gold/30 shadow-neon-gold',
  }[glow];

  return (
    <div
      className={`rounded-2xl border border-obsidian-border bg-obsidian-well p-4 shadow-well-inset transition-all ${glowStyles} ${className}`}
    >
      {children}
    </div>
  );
};

