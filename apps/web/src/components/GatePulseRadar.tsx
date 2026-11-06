import React from 'react';
import { ShieldCheck, XCircle, PackageCheck, Car, User, Clock } from 'lucide-react';
import { CredSlider } from './CredSlider';

export interface GateAlertProps {
  sessionId: string;
  visitorName: string;
  visitorType: 'GUEST' | 'DELIVERY' | 'CAB' | 'SERVICE';
  deliveryCompany?: string;
  vehicleNumber?: string;
  photoUrl?: string;
  unitNumber: string;
  timestamp: string;
  onDecision: (decision: 'APPROVE' | 'DENY' | 'LEAVE_AT_GATE') => void;
}

export const GatePulseRadar: React.FC<GateAlertProps> = ({
  visitorName,
  visitorType,
  deliveryCompany,
  vehicleNumber,
  photoUrl,
  unitNumber,
  onDecision,
}) => {
  return (
    <div className="relative w-full rounded-2xl border border-cred-mint/30 bg-gradient-to-b from-[#12161F] to-[#0A0D12] p-5 shadow-2xl overflow-hidden">
      {/* Concentric radar pulse background */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full border border-cred-mint/40 animate-pulse-ring" />
          <div className="absolute w-36 h-36 rounded-full border border-cred-mint/20 animate-pulse-ring" style={{ animationDelay: '0.6s' }} />
          <div className="absolute w-48 h-48 rounded-full border border-cred-mint/10 animate-pulse-ring" style={{ animationDelay: '1.2s' }} />
        </div>
      </div>

      {/* Header status */}
      <div className="flex items-center justify-between z-10 relative mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cred-mint opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cred-mint"></span>
          </span>
          <span className="text-[11px] font-bold tracking-widest text-cred-mint uppercase">
            LIVE GATE INTERCOM CALL
          </span>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-obsidian-well px-2 py-0.5 rounded border border-white/5">
          {unitNumber}
        </span>
      </div>

      {/* Visitor Snapshot and Details */}
      <div className="relative z-10 flex items-center gap-4 my-3">
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-cred-mint/60 shadow-neon-mint bg-obsidian-raised flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={visitorName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-obsidian-card text-cred-mint">
              <User className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-base font-bold text-white truncate">{visitorName}</h4>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-medium text-cred-gold">
              {deliveryCompany || visitorType}
            </span>
            {vehicleNumber && (
              <span className="font-mono text-slate-400 flex items-center gap-1">
                <Car className="w-3 h-3 text-slate-500" />
                {vehicleNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CRED Slide-to-Approve Control */}
      <div className="relative z-10 mt-5 space-y-2.5">
        <CredSlider
          label="SLIDE TO APPROVE ENTRY"
          confirmedLabel="ENTRY APPROVED"
          onConfirm={() => onDecision('APPROVE')}
          variant="mint"
        />

        {/* Secondary options */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {visitorType === 'DELIVERY' && (
            <button
              onClick={() => onDecision('LEAVE_AT_GATE')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-obsidian-raised border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <PackageCheck className="w-3.5 h-3.5 text-cred-gold" />
              <span>Leave at Gate</span>
            </button>
          )}
          <button
            onClick={() => onDecision('DENY')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-obsidian-raised border border-white/10 text-xs font-semibold text-cred-crimson hover:bg-cred-crimson/10 transition ${
              visitorType !== 'DELIVERY' ? 'col-span-2' : ''
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Deny Access</span>
          </button>
        </div>
      </div>
    </div>
  );
};

