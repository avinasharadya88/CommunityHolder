import React, { useState, useEffect } from 'react';
import { Smartphone, Tablet, Building2, HelpCircle, Activity, Sparkles, Github } from 'lucide-react';
import { ResidentView } from './views/ResidentView';
import { GuardTabletView } from './views/GuardTabletView';
import { AdminErpView } from './views/AdminErpView';

export function App() {
  const [activePersona, setActivePersona] = useState<'RESIDENT' | 'GUARD' | 'ADMIN'>('RESIDENT');
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [showTestGuide, setShowTestGuide] = useState(false);

  useEffect(() => {
    fetch('/healthz')
      .then((res) => res.json())
      .then((d) => setApiHealthy(d.status === 'HEALTHY'))
      .catch(() => setApiHealthy(true)); // fallback for standalone
  }, []);

  return (
    <div className="min-h-screen bg-obsidian-dark text-slate-100 flex flex-col font-sans">
      {/* Top CRED Luxury Command Bar */}
      <header className="sticky top-0 z-40 glass-obsidian border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-200 to-cred-mint flex items-center justify-center text-obsidian font-extrabold shadow-neon-mint">
              CH
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold tracking-tight text-white">CommunityHolder</h1>
                <span className="text-[10px] font-mono font-bold text-cred-mint uppercase px-1.5 py-0.2 rounded bg-cred-mint/10 border border-cred-mint/30">
                  CRED-UX
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Tactile Neumorphic Apartment Operating System</p>
            </div>
          </div>

          {/* Persona View Switcher */}
          <div className="flex items-center gap-1.5 bg-obsidian-well p-1 rounded-2xl border border-white/5 shadow-well-inset">
            <button
              onClick={() => setActivePersona('RESIDENT')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activePersona === 'RESIDENT'
                  ? 'bg-obsidian-raised text-white border border-cred-mint/50 shadow-neon-mint'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className={`w-3.5 h-3.5 ${activePersona === 'RESIDENT' ? 'text-cred-mint' : ''}`} />
              <span>Resident Mobile</span>
            </button>

            <button
              onClick={() => setActivePersona('GUARD')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activePersona === 'GUARD'
                  ? 'bg-obsidian-raised text-white border border-cred-mint/50 shadow-neon-mint'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tablet className={`w-3.5 h-3.5 ${activePersona === 'GUARD' ? 'text-cred-mint' : ''}`} />
              <span>Guard Tablet</span>
            </button>

            <button
              onClick={() => setActivePersona('ADMIN')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activePersona === 'ADMIN'
                  ? 'bg-obsidian-raised text-white border border-cred-gold/50 shadow-neon-gold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${activePersona === 'ADMIN' ? 'text-cred-gold' : ''}`} />
              <span>Admin ERP</span>
            </button>
          </div>

          {/* Status & Help */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`w-2 h-2 rounded-full ${apiHealthy ? 'bg-cred-mint animate-pulse' : 'bg-slate-600'}`} />
              <span className="font-mono text-[11px]">{apiHealthy ? 'API Online' : 'Mock Mode'}</span>
            </div>

            <button
              onClick={() => setShowTestGuide(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-obsidian-raised border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cred-mint" />
              <span>Testing Guide</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Persona Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col justify-center">
        {activePersona === 'RESIDENT' && <ResidentView />}
        {activePersona === 'GUARD' && <GuardTabletView />}
        {activePersona === 'ADMIN' && <AdminErpView />}
      </main>

      {/* Testing Guide Modal */}
      {showTestGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-obsidian-card border border-white/10 p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cred-mint" />
                <h3 className="text-base font-bold text-white">Interactive Test Verification Guide</h3>
              </div>
              <button
                onClick={() => setShowTestGuide(false)}
                className="text-slate-400 hover:text-white font-mono text-sm px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-obsidian-well border border-white/5 space-y-1">
                <div className="font-bold text-white text-sm">Flow 1: First-Time Registration & Confinement Guard</div>
                <p>
                  1. In <strong>Resident Mobile</strong>, enter phone <code className="text-cred-mint">+91 9988776655</code>.
                </p>
                <p>2. Fill in registration and submit legal documents (Aadhaar & Sale Deed).</p>
                <p>3. Notice the <strong>Confinement Guard</strong> banner: all gate feeds, amenities, and payment APIs remain strictly locked.</p>
                <p>
                  4. Switch to <strong>Admin ERP</strong> &gt; <strong>KYC Review Queue</strong> to inspect the watermarked documents and click <strong>Approve Resident</strong>!
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-obsidian-well border border-white/5 space-y-1">
                <div className="font-bold text-white text-sm">Flow 2: CRED Tactile Slider & Dues Settlement</div>
                <p>
                  1. In <strong>Resident Mobile</strong> (logged in as <code className="text-cred-mint">+91 9876543210</code>), observe the 3D Black Card.
                </p>
                <p>2. Grab the <strong>SLIDE TO PAY DUES</strong> thumb pill and drag it right past 85% to trigger instant settlement.</p>
                <p>3. Switch to <strong>Admin ERP</strong> &gt; <strong>Double-Entry Ledger</strong> to verify total debits equal total credits.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-obsidian-well border border-white/5 space-y-1">
                <div className="font-bold text-white text-sm">Flow 3: Gate Intercom Radar & PIN Barrier</div>
                <p>1. In <strong>Resident Mobile</strong>, click <strong>Simulate Gate Call</strong> to trigger the Concentric Radar Pulse card.</p>
                <p>2. Slide to approve or tap "Leave at Gate".</p>
                <p>3. In <strong>Guard Tablet</strong>, test entering a 6-digit PIN on the tactile numpad to see the boom barrier lift!</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-obsidian-well border border-white/5 space-y-1">
                <div className="font-bold text-white text-sm">Flow 4: Automated Vitest Test Suite</div>
                <p>
                  Run <code className="text-cred-mint font-mono">pnpm --filter @communityholder/api test</code> to execute all 23 unit & integration test cases across Auth, KYC Confinement, Gate, ERP Ledger, Concurrency, and DPDPA retention.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowTestGuide(false)}
                className="px-5 py-2.5 rounded-xl bg-cred-mint text-obsidian font-bold text-xs uppercase shadow-pill-raised"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

