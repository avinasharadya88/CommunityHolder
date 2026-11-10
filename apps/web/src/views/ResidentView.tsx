import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  UserCheck,
  QrCode,
  Package,
  Plus,
  RefreshCw,
  Clock,
  ArrowRight,
  LogOut,
  Upload,
  FileText,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { api, UserSession } from '../api/client';
import { BlackCard } from '../components/BlackCard';
import { CredSlider } from '../components/CredSlider';
import { InsetWell } from '../components/InsetWell';
import { GatePulseRadar } from '../components/GatePulseRadar';

export const ResidentView: React.FC = () => {
  // Session State
  const [user, setUser] = useState<UserSession | null>(api.getUser());
  const [phoneCountry, setPhoneCountry] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('9876543210');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Societies State
  const [societies, setSocieties] = useState<any[]>([
    { id: 'soc_prestige_greenwoods', name: 'Generic Apartment name', code: 'GEN-APT-01' },
    { id: 'soc_silver_oak', name: 'Silver Oak Heights', code: 'SLV-OAK-02' },
    { id: 'soc_palm_meadows', name: 'Palm Meadows Residency', code: 'PLM-MDW-03' },
  ]);
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>(
    user?.active_society_id || api.getSelectedSocietyId()
  );
  const [selectedSocietyName, setSelectedSocietyName] = useState<string>(
    api.getSelectedSocietyName()
  );

  // KYC Form State (for unregistered users)
  const [fullName, setFullName] = useState('Aditi Rao');
  const [unitNumber, setUnitNumber] = useState('Flat 101');
  const [relationshipType, setRelationshipType] = useState('PRIMARY_OWNER');
  const [uploadedGovtId, setUploadedGovtId] = useState('aadhaar_front.pdf');
  const [uploadedPropertyProof, setUploadedPropertyProof] = useState('sale_deed_reg.pdf');
  const [kycSubmitting, setKycSubmitting] = useState(false);

  // Super App State (for approved users)
  const [invoices, setInvoices] = useState<any[]>([]);
  const [advanceBalance, setAdvanceBalance] = useState(0);
  const [activeGateCall, setActiveGateCall] = useState<any | null>(null);
  const [generatedPass, setGeneratedPass] = useState<any | null>(null);
  const [showPassModal, setShowPassModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestType, setGuestType] = useState('GUEST');
  const [parcels, setParcels] = useState<any[]>([
    { id: 'p1', courier_company: 'Amazon', pickup_otp: '7821', status: 'AT_GATE' },
  ]);
  const [duesPaid, setDuesPaid] = useState(false);

  // Sync state with API
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

  useEffect(() => {
    if (user && user.kyc_status === 'APPROVED') {
      loadResidentData();
    }
  }, [user]);

  const loadResidentData = async () => {
    try {
      const data = await api.getUnitInvoices(user?.unit_id || 'unit_alpha_1204');
      setInvoices(data.invoices || []);
      setAdvanceBalance(data.advance_wallet_balance || 0);
    } catch (e) {
      // In standalone demo, keep default
    }
  };

  const handleRequestOtp = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await api.requestOtp(`${phoneCountry}${phoneNumber}`);
      setOtpSent(true);
      if (res.otp_code) {
        setOtpCode(res.otp_code); // auto-fill for testing/demo
      }
    } catch (e: any) {
      setAuthError(e.message || 'Failed to dispatch OTP');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await api.verifyOtp(`${phoneCountry}${phoneNumber}`, otpCode, selectedSocietyId);
      setUser(res.user);
    } catch (e: any) {
      setAuthError(e.message || 'Invalid verification code');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKycSubmitting(true);
    try {
      await api.submitKyc({
        full_name: fullName,
        society_id: selectedSocietyId || 'soc_prestige_greenwoods',
        block_id: 'block_tower_alpha',
        unit_id: 'unit_alpha_101',
        relationship_type: relationshipType,
        documents: [
          {
            document_category: 'GOVERNMENT_ID',
            document_type: 'AADHAAR',
            document_identifier_masked: 'XXXX-XXXX-9012',
            file_url: uploadedGovtId,
            file_sha256: 'sha256_mock_hash_1',
            file_size_bytes: 1024 * 1024,
            mime_type: 'application/pdf',
          },
          {
            document_category: 'PROPERTY_PROOF',
            document_type: 'SALE_DEED',
            document_identifier_masked: 'REG/2026/BLR/912',
            file_url: uploadedPropertyProof,
            file_sha256: 'sha256_mock_hash_2',
            file_size_bytes: 2 * 1024 * 1024,
            mime_type: 'application/pdf',
          },
        ],
      });
      // Refresh status
      const updated = await api.getKycStatus();
      if (user) {
        setUser({ ...user, kyc_status: updated.kyc_status });
      }
    } catch (e: any) {
      alert(e.message || 'KYC submission failed');
    } finally {
      setKycSubmitting(false);
    }
  };

  const handlePayDues = async () => {
    try {
      const pending = invoices.find((i) => i.status === 'ISSUED');
      if (pending) {
        await api.settlePayment(pending.id, pending.total_amount);
      }
      setDuesPaid(true);
      await loadResidentData();
    } catch (e) {
      setDuesPaid(true);
    }
  };

  const handleSimulateVisitor = () => {
    setActiveGateCall({
      sessionId: `sess_${Date.now()}`,
      visitorName: 'Mahesh (Swiggy Delivery)',
      visitorType: 'DELIVERY',
      deliveryCompany: 'Swiggy Instamart',
      vehicleNumber: 'KA-03-HA-8192',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
      unitNumber: 'Flat 1204',
      timestamp: 'Just now',
    });
  };

  const handleVisitorDecision = async (decision: 'APPROVE' | 'DENY' | 'LEAVE_AT_GATE') => {
    if (activeGateCall?.sessionId) {
      try {
        await api.decideVisitor(activeGateCall.sessionId, decision);
      } catch (e) {
        // ignore
      }
    }
    setActiveGateCall(null);
  };

  const handleCreateGuestPass = async () => {
    if (!guestName) return;
    try {
      const res = await api.createVisitorPass({
        society_id: selectedSocietyId || 'soc_prestige_greenwoods',
        unit_id: user?.unit_id || 'unit_alpha_1204',
        visitor_type: guestType,
        visitor_name: guestName,
        is_pre_approved: true,
      });
      setGeneratedPass(res);
      setShowPassModal(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="flex justify-center items-center py-2 sm:py-6 px-1 sm:px-4 w-full">
      {/* Smartphone Device Frame Simulator - Full screen on mobile, iPhone frame on desktop */}
      <div className="relative w-full max-w-[420px] sm:w-[390px] min-h-[calc(100vh-6rem)] sm:h-[820px] rounded-3xl sm:rounded-[48px] bg-black p-2 sm:p-3.5 shadow-2xl sm:ring-1 ring-white/20 overflow-hidden flex flex-col">
        {/* Physical phone camera notch / Dynamic Island (desktop mockup only) */}
        <div className="hidden sm:flex absolute top-5 left-1/2 -translate-x-1/2 w-28 h-6 bg-obsidian-dark rounded-full z-50 items-center justify-between px-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
          <div className="w-2 h-2 rounded-full bg-blue-900/60" />
        </div>

        {/* Screen Content Area */}
        <div className="relative flex-1 w-full rounded-2xl sm:rounded-[38px] bg-obsidian-dark text-slate-100 flex flex-col overflow-y-auto overflow-x-hidden pt-3 sm:pt-8 pb-4 px-3 sm:px-4 scrollbar-none">
          {/* Status Bar (desktop mockup only) */}
          <div className="hidden sm:flex items-center justify-between text-[11px] font-mono text-slate-400 px-2 mb-3">
            <span>09:41</span>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-5 h-2.5 rounded-sm border border-slate-400 p-0.5">
                <div className="h-full w-full bg-slate-400 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* 1. NOT LOGGED IN: Phone OTP Authentication */}
          {!user && (
            <div className="flex-1 flex flex-col justify-center space-y-6 px-1">
              <div>
                <div className="flex items-center gap-2 text-cred-mint mb-2">
                  <Smartphone className="w-5 h-5" />
                  <span className="text-xs font-bold tracking-widest uppercase">STRICT PHONE AUTH</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Experience Dark Luxury Living</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Passwordless 6-digit OTP verification with global E.164 country support.
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-cred-crimson/10 border border-cred-crimson/30 text-xs text-cred-crimson flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {!otpSent ? (
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
                      Mobile Number
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={phoneCountry}
                        onChange={(e) => setPhoneCountry(e.target.value)}
                        className="bg-transparent text-sm font-semibold text-cred-mint focus:outline-none cursor-pointer"
                      >
                        <option value="+91" className="bg-obsidian text-white">🇮🇳 +91</option>
                        <option value="+1" className="bg-obsidian text-white">🇺🇸 +1</option>
                        <option value="+971" className="bg-obsidian text-white">🇦🇪 +971</option>
                        <option value="+44" className="bg-obsidian text-white">🇬🇧 +44</option>
                        <option value="+65" className="bg-obsidian text-white">🇸🇬 +65</option>
                      </select>
                      <span className="text-slate-600">|</span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="9876543210"
                        className="flex-1 bg-transparent text-sm font-mono text-white placeholder-slate-600 focus:outline-none"
                      />
                    </div>
                  </InsetWell>

                  <button
                    onClick={handleRequestOtp}
                    disabled={authLoading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cred-mint-dark to-cred-mint text-obsidian font-bold text-xs tracking-wider uppercase shadow-pill-raised hover:shadow-neon-mint transition"
                  >
                    {authLoading ? 'Dispatching OTP...' : 'Send 6-Digit OTP'}
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-[11px] text-slate-500">
                      Quick test numbers: <span className="text-slate-300 font-mono">+919876543210</span> (Resident) or{' '}
                      <span className="text-slate-300 font-mono">+919988776655</span> (New)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <InsetWell glow="mint">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                      Enter 6-Digit OTP sent to {phoneCountry} {phoneNumber}
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="491823"
                      className="w-full bg-transparent text-center font-mono text-2xl font-bold tracking-[0.4em] text-cred-mint focus:outline-none"
                    />
                  </InsetWell>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={authLoading || otpCode.length < 6}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cred-mint-dark to-cred-mint text-obsidian font-bold text-xs tracking-wider uppercase shadow-pill-raised hover:shadow-neon-mint transition disabled:opacity-50"
                  >
                    {authLoading ? 'Verifying...' : 'Verify & Unlock Pass'}
                  </button>

                  <button
                    onClick={() => setOtpSent(false)}
                    className="w-full text-center text-xs text-slate-400 hover:text-white"
                  >
                    Change Phone Number
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. LOGGED IN BUT UNREGISTERED: First-Time KYC Registration */}
          {user && user.kyc_status === 'UNREGISTERED' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">First-Time Resident KYC</h3>
                  <p className="text-xs text-slate-400">Mandatory verification for community access</p>
                </div>
                <button
                  onClick={() => {
                    api.clearSession();
                    setUser(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleKycSubmit} className="space-y-3">
                <InsetWell>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                  />
                </InsetWell>

                <div className="grid grid-cols-2 gap-2">
                  <InsetWell>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Flat / Unit</label>
                    <input
                      type="text"
                      required
                      value={unitNumber}
                      onChange={(e) => setUnitNumber(e.target.value)}
                      className="w-full bg-transparent text-sm text-white focus:outline-none font-mono"
                    />
                  </InsetWell>

                  <InsetWell>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Role</label>
                    <select
                      value={relationshipType}
                      onChange={(e) => setRelationshipType(e.target.value)}
                      className="w-full bg-transparent text-xs text-cred-mint focus:outline-none"
                    >
                      <option value="PRIMARY_OWNER" className="bg-obsidian text-white">Owner</option>
                      <option value="TENANT" className="bg-obsidian text-white">Tenant</option>
                    </select>
                  </InsetWell>
                </div>

                <InsetWell>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    1. Government ID Proof (Aadhaar / Passport)
                  </label>
                  <div className="flex items-center justify-between text-xs text-slate-300 py-1">
                    <span className="flex items-center gap-1.5 text-cred-mint font-mono">
                      <FileText className="w-3.5 h-3.5" />
                      {uploadedGovtId}
                    </span>
                    <span className="text-[10px] text-slate-500">Ready</span>
                  </div>
                </InsetWell>

                <InsetWell>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    2. Property Proof (Sale Deed / Rental Agreement)
                  </label>
                  <div className="flex items-center justify-between text-xs text-slate-300 py-1">
                    <span className="flex items-center gap-1.5 text-cred-mint font-mono">
                      <FileText className="w-3.5 h-3.5" />
                      {uploadedPropertyProof}
                    </span>
                    <span className="text-[10px] text-slate-500">Ready</span>
                  </div>
                </InsetWell>

                <button
                  type="submit"
                  disabled={kycSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cred-mint-dark to-cred-mint text-obsidian font-bold text-xs tracking-wider uppercase shadow-pill-raised hover:shadow-neon-mint transition"
                >
                  {kycSubmitting ? 'Uploading & Encrypting...' : 'Submit Documents For Manual Approval'}
                </button>
              </form>
            </div>
          )}

          {/* 3. LOGGED IN BUT PENDING MANUAL APPROVAL: Confinement Screen */}
          {user && user.kyc_status === 'PENDING_VERIFICATION' && (
            <div className="flex-1 flex flex-col justify-between py-4 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cred-amber">
                    <Clock className="w-5 h-5 animate-spin" />
                    <span className="text-xs font-bold tracking-widest uppercase">CONFINEMENT GUARD</span>
                  </div>
                  <button
                    onClick={() => {
                      api.clearSession();
                      setUser(null);
                    }}
                    className="p-1 rounded text-slate-500 hover:text-white"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-950/30 to-obsidian-card border border-amber-500/30 shadow-2xl">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-cred-amber mb-3">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Manual Verification Pending</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Your registration documents for <span className="text-white font-semibold">Flat 101</span> have been securely vaulted.
                  </p>
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <span>Facility Manager SLA:</span>
                    <span className="text-cred-amber font-mono font-semibold">Under 24 Hours</span>
                  </div>
                </div>

                <InsetWell>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Gate Feeds & Super App Status</span>
                  <div className="space-y-2 text-xs text-slate-400">
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span>Gate Intercom Access</span>
                      <span className="text-cred-crimson font-medium">Locked</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span>Clubhouse Amenities</span>
                      <span className="text-cred-crimson font-medium">Locked</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>Maintenance Payments</span>
                      <span className="text-cred-crimson font-medium">Locked</span>
                    </div>
                  </div>
                </InsetWell>
              </div>

              <div className="space-y-2">
                <button
                  onClick={async () => {
                    const status = await api.getKycStatus();
                    setUser({ ...user, kyc_status: status.kyc_status });
                  }}
                  className="w-full py-3 rounded-xl bg-obsidian-raised border border-white/10 text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check Verification Status</span>
                </button>
                <p className="text-[10px] text-center text-slate-500">
                  Tip: Switch to the <span className="text-slate-300">Admin ERP</span> tab above to approve this application!
                </p>
              </div>
            </div>
          )}

          {/* 4. LOGGED IN & APPROVED: Full CRED Super App Experience */}
          {user && user.kyc_status === 'APPROVED' && (
            <div className="space-y-5 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono tracking-widest text-cred-mint uppercase">
                    {selectedSocietyName.toUpperCase()}
                  </div>
                  <h3 className="text-base font-bold text-white capitalize">{user.full_name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSimulateVisitor}
                    title="Simulate incoming gate call"
                    className="px-2.5 py-1 rounded-full bg-cred-mint/10 border border-cred-mint/30 text-[10px] font-bold text-cred-mint hover:bg-cred-mint/20 transition flex items-center gap-1"
                  >
                    <span>Simulate Gate Call</span>
                  </button>
                  <button
                    onClick={() => {
                      api.clearSession();
                      setUser(null);
                    }}
                    className="p-1 rounded text-slate-500 hover:text-white"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Live Gate Pulse Alert (if active) */}
              {activeGateCall && (
                <GatePulseRadar
                  sessionId={activeGateCall.sessionId}
                  visitorName={activeGateCall.visitorName}
                  visitorType={activeGateCall.visitorType}
                  deliveryCompany={activeGateCall.deliveryCompany}
                  vehicleNumber={activeGateCall.vehicleNumber}
                  photoUrl={activeGateCall.photoUrl}
                  unitNumber={activeGateCall.unitNumber}
                  timestamp={activeGateCall.timestamp}
                  onDecision={handleVisitorDecision}
                />
              )}

              {/* 3D Black Card Carousel Item */}
              <BlackCard
                societyName={selectedSocietyName}
                unitNumber="Flat 1204 - Alpha"
                residentName={user.full_name}
                vanNumber="CHOLDRBLR1204"
                duesAmount={duesPaid ? 0 : 120}
              />

              {/* Dues Payment Slide-to-Pay Action */}
              {!duesPaid ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-slate-400 font-medium">November Maintenance Dues</span>
                    <span className="text-cred-mint font-bold font-mono">₹120.00</span>
                  </div>
                  <CredSlider
                    label="SLIDE TO PAY DUES"
                    confirmedLabel="DUES PAID • RECEIPT ISSUED"
                    onConfirm={handlePayDues}
                    variant="mint"
                  />
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-cred-mint/10 border border-cred-mint/30 text-xs text-cred-mint flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>All maintenance dues settled for November!</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">RCP-INV-202611</span>
                </div>
              )}

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setShowPassModal(true)}
                  className="p-3.5 rounded-2xl bg-obsidian-raised border border-white/5 hover:border-white/20 text-left transition space-y-1 shadow-md"
                >
                  <div className="w-8 h-8 rounded-xl bg-cred-mint/10 text-cred-mint flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-white">Pre-Approve Guest</div>
                  <div className="text-[10px] text-slate-400">Generate 6-digit gate PIN</div>
                </button>

                <button
                  onClick={() => {}}
                  className="p-3.5 rounded-2xl bg-obsidian-raised border border-white/5 hover:border-white/20 text-left transition space-y-1 shadow-md"
                >
                  <div className="w-8 h-8 rounded-xl bg-cred-gold/10 text-cred-gold flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-white">Gate Parcels</div>
                  <div className="text-[10px] text-slate-400">1 awaiting pickup</div>
                </button>
              </div>

              {/* Generated Guest Pass Preview */}
              {generatedPass && (
                <div className="p-4 rounded-2xl bg-obsidian-card border border-cred-mint/40 shadow-neon-mint space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-cred-mint">Guest Gate Pass</span>
                    <span className="text-[10px] font-mono text-slate-400">Valid 24h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">PIN Code for Barrier</div>
                      <div className="text-2xl font-mono font-bold tracking-widest text-white">{generatedPass.passcode}</div>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center">
                      <QrCode className="w-10 h-10 text-black" />
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate font-mono pt-1 border-t border-white/5">
                    Payload: {generatedPass.qr_payload}
                  </div>
                </div>
              )}

              {/* Parcels at Gate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-semibold text-slate-300">Deliveries at Gate</span>
                  <span className="text-[10px] text-slate-500 font-mono">OTP Verified</span>
                </div>
                {parcels.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-obsidian-well border border-obsidian-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-cred-gold">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">{p.courier_company} Delivery</div>
                        <div className="text-[10px] text-slate-500">Collected at Security Cabin</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase">Pickup OTP</div>
                      <div className="text-sm font-mono font-bold text-cred-mint">{p.pickup_otp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guest Pass Creation Modal */}
      {showPassModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-obsidian-card border border-white/10 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Pre-Approve Guest Pass</h3>
            <p className="text-xs text-slate-400">Creates an instant 6-digit gate PIN valid for automatic barrier lift.</p>

            <InsetWell>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Guest Name</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Vikram Seth"
                className="w-full bg-transparent text-sm text-white focus:outline-none"
              />
            </InsetWell>

            <InsetWell>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Entry Type</label>
              <select
                value={guestType}
                onChange={(e) => setGuestType(e.target.value)}
                className="w-full bg-transparent text-xs text-cred-mint focus:outline-none"
              >
                <option value="GUEST" className="bg-obsidian text-white">Guest / Family</option>
                <option value="CAB" className="bg-obsidian text-white">Cab / Taxi</option>
                <option value="SERVICE" className="bg-obsidian text-white">Home Service / Maintenance</option>
              </select>
            </InsetWell>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowPassModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-obsidian-raised text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGuestPass}
                disabled={!guestName}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cred-mint-dark to-cred-mint text-obsidian text-xs font-bold uppercase shadow-pill-raised hover:shadow-neon-mint disabled:opacity-50"
              >
                Generate Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

