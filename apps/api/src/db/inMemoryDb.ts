import { v4 as uuidv4 } from 'uuid';
import type {
  Society,
  Block,
  Unit,
  User,
  KycDocument,
  UnitMember,
  VisitorSession,
  Invoice,
  LedgerTransaction,
  Amenity,
  AmenityBooking,
  HelpdeskTicket,
  Role,
} from '@communityholder/shared';

export interface OtpRecord {
  phone_e164: string;
  otp: string;
  expires_at: number;
  attempts: number;
  last_requested_at: number;
}

export interface ParcelRecord {
  id: string;
  society_id: string;
  unit_id: string;
  courier_company: string;
  pickup_otp: string;
  photo_url?: string;
  status: 'AT_GATE' | 'COLLECTED';
  collected_at?: string;
  created_at: string;
}

class InMemoryDatabase {
  societies: Map<string, Society> = new Map();
  blocks: Map<string, Block> = new Map();
  units: Map<string, Unit> = new Map();
  users: Map<string, User> = new Map();
  userRoles: Map<string, Role[]> = new Map();
  unitMembers: Map<string, UnitMember> = new Map();
  kycDocuments: Map<string, KycDocument> = new Map();
  visitorSessions: Map<string, VisitorSession> = new Map();
  invoices: Map<string, Invoice> = new Map();
  ledgerTransactions: LedgerTransaction[] = [];
  amenities: Map<string, Amenity> = new Map();
  amenityBookings: AmenityBooking[] = [];
  helpdeskTickets: Map<string, HelpdeskTicket> = new Map();
  parcels: Map<string, ParcelRecord> = new Map();

  // Security & Cache simulation
  otpStore: Map<string, OtpRecord> = new Map();
  lockoutStore: Map<string, number> = new Map();
  distributedLocks: Set<string> = new Set();
  walletBalances: Map<string, number> = new Map(); // unit_id -> advance balance

  constructor() {
    this.seedInitialData();
  }

  reset() {
    this.societies.clear();
    this.blocks.clear();
    this.units.clear();
    this.users.clear();
    this.userRoles.clear();
    this.unitMembers.clear();
    this.kycDocuments.clear();
    this.visitorSessions.clear();
    this.invoices.clear();
    this.ledgerTransactions = [];
    this.amenities.clear();
    this.amenityBookings = [];
    this.helpdeskTickets.clear();
    this.parcels.clear();
    this.otpStore.clear();
    this.lockoutStore.clear();
    this.distributedLocks.clear();
    this.walletBalances.clear();
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Seed Primary Society ("Generic Apartment name")
    const societyId = 'soc_prestige_greenwoods';
    const society: Society = {
      id: societyId,
      name: 'Generic Apartment name',
      code: 'GEN-APT-01',
      address_street: 'Main Central Avenue, Layout #1',
      city: 'Bangalore',
      state: 'Karnataka',
      postal_code: '560103',
      country: 'IN',
      van_bank_prefix: 'CHOLDR',
      settings: {
        visitor_photo_required: true,
        overstay_alert_minutes: 30,
        ivr_fallback_timeout_seconds: 30,
        auto_purge_visitor_days: 90,
        late_payment_penalty_rate_annual: 18.0,
      },
      created_at: new Date('2025-01-01').toISOString(),
    };
    this.societies.set(societyId, society);

    // Seed Additional Societies for Selection
    const silverOakId = 'soc_silver_oak';
    this.societies.set(silverOakId, {
      id: silverOakId,
      name: 'Silver Oak Heights',
      code: 'SLV-OAK-02',
      address_street: '45 Green Valley Road',
      city: 'Bangalore',
      state: 'Karnataka',
      postal_code: '560068',
      country: 'IN',
      van_bank_prefix: 'SLVOAK',
      settings: {
        visitor_photo_required: true,
        overstay_alert_minutes: 30,
        ivr_fallback_timeout_seconds: 30,
        auto_purge_visitor_days: 90,
        late_payment_penalty_rate_annual: 18.0,
      },
      created_at: new Date('2025-01-01').toISOString(),
    });

    const palmMeadowsId = 'soc_palm_meadows';
    this.societies.set(palmMeadowsId, {
      id: palmMeadowsId,
      name: 'Palm Meadows Residency',
      code: 'PLM-MDW-03',
      address_street: '12 Lakeview Boulevard',
      city: 'Bangalore',
      state: 'Karnataka',
      postal_code: '560066',
      country: 'IN',
      van_bank_prefix: 'PLMMDW',
      settings: {
        visitor_photo_required: true,
        overstay_alert_minutes: 30,
        ivr_fallback_timeout_seconds: 30,
        auto_purge_visitor_days: 90,
        late_payment_penalty_rate_annual: 18.0,
      },
      created_at: new Date('2025-01-01').toISOString(),
    });

    // 2. Seed Blocks & Units for Generic Apartment name
    const blockAId = 'block_tower_alpha';
    this.blocks.set(blockAId, {
      id: blockAId,
      society_id: societyId,
      name: 'Tower Alpha',
      total_floors: 14,
    });

    const unit1204Id = 'unit_alpha_1204';
    this.units.set(unit1204Id, {
      id: unit1204Id,
      society_id: societyId,
      block_id: blockAId,
      unit_number: 'Flat 1204',
      super_built_up_area: 1500,
      occupancy_status: 'OWNER_OCCUPIED',
      virtual_account_number: 'CHOLDRBLR1204',
    });

    const unit101Id = 'unit_alpha_101';
    this.units.set(unit101Id, {
      id: unit101Id,
      society_id: societyId,
      block_id: blockAId,
      unit_number: 'Flat 101',
      super_built_up_area: 1200,
      occupancy_status: 'VACANT',
      virtual_account_number: 'CHOLDRBLR101',
    });

    // Seed Blocks & Units for Silver Oak Heights
    const blockSilverA = 'block_silver_a';
    this.blocks.set(blockSilverA, {
      id: blockSilverA,
      society_id: silverOakId,
      name: 'Tower A',
      total_floors: 10,
    });
    this.units.set('unit_silver_201', {
      id: 'unit_silver_201',
      society_id: silverOakId,
      block_id: blockSilverA,
      unit_number: 'Flat 201',
      super_built_up_area: 1400,
      occupancy_status: 'OWNER_OCCUPIED',
      virtual_account_number: 'SLVOAKBLR201',
    });

    // Seed Blocks & Units for Palm Meadows
    const blockPalmV = 'block_palm_v';
    this.blocks.set(blockPalmV, {
      id: blockPalmV,
      society_id: palmMeadowsId,
      name: 'Villa Enclave',
      total_floors: 2,
    });
    this.units.set('unit_palm_v1', {
      id: 'unit_palm_v1',
      society_id: palmMeadowsId,
      block_id: blockPalmV,
      unit_number: 'Villa 1',
      super_built_up_area: 2800,
      occupancy_status: 'OWNER_OCCUPIED',
      virtual_account_number: 'PLMMDWBLRV1',
    });

    // 3. Seed Verified Resident User (Avinash)
    const residentUserId = 'user_avinash_owner';
    const residentUser: User = {
      id: residentUserId,
      country_code: '+91',
      national_number: '9876543210',
      phone_e164: '+919876543210',
      email: 'avinash@example.com',
      full_name: 'Avinash Aradya',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      kyc_status: 'APPROVED',
      is_active: true,
      created_at: new Date('2025-01-10').toISOString(),
    };
    this.users.set(residentUserId, residentUser);
    this.userRoles.set(residentUserId, ['RESIDENT_OWNER']);
    this.unitMembers.set(`${unit1204Id}_${residentUserId}`, {
      id: uuidv4(),
      unit_id: unit1204Id,
      user_id: residentUserId,
      member_type: 'PRIMARY_OWNER',
      is_primary_contact: true,
      approval_status: 'APPROVED',
      approved_by: 'user_estate_mgr',
      approved_at: new Date('2025-01-11').toISOString(),
    });

    // 4. Seed Estate Manager
    const managerUserId = 'user_estate_mgr';
    this.users.set(managerUserId, {
      id: managerUserId,
      country_code: '+91',
      national_number: '9888877777',
      phone_e164: '+919888877777',
      email: 'manager.greenwoods@communityholder.com',
      full_name: 'Rajesh Kumar (Estate Mgr)',
      kyc_status: 'APPROVED',
      is_active: true,
      created_at: new Date('2025-01-01').toISOString(),
    });
    this.userRoles.set(managerUserId, ['ESTATE_MANAGER', 'FACILITY_MANAGER']);

    // 5. Seed Security Guard
    const guardUserId = 'user_guard_north';
    this.users.set(guardUserId, {
      id: guardUserId,
      country_code: '+91',
      national_number: '9777766666',
      phone_e164: '+919777766666',
      full_name: 'Ramesh Singh (Guard #1)',
      kyc_status: 'APPROVED',
      is_active: true,
      created_at: new Date('2025-01-01').toISOString(),
    });
    this.userRoles.set(guardUserId, ['SECURITY_GUARD']);

    // 6. Seed Amenities
    const amenityTennisId = 'amenity_tennis_01';
    this.amenities.set(amenityTennisId, {
      id: amenityTennisId,
      society_id: societyId,
      name: 'Tennis Court 1',
      booking_type: 'SLOT',
      slot_duration_minutes: 60,
      price_per_slot: 10,
      refundable_deposit: 50,
    });

    // 7. Seed Initial Invoice for Flat 1204
    const invId = 'inv_nov_1204';
    this.invoices.set(invId, {
      id: invId,
      society_id: societyId,
      unit_id: unit1204Id,
      invoice_number: 'INV-202611-A1204',
      bill_date: '2026-11-01',
      due_date: '2026-11-15',
      subtotal_amount: 120.0,
      tax_amount: 0.0,
      late_fee_amount: 0.0,
      total_amount: 120.0,
      amount_paid: 0.0,
      status: 'ISSUED',
      created_at: new Date('2026-11-01').toISOString(),
    });
  }
}

export const db = new InMemoryDatabase();

