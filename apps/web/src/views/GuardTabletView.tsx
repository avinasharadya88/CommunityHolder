import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  UserPlus,
  Clock,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Package,
  Wifi,
  WifiOff,
  RefreshCw,
  Search,
  Check,
  ChevronRight,
  Car,
  Building2,
  LogIn,
  LogOut,
} from 'lucide-react';
import { api } from '../api/client';
import { InsetWell } from '../components/InsetWell';

export const GuardTabletView: React.FC = () => {
  // Tabs: 'PIN_VALIDATOR' | 'WALK_IN' | 'ACTIVE_VISITORS' | 'PARCELS'
  const [activeTab, setActiveTab] = useState<'PIN_VALIDATOR' | 'WALK_IN' | 'ACTIVE_VISITORS' | 'PARCELS'>('PIN_VALIDATOR');

  // Guard Station Auth & Apartment State
  const [isStationLoggedIn, setIsStationLoggedIn] = useState(true);
  const [officerName, setOfficerName] = useState('Ramesh Singh');
  const [stationGate, setStationGate] = useState('NORTH GATE');
  const [societies, setSocieties] = useState<any[]>([
    { id: 'soc_prestige_greenwoods', name: 'Generic Apartment name', code: 'GEN-APT-01' },
    { id: 'soc_silver_oak', name: 'Silver Oak Heights', code: 'SLV-OAK-02' },
    { id: 'soc_palm_meadows', name: 'Palm Meadows Residency', code: 'PLM-MDW-03' },
  ]);
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>(
    api.getSelectedSocietyId()
  );
  const [selectedSocietyName, setSelectedSocietyName] = useState<string>(
    api.getSelectedSocietyName()
  );

  useEffect(() => {
    api.getSocieties().then((list) => {
      if (list && list.length > 0) {
        setSocieties(list);
        const match = list.find((s) => s.id === selectedSocietyId);
        if (match) {
          setSelectedSocietyName(match.name);
          api.setSelectedSociety(match.id, match.name);
        }
      }
    }).catch(() => {});
  }, []);

  const handleSocietyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const socId = e.target.value;
    const soc = societies.find((s) => s.id === socId);
    setSelectedSocietyId(socId);
    if (soc) {
      setSelectedSocietyName(soc.name);
      api.setSelectedSociety(soc.id, soc.name);
    }
  };

  // PIN Barrier Numpad State
  const [pinDigits, setPinDigits] = useState('');
  const [barrierStatus, setBarrierStatus] = useState<'IDLE' | 'VERIFYING' | 'GRANTED' | 'DENIED'>('IDLE');
  const [barrierMessage, setBarrierMessage] = useState('');

  // Walk-in Check-in State
  const [walkinType, setWalkinType] = useState<'DELIVERY' | 'GUEST' | 'CAB' | 'SERVICE'>('DELIVERY');
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinVehicle, setWalkinVehicle] = useState('');
  const [walkinUnit, setWalkinUnit] = useState('unit_alpha_1204');
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);
  const [walkinSuccess, setWalkinSuccess] = useState(false);

  // Active Visitors & Overstay State
  const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
  const [loadingActive, setLoadingActive] = useState(false);

  // Parcel Drop-off State
  const [parcelUnit, setParcelUnit] = useState('unit_alpha_1204');
  const [courierCompany, setCourierCompany] = useState('Amazon');
  const [lastLoggedParcel, setLastLoggedParcel] = useState<any | null>(null);

  // Offline Sync State
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  useEffect(() => {
    loadActiveVisitors();
  }, []);

  const loadActiveVisitors = async () => {
    setLoadingActive(true);
    try {
      const res = await api.getActiveVisitors();
      setActiveVisitors(res.visitors || []);
    } catch (e) {
      // Demo defaults
      setActiveVisitors([
        {
          id: 'v1',
          visitor_name: 'Zomato Rider (Mukesh)',
          visitor_type: 'DELIVERY',
          unit_id: 'unit_alpha_1204',
          duration_minutes: 38,
          is_overstay: true,
          status: 'OVERSTAY',
          vehicle_number: 'KA-04-E-1982',
        },
        {
          id: 'v2',
          visitor_name: 'Priya Sharma (Guest)',
          visitor_type: 'GUEST',
          unit_id: 'unit_alpha_1204',
          duration_minutes: 12,
          is_overstay: false,
          status: 'CHECKED_IN',
        },
      ]);
    } finally {
      setLoadingActive(false);
    }
  };

  const handleNumpadPress = (digit: string) => {
    if (pinDigits.length < 6) {
      setPinDigits((prev) => prev + digit);
    }
  };

  const handleClearPin = () => {
    setPinDigits('');
    setBarrierStatus('IDLE');
    setBarrierMessage('');
  };

  const handleValidatePin = async () => {
    if (pinDigits.length < 6) return;
    setBarrierStatus('VERIFYING');
    try {
      const res = await api.validatePin(pinDigits);
      setBarrierStatus('GRANTED');
      setBarrierMessage(`VALID GUEST PASS: ${res.guest_name} (${res.unit_number || 'Flat 1204'})`);
      setTimeout(() => {
        handleClearPin();
      }, 4000);
    } catch (err: any) {
      setBarrierStatus('DENIED');
      setBarrierMessage(err.message || 'INVALID OR EXPIRED PIN');
    }
  };

  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinName) return;
    setWalkinSubmitting(true);
    try {
      await api.createVisitorPass({
        society_id: selectedSocietyId || 'soc_prestige_greenwoods',
        unit_id: walkinUnit,
        visitor_type: walkinType,
        visitor_name: walkinName,
        visitor_phone: walkinPhone || '+919900011222',
        vehicle_number: walkinVehicle,
        photo_url: snapshotTaken
          ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'
          : undefined,
        is_pre_approved: false,
      });
      setWalkinSuccess(true);
      setWalkinName('');
      setWalkinVehicle('');
      setWalkinPhone('');
      setSnapshotTaken(false);
      setTimeout(() => setWalkinSuccess(false), 3000);
      loadActiveVisitors();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setWalkinSubmitting(false);
    }
  };

  const handleLogParcel = async () => {
    try {
      const res = await api.logParcel({
        society_id: selectedSocietyId || 'soc_prestige_greenwoods',
        unit_id: parcelUnit,
        courier_company: courierCompany,
        photo_url: 'https://cdn.communityholder.com/parcels/sample.jpg',
      });
      setLastLoggedParcel(res);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!isStationLoggedIn) {
    return (
      <div className="w-full max-w-md mx-auto p-6 my-8 rounded-3xl bg-obsidian-card border border-white/10 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-cred-mint/10 border border-cred-mint/30 flex items-center justify-center text-cred-mint">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">GUARD STATION LOGIN</h2>
          <p className="text-xs text-slate-400">Select apartment & activate guard tablet console</p>
        </div>

        <div className="space-y-4">
          <InsetWell>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Select Apartment / Society
            </label>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cred-mint flex-shrink-0" />
              <select
                value={selectedSocietyId}
                onChange={handleSocietyChange}
                className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
              >
                {societies.map((s) => (
                  <option key={s.id} value={s.id} className="bg-obsidian text-white">
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </InsetWell>

          <InsetWell>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Gate Post Station
            </label>
            <select
              value={stationGate}
              onChange={(e) => setStationGate(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="NORTH GATE" className="bg-obsidian text-white">North Gate • Tablet #01</option>
              <option value="MAIN GATE" className="bg-obsidian text-white">Main Boom Barrier • Tablet #02</option>
              <option value="SOUTH SERVICE GATE" className="bg-obsidian text-white">South Service Gate • Tablet #03</option>
            </select>
          </InsetWell>

          <InsetWell>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Officer On Duty
            </label>
            <input
              type="text"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none"
            />
          </InsetWell>

          <button
            onClick={() => setIsStationLoggedIn(true)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cred-mint-dark to-cred-mint text-obsidian font-extrabold text-sm uppercase tracking-wider shadow-pill-raised hover:shadow-neon-mint transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Activate Guard Station</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Tablet Top Header Console */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-obsidian-card border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cred-mint/10 border border-cred-mint/30 flex items-center justify-center text-cred-mint">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">GATEKEEPER STATION • {stationGate}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cred-mint/20 text-cred-mint border border-cred-mint/40">
                TABLET #01
              </span>
            </div>
            <p className="text-xs text-slate-400">{selectedSocietyName} • Security Officer: {officerName}</p>
          </div>
        </div>

        {/* Sync & Connectivity Status & Apartment Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-obsidian-well border border-white/5">
            <Building2 className="w-4 h-4 text-cred-mint flex-shrink-0" />
            <select
              value={selectedSocietyId}
              onChange={handleSocietyChange}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              {societies.map((s) => (
                <option key={s.id} value={s.id} className="bg-obsidian text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-obsidian-well border border-white/5 text-xs">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-cred-mint animate-pulse" />
                <span className="text-slate-300 font-medium">Cloud Synchronized</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-cred-amber" />
                <span className="text-cred-amber font-medium">Offline Queue ({offlineQueueCount})</span>
              </>
            )}
          </div>

          <button
            onClick={() => setIsOnline(!isOnline)}
            className="px-3 py-1.5 rounded-xl bg-obsidian-raised border border-white/10 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Toggle {isOnline ? 'Offline' : 'Online'} Mode
          </button>

          <button
            onClick={() => setIsStationLoggedIn(false)}
            title="Switch Guard Station or Apartment"
            className="p-2 rounded-xl bg-obsidian-raised border border-white/10 text-slate-400 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { key: 'PIN_VALIDATOR', label: 'Guest PIN Barrier', icon: KeyRound },
          { key: 'WALK_IN', label: 'Walk-In Check-In', icon: UserPlus },
          { key: 'ACTIVE_VISITORS', label: `Active & Overstay (${activeVisitors.length})`, icon: Clock },
          { key: 'PARCELS', label: 'Parcels & Deliveries', icon: Package },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-xs font-bold transition-all ${
                isActive
                  ? 'bg-obsidian-raised border-cred-mint text-white shadow-neon-mint'
                  : 'bg-obsidian-well border-white/5 text-slate-400 hover:text-white hover:border-white/10'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cred-mint' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PIN VALIDATOR & BARRIER CONTROL */}
      {activeTab === 'PIN_VALIDATOR' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Numpad Left Column */}
          <div className="md:col-span-7 space-y-4">
            <InsetWell glow={barrierStatus === 'GRANTED' ? 'mint' : barrierStatus === 'DENIED' ? 'crimson' : 'none'}>
              <div className="text-center space-y-2 py-2">
                <div className="text-xs uppercase font-mono tracking-widest text-slate-400">
                  Enter 6-Digit Pre-Approved Guest PIN
                </div>
                <div className="h-14 flex items-center justify-center font-mono text-4xl font-extrabold tracking-[0.5em] text-white">
                  {pinDigits.padEnd(6, '•')}
                </div>
              </div>
            </InsetWell>

            {/* Tactile Virtual Touch Numpad */}
            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '✓'].map((key) => {
                const isClear = key === 'C';
                const isSubmit = key === '✓';

                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isClear) handleClearPin();
                      else if (isSubmit) handleValidatePin();
                      else handleNumpadPress(key);
                    }}
                    className={`h-16 rounded-2xl border text-xl font-bold font-mono transition active:scale-95 shadow-md flex items-center justify-center ${
                      isSubmit
                        ? 'bg-gradient-to-r from-cred-mint-dark to-cred-mint text-obsidian border-cred-mint hover:shadow-neon-mint'
                        : isClear
                        ? 'bg-obsidian-raised border-cred-crimson/40 text-cred-crimson hover:bg-cred-crimson/10'
                        : 'bg-obsidian-raised border-white/5 text-white hover:bg-slate-800'
                    }`}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Barrier Status Right Column */}
          <div className="md:col-span-5 flex flex-col justify-between p-6 rounded-3xl bg-obsidian-card border border-white/10 shadow-xl space-y-4">
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Boom Barrier State</div>
              {barrierStatus === 'IDLE' && (
                <div className="p-6 rounded-2xl bg-obsidian-well border border-white/5 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="text-base font-bold text-white">Barrier Closed & Armed</div>
                  <p className="text-xs text-slate-400">Waiting for PIN entry or walk-in authorization.</p>
                </div>
              )}

              {barrierStatus === 'GRANTED' && (
                <div className="p-6 rounded-2xl bg-cred-mint/10 border border-cred-mint/50 text-center space-y-2 shadow-neon-mint">
                  <div className="w-12 h-12 rounded-full bg-cred-mint text-obsidian mx-auto flex items-center justify-center">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                  <div className="text-lg font-bold text-cred-mint">BOOM BARRIER OPENED</div>
                  <p className="text-xs text-white font-mono">{barrierMessage}</p>
                </div>
              )}

              {barrierStatus === 'DENIED' && (
                <div className="p-6 rounded-2xl bg-cred-crimson/10 border border-cred-crimson/50 text-center space-y-2 shadow-neon-crimson">
                  <div className="w-12 h-12 rounded-full bg-cred-crimson text-obsidian mx-auto flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div className="text-lg font-bold text-cred-crimson">ACCESS DENIED</div>
                  <p className="text-xs text-white font-mono">{barrierMessage}</p>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-white/5 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Fast Gate Sync:</span>
                <span className="text-cred-mint font-mono">Offline-First SQLite Cache</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Camera ANPR Feed:</span>
                <span className="text-slate-300 font-mono">Online • 1080p</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WALK-IN CHECK-IN */}
      {activeTab === 'WALK_IN' && (
        <div className="p-6 rounded-3xl bg-obsidian-card border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Manual Walk-in Visitor Check-in</h3>
              <p className="text-xs text-slate-400">Instant push notification & intercom call sent to resident's device</p>
            </div>
            {walkinSuccess && (
              <span className="px-3 py-1 rounded-full bg-cred-mint/20 border border-cred-mint/40 text-xs font-bold text-cred-mint">
                Push Alert Sent to Resident!
              </span>
            )}
          </div>

          <form onSubmit={handleWalkinSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsetWell>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Entry Category</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['DELIVERY', 'GUEST', 'CAB', 'SERVICE'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setWalkinType(cat)}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      walkinType === cat
                        ? 'bg-cred-mint text-obsidian'
                        : 'bg-obsidian-raised text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </InsetWell>

            <InsetWell>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Destination Unit</label>
              <select
                value={walkinUnit}
                onChange={(e) => setWalkinUnit(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-cred-mint focus:outline-none"
              >
                <option value="unit_alpha_1204" className="bg-obsidian text-white">Flat 1204 — Avinash Aradya</option>
                <option value="unit_alpha_101" className="bg-obsidian text-white">Flat 101 — Tower Alpha</option>
              </select>
            </InsetWell>

            <InsetWell>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Visitor Name / Courier</label>
              <input
                type="text"
                required
                value={walkinName}
                onChange={(e) => setWalkinName(e.target.value)}
                placeholder="e.g. Swiggy Rider - Rajesh"
                className="w-full bg-transparent text-sm text-white focus:outline-none"
              />
            </InsetWell>

            <InsetWell>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Vehicle Plate (Optional)</label>
              <input
                type="text"
                value={walkinVehicle}
                onChange={(e) => setWalkinVehicle(e.target.value)}
                placeholder="KA-01-AB-1234"
                className="w-full bg-transparent text-sm text-white font-mono focus:outline-none uppercase"
              />
            </InsetWell>

            {/* Camera Snapshot Simulation */}
            <div className="md:col-span-2">
              <InsetWell>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-obsidian-raised border border-white/10 flex items-center justify-center text-cred-mint">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Gate Camera Snapshot (DPDPA 2023 Compliant)</div>
                      <div className="text-[10px] text-slate-400">Captured face/license photo auto-purged after 90 days</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSnapshotTaken(!snapshotTaken)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      snapshotTaken
                        ? 'bg-cred-mint text-obsidian border-cred-mint font-bold'
                        : 'bg-obsidian-raised border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    {snapshotTaken ? 'Photo Captured ✓' : 'Take Photo'}
                  </button>
                </div>
              </InsetWell>
            </div>

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={walkinSubmitting || !walkinName}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cred-mint-dark to-cred-mint text-obsidian font-bold text-xs tracking-wider uppercase shadow-pill-raised hover:shadow-neon-mint transition disabled:opacity-50"
              >
                {walkinSubmitting ? 'Dispatching Intercom Call...' : 'Check In & Ring Resident Intercom'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: ACTIVE VISITORS & OVERSTAY MONITOR */}
      {activeTab === 'ACTIVE_VISITORS' && (
        <div className="p-6 rounded-3xl bg-obsidian-card border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Premises Occupancy & Overstay Monitor</h3>
              <p className="text-xs text-slate-400">Automated overstay warning for delivery personnel exceeding 30 minutes</p>
            </div>
            <button
              onClick={loadActiveVisitors}
              className="p-2 rounded-xl bg-obsidian-raised text-slate-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loadingActive ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            {activeVisitors.map((v) => (
              <div
                key={v.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  v.is_overstay
                    ? 'bg-gradient-to-r from-cred-crimson/15 to-obsidian-card border-cred-crimson/50 shadow-neon-crimson'
                    : 'bg-obsidian-well border-white/5'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                      v.is_overstay ? 'bg-cred-crimson text-white animate-pulse' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {v.is_overstay ? '!' : <Car className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{v.visitor_name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-300">
                        Flat 1204
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Type: {v.visitor_type}</span>
                      {v.vehicle_number && <span>• {v.vehicle_number}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-xs font-mono font-bold ${
                      v.is_overstay ? 'text-cred-crimson' : 'text-cred-mint'
                    }`}
                  >
                    Inside: {v.duration_minutes || 10} mins
                  </div>
                  {v.is_overstay && (
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cred-crimson/20 text-cred-crimson border border-cred-crimson/40">
                      OVERSTAY ALERT (&gt;30m)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PARCELS & DELIVERIES */}
      {activeTab === 'PARCELS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-obsidian-card border border-white/10 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Log Delivery Parcel at Gate</h3>
            <p className="text-xs text-slate-400">Generates 4-digit pickup OTP sent directly to resident</p>

            <InsetWell>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Destination Unit</label>
              <select
                value={parcelUnit}
                onChange={(e) => setParcelUnit(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-cred-mint focus:outline-none"
              >
                <option value="unit_alpha_1204" className="bg-obsidian text-white">Flat 1204 — Avinash Aradya</option>
                <option value="unit_alpha_101" className="bg-obsidian text-white">Flat 101 — Tower Alpha</option>
              </select>
            </InsetWell>

            <InsetWell>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Courier Partner</label>
              <select
                value={courierCompany}
                onChange={(e) => setCourierCompany(e.target.value)}
                className="w-full bg-transparent text-sm text-white focus:outline-none"
              >
                <option value="Amazon" className="bg-obsidian text-white">Amazon</option>
                <option value="Flipkart" className="bg-obsidian text-white">Flipkart</option>
                <option value="BlueDart" className="bg-obsidian text-white">BlueDart</option>
                <option value="Delhivery" className="bg-obsidian text-white">Delhivery</option>
              </select>
            </InsetWell>

            <button
              onClick={handleLogParcel}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cred-mint-dark to-cred-mint text-obsidian font-bold text-xs uppercase tracking-wider shadow-pill-raised hover:shadow-neon-mint"
            >
              Deposit Parcel & Issue OTP
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-obsidian-card border border-white/10 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white mb-2">Latest Logged Parcel</h3>
              {lastLoggedParcel ? (
                <div className="p-5 rounded-2xl bg-obsidian-well border border-cred-mint/40 space-y-3 shadow-neon-mint">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Parcel ID: {lastLoggedParcel.parcel_id.slice(0, 8)}...</span>
                    <span className="px-2 py-0.5 rounded bg-cred-mint/20 text-cred-mint text-[10px] font-bold">AT GATE</span>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-slate-500 font-bold">Resident Pickup OTP</div>
                    <div className="text-3xl font-mono font-bold text-cred-mint tracking-widest">{lastLoggedParcel.pickup_otp}</div>
                  </div>
                  <div className="text-xs text-slate-400">Deliver to Flat 1204 upon resident verification.</div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-white/10">
                  No parcel logged yet in this session.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500">
              Parcels stored securely in CCTV monitored gate storage bay.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

