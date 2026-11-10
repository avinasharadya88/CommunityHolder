-- ============================================================================
-- COMMUNITYHOLDER SUPABASE POSTGRESQL 16 SCHEMA DEFINITION & MIGRATION
-- Target Supabase Project: ggzbyynthvxwkpdbjklf
-- Host: db.ggzbyynthvxwkpdbjklf.supabase.co
-- Locality: Generic Apartment name (Multi-tenant)
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. CORE RELATIONAL TABLES
-- ============================================================================

-- Societies (Tenants)
CREATE TABLE IF NOT EXISTS public.societies (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(32) NOT NULL UNIQUE,
    address_street TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(10) NOT NULL DEFAULT 'IN',
    van_bank_prefix VARCHAR(20) UNIQUE,
    gstin VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    settings JSONB NOT NULL DEFAULT '{
        "visitor_photo_required": true,
        "overstay_alert_minutes": 30,
        "ivr_fallback_timeout_seconds": 30,
        "auto_purge_visitor_days": 90,
        "late_payment_penalty_rate_annual": 18.0
    }',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blocks / Towers / Enclaves
CREATE TABLE IF NOT EXISTS public.blocks (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    society_id VARCHAR(64) NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    total_floors INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Units / Apartments / Flats / Villas
CREATE TABLE IF NOT EXISTS public.units (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    society_id VARCHAR(64) NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    block_id VARCHAR(64) NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL,
    super_built_up_area NUMERIC(10, 2) NOT NULL,
    carpet_area NUMERIC(10, 2),
    occupancy_status VARCHAR(20) NOT NULL DEFAULT 'VACANT',
    virtual_account_number VARCHAR(50) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(society_id, block_id, unit_number)
);

-- Users (Residents, Staff, Administrators, Guards)
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    country_code VARCHAR(8) NOT NULL DEFAULT '+91',
    national_number VARCHAR(20) NOT NULL,
    phone_e164 VARCHAR(30) NOT NULL UNIQUE,
    email CITEXT UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    kyc_status VARCHAR(30) NOT NULL DEFAULT 'UNREGISTERED',
    rejection_reason TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Multi-Tenant Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    society_id VARCHAR(64) NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, society_id, role)
);

-- Unit Members (Occupancy & Resident Affiliation)
CREATE TABLE IF NOT EXISTS public.unit_members (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    unit_id VARCHAR(64) NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    society_id VARCHAR(64) NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    member_type VARCHAR(30) NOT NULL,
    is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
    approval_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    approved_by VARCHAR(64) REFERENCES public.users(id),
    approved_at TIMESTAMPTZ,
    move_in_date DATE,
    move_out_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(unit_id, user_id)
);

-- KYC Verification Documents
CREATE TABLE IF NOT EXISTS public.kyc_documents (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    society_id VARCHAR(64) NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    unit_id VARCHAR(64) NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    document_category VARCHAR(30) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_identifier_masked VARCHAR(100),
    file_url TEXT NOT NULL,
    file_sha256 VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    verified_by VARCHAR(64) REFERENCES public.users(id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_pending_review ON public.kyc_documents(society_id, status)
    WHERE status = 'PENDING';

-- Gatekeeper Visitor Sessions
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    society_id VARCHAR(64) NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    unit_id VARCHAR(64) NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    visitor_type VARCHAR(30) NOT NULL,
    visitor_name VARCHAR(150) NOT NULL,
    visitor_phone VARCHAR(20),
    vehicle_number VARCHAR(30),
    delivery_company VARCHAR(50),
    photo_url TEXT,
    passcode VARCHAR(10),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    is_pre_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by_user_id VARCHAR(64) REFERENCES public.users(id),
    guard_id VARCHAR(64) REFERENCES public.users(id),
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    idempotency_key VARCHAR(64) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Double-Entry Accounting
CREATE TABLE IF NOT EXISTS public.accounts (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    society_id VARCHAR(64) NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_type VARCHAR(20) NOT NULL,
    parent_account_id VARCHAR(64) REFERENCES public.accounts(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(society_id, account_code)
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    society_id VARCHAR(64) NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    unit_id VARCHAR(64) NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal_amount NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    late_fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'ISSUED',
    pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(society_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS public.ledger_transactions (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    society_id VARCHAR(64) NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    reference_number VARCHAR(100),
    description TEXT NOT NULL,
    posted_by VARCHAR(64) REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    transaction_id VARCHAR(64) NOT NULL REFERENCES public.ledger_transactions(id) ON DELETE CASCADE,
    account_id VARCHAR(64) NOT NULL REFERENCES public.accounts(id),
    entry_type VARCHAR(6) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    unit_id VARCHAR(64) REFERENCES public.units(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpdesk & Amenities
CREATE TABLE IF NOT EXISTS public.helpdesk_tickets (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    society_id VARCHAR(64) NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    unit_id VARCHAR(64) REFERENCES public.units(id),
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id),
    ticket_scope VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}',
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    assigned_to_user_id VARCHAR(64) REFERENCES public.users(id),
    sla_due_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.amenities (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    society_id VARCHAR(64) NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    booking_type VARCHAR(20) NOT NULL DEFAULT 'SLOT',
    slot_duration_minutes INT DEFAULT 60,
    price_per_slot NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    refundable_deposit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_advance_days INT NOT NULL DEFAULT 14,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.amenity_bookings (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    amenity_id VARCHAR(64) NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
    unit_id VARCHAR(64) NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    booking_start TIMESTAMPTZ NOT NULL,
    booking_end TIMESTAMPTZ NOT NULL,
    total_fee NUMERIC(10, 2) NOT NULL,
    deposit_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. INITIAL SEED DATA
-- ============================================================================

-- 3.1 Societies (Primary: Generic Apartment name + Multi-tenant choices)
INSERT INTO public.societies (id, name, code, address_street, city, state, postal_code, country, van_bank_prefix)
VALUES
    ('soc_prestige_greenwoods', 'Generic Apartment name', 'GEN-APT-01', 'Main Central Avenue, Layout #1', 'Bangalore', 'Karnataka', '560103', 'IN', 'CHOLDR'),
    ('soc_silver_oak', 'Silver Oak Heights', 'SLV-OAK-02', '45 Green Valley Road', 'Bangalore', 'Karnataka', '560068', 'IN', 'SLVOAK'),
    ('soc_palm_meadows', 'Palm Meadows Residency', 'PLM-MDW-03', '12 Lakeview Boulevard', 'Bangalore', 'Karnataka', '560066', 'IN', 'PLMMDW')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    address_street = EXCLUDED.address_street;

-- 3.2 Blocks
INSERT INTO public.blocks (id, society_id, name, total_floors)
VALUES
    ('block_tower_alpha', 'soc_prestige_greenwoods', 'Tower Alpha', 14),
    ('block_tower_beta',  'soc_prestige_greenwoods', 'Tower Beta',  14),
    ('block_silver_a',    'soc_silver_oak',          'Tower A',     10),
    ('block_palm_v',      'soc_palm_meadows',        'Villa Enclave', 2)
ON CONFLICT (id) DO NOTHING;

-- 3.3 Units
INSERT INTO public.units (id, society_id, block_id, unit_number, super_built_up_area, carpet_area, occupancy_status, virtual_account_number)
VALUES
    ('unit_alpha_101',  'soc_prestige_greenwoods', 'block_tower_alpha', 'Flat 101',  1200.00,  950.00, 'VACANT',         'CHOLDRBLR101'),
    ('unit_alpha_1204', 'soc_prestige_greenwoods', 'block_tower_alpha', 'Flat 1204', 1500.00, 1180.00, 'OWNER_OCCUPIED', 'CHOLDRBLR1204'),
    ('unit_alpha_1205', 'soc_prestige_greenwoods', 'block_tower_alpha', 'Flat 1205', 1500.00, 1180.00, 'OWNER_OCCUPIED', 'CHOLDRBLR1205'),
    ('unit_beta_302',   'soc_prestige_greenwoods', 'block_tower_beta',  'Flat 302',  1800.00, 1420.00, 'TENANT_OCCUPIED','CHOLDRBLR302'),
    ('unit_silver_201', 'soc_silver_oak',          'block_silver_a',    'Flat 201',  1400.00, 1100.00, 'OWNER_OCCUPIED', 'SLVOAKBLR201'),
    ('unit_palm_v1',    'soc_palm_meadows',        'block_palm_v',      'Villa 1',   2800.00, 2200.00, 'OWNER_OCCUPIED', 'PLMMDWBLRV1')
ON CONFLICT (id) DO NOTHING;

-- 3.4 Seed Users
INSERT INTO public.users (id, country_code, national_number, phone_e164, email, full_name, kyc_status, is_active)
VALUES
    ('user_avinash_owner',    '+91', '9876543210', '+919876543210', 'avinash@communityholder.com', 'Avinash Resident (Owner)', 'APPROVED', TRUE),
    ('user_rahul_tenant',     '+91', '9811122233', '+919811122233', 'rahul@tenant.com',              'Rahul Verma (Tenant)',     'APPROVED', TRUE),
    ('user_aditi_applicant',  '+91', '9988776655', '+919988776655', 'aditi@applicant.com',           'Aditi Rao (Applicant)',    'PENDING_VERIFICATION', TRUE),
    ('user_guard_ramesh',     '+91', '9899988877', '+919899988877', 'ramesh@security.com',           'Ramesh Singh (Guard)',     'APPROVED', TRUE),
    ('user_manager_rajesh',   '+91', '9844455566', '+919844455566', 'rajesh@estate.com',             'Rajesh Kumar (Estate Mgr)','APPROVED', TRUE)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    kyc_status = EXCLUDED.kyc_status;

-- 3.5 User Roles
INSERT INTO public.user_roles (id, user_id, society_id, role)
VALUES
    ('role_avinash_owner',   'user_avinash_owner',   'soc_prestige_greenwoods', 'RESIDENT_OWNER'),
    ('role_rahul_tenant',    'user_rahul_tenant',    'soc_prestige_greenwoods', 'RESIDENT_TENANT'),
    ('role_aditi_applicant', 'user_aditi_applicant', 'soc_prestige_greenwoods', 'APPLICANT'),
    ('role_guard_ramesh',    'user_guard_ramesh',    'soc_prestige_greenwoods', 'SECURITY_GUARD'),
    ('role_manager_rajesh',  'user_manager_rajesh',  'soc_prestige_greenwoods', 'ESTATE_MANAGER')
ON CONFLICT (id) DO NOTHING;

-- 3.6 Unit Memberships
INSERT INTO public.unit_members (id, unit_id, society_id, user_id, member_type, is_primary_contact, approval_status)
VALUES
    ('member_avinash_1204', 'unit_alpha_1204', 'soc_prestige_greenwoods', 'user_avinash_owner',   'PRIMARY_OWNER', TRUE, 'APPROVED'),
    ('member_rahul_302',    'unit_beta_302',   'soc_prestige_greenwoods', 'user_rahul_tenant',    'TENANT',        TRUE, 'APPROVED'),
    ('member_aditi_101',    'unit_alpha_101',  'soc_prestige_greenwoods', 'user_aditi_applicant', 'PRIMARY_OWNER', TRUE, 'PENDING')
ON CONFLICT (id) DO NOTHING;

-- 3.7 Chart of Accounts (Double-Entry Ledger)
INSERT INTO public.accounts (id, society_id, account_code, account_name, account_type)
VALUES
    ('acc_cash_bank',  'soc_prestige_greenwoods', '1010', 'Society Operational Bank Current A/c', 'ASSET'),
    ('acc_receivable', 'soc_prestige_greenwoods', '1120', 'Maintenance Accounts Receivable',       'ASSET'),
    ('acc_income',     'soc_prestige_greenwoods', '4010', 'Member Maintenance Charges Income',      'REVENUE'),
    ('acc_gst',        'soc_prestige_greenwoods', '2050', 'GST Output Liability (18%)',             'LIABILITY')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. SUPABASE ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenity_bookings ENABLE ROW LEVEL SECURITY;

-- Helper function: Verify whether caller has administrative roles in target society
CREATE OR REPLACE FUNCTION public.is_society_admin_or_manager(target_society_id VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()::text
          AND ur.society_id = target_society_id
          AND ur.role IN ('SOCIETY_ADMIN', 'FACILITY_MANAGER', 'ESTATE_MANAGER')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users RLS: Self read and update
DO $$ BEGIN
    CREATE POLICY users_self_read ON public.users FOR SELECT USING (auth.uid()::text = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY users_self_update ON public.users FOR UPDATE USING (auth.uid()::text = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- KYC Documents RLS: Resident self-access, Manager cross-access
DO $$ BEGIN
    CREATE POLICY kyc_documents_self_read ON public.kyc_documents FOR SELECT USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY kyc_documents_self_insert ON public.kyc_documents FOR INSERT WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY kyc_documents_manager_read ON public.kyc_documents FOR SELECT USING (public.is_society_admin_or_manager(society_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY kyc_documents_manager_update ON public.kyc_documents FOR UPDATE USING (public.is_society_admin_or_manager(society_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Invoices RLS: Approved resident read
DO $$ BEGIN
    CREATE POLICY invoices_resident_read ON public.invoices FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.unit_members um
            WHERE um.unit_id = public.invoices.unit_id
              AND um.user_id = auth.uid()::text
              AND um.approval_status = 'APPROVED'
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Realtime Publication for Intercom & Queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.helpdesk_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
