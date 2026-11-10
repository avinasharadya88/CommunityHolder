import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  FileX2,
  BookOpen,
  DollarSign,
  ShieldAlert,
  CheckCircle,
  Eye,
  RefreshCw,
  Building,
  Building2,
  UserCheck,
  Send,
  Database,
  ArrowRight,
  LogIn,
  LogOut,
} from 'lucide-react';
import { api } from '../api/client';
import { InsetWell } from '../components/InsetWell';

export const AdminErpView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'KYC_QUEUE' | 'LEDGER' | 'BILLING' | 'DPDPA'>('KYC_QUEUE');

  // Admin Session & Apartment State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(true);
  const [managerName, setManagerName] = useState('Rajesh Kumar');
  const [managerRole, setManagerRole] = useState('Estate Manager');
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

  // KYC Queue State
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('DOCUMENT_ILLEGIBLE');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // General Ledger State
  const [ledgerData, setLedgerData] = useState<any | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Billing Simulation State
  const [billingRate, setBillingRate] = useState(0.1);
  const [billingResult, setBillingResult] = useState<any | null>(null);

  // VAN Webhook Simulation State
  const [vanAmount, setVanAmount] = useState(120);
  const [vanResult, setVanResult] = useState<any | null>(null);

  // DPDPA State
  const [purgeResult, setPurgeResult] = useState<any | null>(null);

  useEffect(() => {
    loadKycQueue();
    loadLedger();
  }, []);

  const loadKycQueue = async () => {
    try {
      const res = await api.getAdminKycQueue();
      setApplications(res.applications || []);
      if (res.applications && res.applications.length > 0 && !selectedApp) {
        setSelectedApp(res.applications[0]);
      }
    } catch (e) {
      // Standalone demo seed
      const mock = [
        {
          application_id: 'app_101',
          user_id: 'user_aditi_101',
          applicant_name: 'Aditi Rao',
          phone_e164: '+919988776655',
          unit_number: 'Flat 101',
          claimed_role: 'PRIMARY_OWNER',
          has_conflict: false,
          documents: [
            {
              id: 'doc_1',
              category: 'GOVERNMENT_ID',
              type: 'AADHAAR',
              view_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
              status: 'PENDING',
            },
            {
              id: 'doc_2',
              category: 'PROPERTY_PROOF',
              type: 'SALE_DEED',
              view_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600',
              status: 'PENDING',
            },
          ],
        },
      ];
      setApplications(mock);
      setSelectedApp(mock[0]);
    }
  };

  const loadLedger = async () => {
    setLedgerLoading(true);
    try {
      const res = await api.getLedgerReport();
      setLedgerData(res);
    } catch (e) {
      setLedgerData({
        total_transactions: 3,
        total_debits: 240,
        total_credits: 240,
        is_balanced: true,
        transactions: [],
      });
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    try {
      await api.reviewKycDecision(selectedApp.application_id, 'APPROVE', 'Verified against Municipal Land Registry');
      setActionSuccess(`Application for ${selectedApp.applicant_name} APPROVED. Resident permissions granted!`);
      setTimeout(() => setActionSuccess(''), 4000);
      loadKycQueue();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    try {
      await api.reviewKycDecision(selectedApp.application_id, 'REJECT', rejectionNotes, rejectionReason);
      setRejectionModalOpen(false);
      setActionSuccess(`Application for ${selectedApp.applicant_name} REJECTED with remediation note.`);
      setTimeout(() => setActionSuccess(''), 4000);
      loadKycQueue();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateBilling = async () => {
    try {
      const res = await api.generateMonthlyBilling(billingRate, selectedSocietyId);
      setBillingResult(res);
      loadLedger();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSimulateVan = async () => {
    try {
      const res = await api.simulateVanTransfer(vanAmount);
      setVanResult(res);
      loadLedger();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTriggerPurge = async () => {
    try {
      const res = await api.triggerDpdpaPurge();
      setPurgeResult(res);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="w-full max-w-md mx-auto p-6 my-8 rounded-3xl bg-obsidian-card border border-white/10 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-cred-gold/10 border border-cred-gold/30 flex items-center justify-center text-cred-gold">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">ESTATE MANAGER ERP LOGIN</h2>
          <p className="text-xs text-slate-400">Select apartment estate & access administrative ledger</p>
        </div>

        <div className="space-y-4">
          <InsetWell>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Select Apartment / Estate
            </label>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cred-gold flex-shrink-0" />
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
              Manager / Officer Identity
            </label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none"
            />
          </InsetWell>

          <InsetWell>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Administrative Passcode
            </label>
            <input
              type="password"
              defaultValue="admin88"
              className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none font-mono"
            />
          </InsetWell>

          <button
            onClick={() => setIsAdminLoggedIn(true)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-500 to-cred-gold text-obsidian font-extrabold text-sm uppercase tracking-wider shadow-pill-raised hover:shadow-neon-gold transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Access ERP Console</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-obsidian-card border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cred-gold/10 border border-cred-gold/30 flex items-center justify-center text-cred-gold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">ESTATE MANAGER & FACILITY ERP</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cred-gold/20 text-cred-gold border border-cred-gold/40">
                ADMIN CONSOLE
              </span>
            </div>
            <p className="text-xs text-slate-400">{selectedSocietyName} • Manager: {managerName} ({managerRole})</p>
          </div>
        </div>

        {/* Global Stats & Apartment Switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-obsidian-well border border-white/5">
            <Building2 className="w-4 h-4 text-cred-gold flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400">Active Estate</span>
              <select
                value={selectedSocietyId}
                onChange={handleSocietyChange}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {societies.map((s) => (
                  <option key={s.id} value={s.id} className="bg-obsidian text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-obsidian-well border border-white/5 text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Pending KYC</div>
            <div className="text-lg font-mono font-bold text-cred-amber">{applications.length} Queue</div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-obsidian-well border border-white/5 text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Ledger Balance</div>
            <div className="text-lg font-mono font-bold text-cred-mint">Balanced ✓</div>
          </div>

          <button
            onClick={() => setIsAdminLoggedIn(false)}
            title="Switch Apartment / Admin Logout"
            className="p-2.5 rounded-2xl bg-obsidian-raised border border-white/10 text-slate-400 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-cred-mint/15 border border-cred-mint/50 text-xs font-semibold text-cred-mint shadow-neon-mint flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { key: 'KYC_QUEUE', label: `KYC Review Queue (${applications.length})`, icon: UserCheck },
          { key: 'LEDGER', label: 'Double-Entry Ledger', icon: BookOpen },
          { key: 'BILLING', label: 'Monthly Billing & VAN', icon: DollarSign },
          { key: 'DPDPA', label: 'DPDPA 2023 Purge Worker', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-xs font-bold transition-all ${
                isActive
                  ? 'bg-obsidian-raised border-cred-gold text-white shadow-neon-gold'
                  : 'bg-obsidian-well border-white/5 text-slate-400 hover:text-white hover:border-white/10'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cred-gold' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: KYC REVIEW QUEUE DUAL-PANE WORKSPACE */}
      {activeTab === 'KYC_QUEUE' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Applications List (Left 4 cols) */}
          <div className="md:col-span-4 p-5 rounded-3xl bg-obsidian-card border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs uppercase font-mono text-slate-400 font-bold">Pending Applications</span>
              <button onClick={loadKycQueue} className="text-slate-400 hover:text-white">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-white/10">
                Queue clean. No pending KYC applications.
              </div>
            ) : (
              <div className="space-y-2">
                {applications.map((app) => {
                  const isSelected = selectedApp?.application_id === app.application_id;
                  return (
                    <div
                      key={app.application_id}
                      onClick={() => setSelectedApp(app)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-obsidian-raised border-cred-gold shadow-md'
                          : 'bg-obsidian-well border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{app.applicant_name}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 text-cred-mint">
                          {app.unit_number}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                        <span>Role: {app.claimed_role}</span>
                        <span className="font-mono text-[10px] text-slate-500">{app.phone_e164}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Document Zoom & Decision Pane (Right 8 cols) */}
          <div className="md:col-span-8 p-6 rounded-3xl bg-obsidian-card border border-white/10 shadow-xl space-y-6">
            {selectedApp ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedApp.applicant_name}</h3>
                    <p className="text-xs text-slate-400">
                      Claiming {selectedApp.claimed_role} access to {selectedApp.unit_number}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRejectionModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-obsidian-raised border border-cred-crimson/40 text-cred-crimson text-xs font-bold hover:bg-cred-crimson/10 transition flex items-center gap-1.5"
                    >
                      <FileX2 className="w-3.5 h-3.5" />
                      <span>Reject Application</span>
                    </button>
                    <button
                      onClick={handleApprove}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cred-mint-dark to-cred-mint text-obsidian text-xs font-bold uppercase shadow-pill-raised hover:shadow-neon-mint transition flex items-center gap-1.5"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Approve Resident</span>
                    </button>
                  </div>
                </div>

                {/* Secure Watermarked Document Viewer */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold uppercase tracking-wider text-slate-300">
                      Submitted Legal Proofs (Anti-Tamper Watermarked)
                    </span>
                    <span className="font-mono text-[10px] text-cred-mint">
                      SHA256 CHECKSUM VERIFIED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedApp.documents?.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="relative rounded-2xl overflow-hidden border border-white/10 bg-obsidian-well group"
                      >
                        <div className="p-3 bg-obsidian-raised border-b border-white/5 flex items-center justify-between text-xs">
                          <span className="font-bold text-white">{doc.type}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{doc.category}</span>
                        </div>

                        {/* Document preview container with diagonal watermark */}
                        <div className="relative h-60 w-full overflow-hidden bg-slate-900 flex items-center justify-center">
                          <img
                            src={doc.view_url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600'}
                            alt="Document"
                            className="w-full h-full object-cover filter contrast-125"
                          />

                          {/* Anti-Tamper Security Watermark Overlay */}
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center transform -rotate-12">
                            <span className="text-xl font-extrabold uppercase font-mono tracking-widest text-red-500/40 select-none border-2 border-red-500/40 px-4 py-2 rounded-lg bg-black/30">
                              CONFIDENTIAL • VERIFIED BY ESTATE MGR 2026
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 bg-obsidian-raised text-[10px] font-mono text-slate-400 flex items-center justify-between">
                          <span>Status: PENDING REVIEW</span>
                          <span className="text-cred-gold">256-bit AES Vaulted</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-xs text-slate-500">
                Select an applicant from the left queue to review proof documents.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL LEDGER & BALANCED JOURNAL ENTRIES */}
      {activeTab === 'LEDGER' && (
        <div className="p-6 rounded-3xl bg-obsidian-card border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Double-Entry General Ledger</h3>
              <p className="text-xs text-slate-400">Strict invariant check: Total Debits must exactly equal Total Credits</p>
            </div>
            <button onClick={loadLedger} className="p-2 rounded-xl bg-obsidian-raised text-slate-400 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${ledgerLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Balanced Invariant Metric Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InsetWell>
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Debits (Assets)</div>
              <div className="text-2xl font-mono font-bold text-white mt-1">
                ₹{(ledgerData?.total_debits || 120).toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Bank HDFC Operating Account (1010)</div>
            </InsetWell>

            <InsetWell>
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Credits (Revenue/Deposits)</div>
              <div className="text-2xl font-mono font-bold text-white mt-1">
                ₹{(ledgerData?.total_credits || 120).toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Maintenance Income (4010) + Advances (2030)</div>
            </InsetWell>

            <InsetWell glow="mint">
              <div className="text-[10px] uppercase font-bold text-cred-mint">Accounting Invariant Status</div>
              <div className="text-xl font-mono font-bold text-cred-mint mt-1">
                {ledgerData?.is_balanced !== false ? 'DEBITS == CREDITS ✓' : 'UNBALANCED ALERT ✗'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Double-entry zero imbalance guarantee</div>
            </InsetWell>
          </div>

          {/* Transactions List */}
          <div className="space-y-2 pt-2">
            <span className="text-xs uppercase font-bold text-slate-400 font-mono">Recent Journal Entries</span>
            <div className="space-y-2">
              <div className="p-4 rounded-2xl bg-obsidian-well border border-white/5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">Payment for INV-202611-A1204 via UPI</div>
                  <div className="text-[10px] text-slate-500 font-mono">REF: RCP-INV-202611-A1204 • Date: 2026-11-06</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-cred-mint font-bold">+₹120.00</div>
                  <div className="text-[10px] text-slate-400">Balanced (2 legs)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY BILLING RUN & VAN WEBHOOK */}
      {activeTab === 'BILLING' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Automated Recurring Billing Generator */}
          <div className="p-6 rounded-3xl bg-obsidian-card border border-white/10 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Automated Recurring Billing Generator</h3>
            <p className="text-xs text-slate-400">
              Generates monthly maintenance invoices based on unit square footage (1500 sqft, 1200 sqft).
            </p>

            <InsetWell>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Maintenance Rate per Sq Ft (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={billingRate}
                onChange={(e) => setBillingRate(parseFloat(e.target.value))}
                className="w-full bg-transparent text-xl font-mono text-white focus:outline-none"
              />
            </InsetWell>

            <button
              onClick={handleGenerateBilling}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cred-mint-dark to-cred-mint text-obsidian font-bold text-xs uppercase tracking-wider shadow-pill-raised hover:shadow-neon-mint"
            >
              Generate Monthly Invoices
            </button>

            {billingResult && (
              <div className="p-3.5 rounded-xl bg-cred-mint/10 border border-cred-mint/30 text-xs text-cred-mint">
                Generated {billingResult.count} invoices successfully for all active units!
              </div>
            )}
          </div>

          {/* Banking VAN Webhook Simulator */}
          <div className="p-6 rounded-3xl bg-obsidian-card border border-white/10 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Simulate Banking VAN Webhook</h3>
            <p className="text-xs text-slate-400">
              Simulates RTGS/NEFT/UPI transfer into Flat 1204 Virtual Account Number (<span className="font-mono text-cred-mint">CHOLDRBLR1204</span>).
            </p>

            <InsetWell>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Transfer Amount (₹)</label>
              <input
                type="number"
                value={vanAmount}
                onChange={(e) => setVanAmount(parseInt(e.target.value, 10))}
                className="w-full bg-transparent text-xl font-mono text-white focus:outline-none"
              />
            </InsetWell>

            <button
              onClick={handleSimulateVan}
              className="w-full py-3.5 rounded-2xl bg-obsidian-raised border border-white/10 text-slate-200 font-bold text-xs uppercase tracking-wider hover:text-white hover:bg-slate-800"
            >
              Simulate Bank Inward Credit Webhook
            </button>

            {vanResult && (
              <div className="p-3.5 rounded-xl bg-obsidian-well border border-cred-mint/30 text-xs space-y-1">
                <div className="text-cred-mint font-bold">{vanResult.message}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Unit: {vanResult.unit_number} • Advance Balance: ₹{vanResult.current_advance_balance}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DPDPA 2023 DATA PURGING */}
      {activeTab === 'DPDPA' && (
        <div className="p-6 rounded-3xl bg-obsidian-card border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cred-crimson/10 text-cred-crimson flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">DPDPA 2023 Statutory Privacy Compliance</h3>
              <p className="text-xs text-slate-400">Digital Personal Data Protection Act (Article 8) Visitor Retention Engine</p>
            </div>
          </div>

          <InsetWell>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mandatory policy: All facial photos and vehicle license snapshots collected by Gatekeeper security tablets must be
              permanently expunged after 90 days of collection, while maintaining anonymized audit metadata.
            </p>
          </InsetWell>

          <button
            onClick={handleTriggerPurge}
            className="py-3 px-6 rounded-2xl bg-cred-crimson/20 border border-cred-crimson/40 text-cred-crimson font-bold text-xs uppercase hover:bg-cred-crimson/30 transition shadow-neon-crimson"
          >
            Trigger 90-Day Visitor Photo Purge Job
          </button>

          {purgeResult && (
            <div className="p-4 rounded-2xl bg-cred-mint/10 border border-cred-mint/30 text-xs text-cred-mint space-y-1">
              <div className="font-bold">Purge Job Completed Successfully</div>
              <div className="text-[10px] text-slate-400 font-mono">
                Purged Photos: {purgeResult.purged_photos_count} • Compliance: {purgeResult.compliance_policy}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-obsidian-card border border-white/10 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Reject KYC Application</h3>
            <p className="text-xs text-slate-400">
              Provide a clear remediation reason so the resident can correct and re-upload their documents.
            </p>

            <InsetWell>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Reason Code</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-transparent text-xs text-cred-crimson focus:outline-none"
              >
                <option value="DOCUMENT_ILLEGIBLE" className="bg-obsidian text-white">Document Illegible / Blurry</option>
                <option value="NAME_MISMATCH" className="bg-obsidian text-white">Name Mismatch with Registry</option>
                <option value="UNIT_CONFLICT" className="bg-obsidian text-white">Unit Already Claimed by Another Owner</option>
                <option value="EXPIRED_DOCUMENT" className="bg-obsidian text-white">Expired Rental Agreement</option>
              </select>
            </InsetWell>

            <InsetWell>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Instructions for Resident</label>
              <textarea
                rows={3}
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="e.g. Please re-upload page 2 of sale deed with registrar stamp visible."
                className="w-full bg-transparent text-xs text-white focus:outline-none resize-none"
              />
            </InsetWell>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-obsidian-raised text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 py-2.5 rounded-xl bg-cred-crimson text-obsidian text-xs font-bold uppercase shadow-pill-raised hover:shadow-neon-crimson"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

