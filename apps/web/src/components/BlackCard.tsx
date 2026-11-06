import React from 'react';
import { Shield, Sparkles, Building2, CreditCard } from 'lucide-react';

interface BlackCardProps {
  societyName: string;
  unitNumber: string;
  residentName: string;
  vanNumber: string;
  duesAmount: number;
  currency?: string;
  onPayClick?: () => void;
}

export const BlackCard: React.FC<BlackCardProps> = ({
  societyName,
  unitNumber,
  residentName,
  vanNumber,
  duesAmount,
  currency = '₹',
}) => {
  // Format VAN like a card number
  const formattedVan = vanNumber.replace(/(.{4})/g, '$1 ').trim();

  return (
    <div className="relative group w-full max-w-sm mx-auto select-none perspective-1000">
      {/* Outer ambient glow */}
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cred-mint/20 via-cred-gold/10 to-cred-mint/20 opacity-50 blur-lg group-hover:opacity-80 transition duration-500" />

      {/* Main 3D Card Body */}
      <div className="relative flex flex-col justify-between h-56 w-full rounded-2xl p-6 bg-gradient-to-br from-[#1A202C] via-[#0E1217] to-[#070809] border border-white/10 shadow-2xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]">
        {/* Subtle holographic mesh overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, #00F29D 0%, transparent 40%), radial-gradient(circle at 80% 80%, #F6C876 0%, transparent 40%)',
          }}
        />

        {/* Top Header: Society & Chip */}
        <div className="flex items-start justify-between z-10">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-cred-mint uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>RESIDENT PRIVILEGE</span>
            </div>
            <h3 className="text-sm font-medium text-slate-300 mt-0.5">{societyName}</h3>
          </div>

          {/* EMV Gold Chip Icon */}
          <div className="w-10 h-7 rounded bg-gradient-to-br from-cred-gold via-yellow-600 to-yellow-800 p-1 flex flex-col justify-between border border-yellow-300/40 shadow-sm">
            <div className="h-0.5 bg-yellow-900/60 rounded" />
            <div className="h-1 border-y border-yellow-900/50" />
            <div className="h-0.5 bg-yellow-900/60 rounded" />
          </div>
        </div>

        {/* Card Middle: Unit & VAN */}
        <div className="z-10 my-auto">
          <div className="text-xl font-bold tracking-tight text-white flex items-baseline gap-2">
            <span>{unitNumber}</span>
            <span className="text-xs font-normal text-slate-400">Primary Resident</span>
          </div>
          <div className="mt-1 font-mono text-xs tracking-widest text-slate-400">
            {formattedVan || 'CHOL DRBL R120 4000'}
          </div>
        </div>

        {/* Bottom Footer: Member Name & Outstanding Dues */}
        <div className="flex items-end justify-between z-10 pt-2 border-t border-white/5">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Resident Member</div>
            <div className="text-sm font-semibold text-slate-200 capitalize">{residentName}</div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Dues Balance</div>
            <div className="text-base font-bold text-cred-mint">
              {duesAmount > 0 ? (
                <span>
                  {currency}
                  {duesAmount.toLocaleString()}
                </span>
              ) : (
                <span className="text-xs text-slate-400 font-normal">All Dues Cleared</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

