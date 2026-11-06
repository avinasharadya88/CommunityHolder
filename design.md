# System & Technical Design Document
## CommunityHolder — Engineering Specifications, Data Models & UI/UX Design

---

| **Document Version** | 1.0.0 |
| **Status** | Approved for Implementation |
| **Document Purpose** | Comprehensive Database DDL, State Machines, API Specifications, and UI/UX Design System |
| **Target Implementation** | Cross-Platform (Flutter Mobile, Next.js Web, NestJS/PostgreSQL Backend) |

---

## 1. Domain Entity Relationship & Data Models

The following ER diagram maps the primary entities across society hierarchy, security, ERP, and operations:

```mermaid
erDiagram
    SOCIETY ||--o{ BLOCK : contains
    BLOCK ||--o{ UNIT : contains
    UNIT ||--o{ UNIT_MEMBER : assigns
    USER ||--o{ UNIT_MEMBER : occupies
    USER ||--o{ USER_ROLE : has
    
    UNIT ||--o{ VISITOR_SESSION : receives
    USER ||--o{ VISITOR_SESSION : approves
    
    SOCIETY ||--o{ DOMESTIC_STAFF : registers
    DOMESTIC_STAFF ||--o{ STAFF_ATTENDANCE : logs
    UNIT ||--o{ STAFF_ASSIGNMENT : employs
    DOMESTIC_STAFF ||--o{ STAFF_ASSIGNMENT : hired_by
    
    SOCIETY ||--o{ ACCOUNT : owns
    ACCOUNT ||--o{ LEDGER_ENTRY : contains
    TRANSACTION ||--o{ LEDGER_ENTRY : executes
    UNIT ||--o{ INVOICE : billed
    INVOICE ||--o{ INVOICE_ITEM : contains
    INVOICE ||--o{ PAYMENT_RECEIPT : cleared_by
    
    UNIT ||--o{ HELPDESK_TICKET : raises
    USER ||--o{ HELPDESK_TICKET : reports
    
    SOCIETY ||--o{ AMENITY : operates
    AMENITY ||--o{ AMENITY_BOOKING : schedules
    UNIT ||--o{ AMENITY_BOOKING : reserves
```

---

## 2. Core Relational Database DDL (PostgreSQL 16)

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. SOCIETY & PROPERTY HIERARCHY
-- ============================================================================

CREATE TABLE societies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(16) NOT NULL UNIQUE, -- e.g. "BLR-GRN-01"
    address_street TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(10) NOT NULL DEFAULT 'IN',
    van_bank_prefix VARCHAR(10) UNIQUE, -- Virtual Account prefix (e.g. "CHOLDR")
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

CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g. "Tower Alpha", "Block B"
    total_floors INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL, -- e.g. "101", "Penthouse 4"
    super_built_up_area NUMERIC(10, 2) NOT NULL, -- in sq.ft or sq.m
    carpet_area NUMERIC(10, 2),
    occupancy_status VARCHAR(20) NOT NULL DEFAULT 'VACANT', -- VACANT, OWNER_OCCUPIED, TENANT_OCCUPIED
    virtual_account_number VARCHAR(50) UNIQUE, -- e.g. "CHOLDRBLRGRN101"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(society_id, block_id, unit_number)
);

-- ============================================================================
-- 2. USERS, ROLES & ACCESS CONTROL
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile_number VARCHAR(20) NOT NULL UNIQUE,
    email CITEXT UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    password_hash TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE unit_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_type VARCHAR(30) NOT NULL, -- PRIMARY_OWNER, CO_OWNER, TENANT, FAMILY_MEMBER
    is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    move_in_date DATE,
    move_out_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(unit_id, user_id)
);

-- ============================================================================
-- 3. GATEKEEPER & VISITOR MANAGEMENT
-- ============================================================================

CREATE TABLE visitor_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    visitor_type VARCHAR(30) NOT NULL, -- GUEST, DELIVERY, CAB, SERVICE, CONTRACTOR
    visitor_name VARCHAR(150) NOT NULL,
    visitor_phone VARCHAR(20),
    vehicle_number VARCHAR(30),
    delivery_company VARCHAR(50), -- Amazon, Swiggy, Uber, etc.
    photo_url TEXT,
    passcode VARCHAR(10), -- 6-digit OTP for pre-approvals
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, DENIED, CHECKED_IN, CHECKED_OUT, OVERSTAY
    is_pre_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by_user_id UUID REFERENCES users(id),
    guard_id UUID REFERENCES users(id),
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    idempotency_key VARCHAR(64) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visitor_active ON visitor_sessions(society_id, status) 
    WHERE status IN ('PENDING', 'CHECKED_IN');
CREATE INDEX idx_visitor_passcode ON visitor_sessions(society_id, passcode) 
    WHERE status = 'APPROVED';

-- ============================================================================
-- 4. DOUBLE-ENTRY ACCOUNTING & INVOICING (ERP)
-- ============================================================================

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL, -- 1000 Assets, 2000 Liabilities, 3000 Equity, 4000 Income, 5000 Expense
    account_name VARCHAR(150) NOT NULL,
    account_type VARCHAR(20) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    parent_account_id UUID REFERENCES accounts(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(society_id, account_code)
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL, -- e.g. "INV-202611-A101"
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal_amount NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    late_fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'ISSUED', -- DRAFT, ISSUED, PARTIALLY_PAID, PAID, OVERDUE, VOID
    pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(society_id, invoice_number)
);

CREATE TABLE ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    reference_number VARCHAR(100), -- Invoice #, Receipt #, Bank UTR
    description TEXT NOT NULL,
    posted_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    entry_type VARCHAR(6) NOT NULL, -- 'DEBIT' or 'CREDIT'
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    unit_id UUID REFERENCES units(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. HELPDESK & AMENITIES
-- ============================================================================

CREATE TABLE helpdesk_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id),
    user_id UUID NOT NULL REFERENCES users(id),
    ticket_scope VARCHAR(20) NOT NULL, -- 'PERSONAL_UNIT' or 'COMMON_AREA'
    category VARCHAR(50) NOT NULL, -- PLUMBING, ELECTRICAL, CARPENTRY, LIFT, SECURITY
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}',
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN', -- OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, EMERGENCY
    assigned_to_user_id UUID REFERENCES users(id),
    sla_due_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- "Clubhouse Banquet", "Tennis Court 1"
    booking_type VARCHAR(20) NOT NULL DEFAULT 'SLOT', -- 'SLOT' (hours) or 'FULL_DAY'
    slot_duration_minutes INT DEFAULT 60,
    price_per_slot NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    refundable_deposit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_advance_days INT NOT NULL DEFAULT 14,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE amenity_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_start TIMESTAMPTZ NOT NULL,
    booking_end TIMESTAMPTZ NOT NULL,
    total_fee NUMERIC(10, 2) NOT NULL,
    deposit_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED', -- CONFIRMED, COMPLETED, CANCELLED, REFUNDED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Core Business State Machines

### 3.1 Visitor Pass Lifecycle (Gatekeeper)

```mermaid
stateDiagram-v2
    [*] --> PRE_APPROVED : Resident generates 6-digit PIN / QR
    [*] --> PENDING_APPROVAL : Guard initiates walk-in at gate
    
    PRE_APPROVED --> CHECKED_IN : Guard scans QR / enters PIN (< 2s)
    PENDING_APPROVAL --> APPROVED : Resident taps "Approve" (Mobile Push)
    PENDING_APPROVAL --> APPROVED : Resident approves via IVR / VoIP Intercom
    PENDING_APPROVAL --> DENIED : Resident taps "Deny"
    
    APPROVED --> CHECKED_IN : Guard issues physical/digital pass
    DENIED --> [*] : Entry rejected at gate barrier
    
    CHECKED_IN --> OVERSTAY : Stay duration exceeds threshold (e.g. 30m)
    OVERSTAY --> CHECKED_OUT : Guard logs departure
    CHECKED_IN --> CHECKED_OUT : Guard logs departure / ANPR scan
    
    CHECKED_OUT --> [*]
```

### 3.2 Maintenance Invoice & Payment Lifecycle (ERP)

```mermaid
stateDiagram-v2
    [*] --> DRAFT : System auto-calculates dues on 1st of month
    DRAFT --> ISSUED : Committee approves bill batch & sends notifications
    
    ISSUED --> PAID : Full payment via UPI / Cards / Net Banking
    ISSUED --> PAID : Automated Virtual Account (VAN) reconciliation
    ISSUED --> PARTIALLY_PAID : Partial installment received
    PARTIALLY_PAID --> PAID : Remainder balance cleared
    
    ISSUED --> OVERDUE : Grace period elapsed (e.g. 15th of month)
    OVERDUE --> OVERDUE : Automated penalty interest accrued
    OVERDUE --> PAID : Dues + penalty settled
    
    PAID --> [*] : Auto-generate digital receipt & post to General Ledger
```

### 3.3 Helpdesk Ticket SLA Escalation

```mermaid
stateDiagram-v2
    [*] --> OPEN : Resident files ticket with photo
    OPEN --> ASSIGNED : Auto-assigned to technician based on trade
    ASSIGNED --> IN_PROGRESS : Technician accepts & visits unit
    
    IN_PROGRESS --> RESOLVED : Technician marks work complete
    RESOLVED --> CLOSED : Resident approves via OTP/Rating
    
    ASSIGNED --> ESCALATED_L1 : Unattended for > 4 Hours (Alert Facility Mgr)
    ESCALATED_L1 --> ESCALATED_L2 : Unattended for > 24 Hours (Alert Secretary)
    ESCALATED_L1 --> IN_PROGRESS : Technician picks up ticket
    ESCALATED_L2 --> IN_PROGRESS : Emergency contractor dispatched
    
    CLOSED --> [*]
```

---

## 4. REST & Real-Time API Contracts

### 4.1 Gatekeeper Visitor Check-in (Guard App -> Cloud)
`POST /api/v1/gate/visitor-sessions`

**Request Payload:**
```json
{
  "society_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "unit_id": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
  "visitor_type": "DELIVERY",
  "visitor_name": "Ramesh Kumar",
  "visitor_phone": "+919876543210",
  "delivery_company": "Swiggy",
  "vehicle_number": "KA-01-EE-4521",
  "photo_base64": "data:image/jpeg;base64,...",
  "idempotency_key": "guard_tab_01_176240212398"
}
```

**Response Payload (201 Created):**
```json
{
  "session_id": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "status": "PENDING",
  "message": "Push notification and Intercom alert dispatched to resident",
  "created_at": "2026-11-06T09:30:00Z"
}
```

### 4.2 Resident Instant Approval (Resident App -> Cloud)
`PATCH /api/v1/gate/visitor-sessions/{id}/decision`

**Request Payload:**
```json
{
  "decision": "APPROVE", // "APPROVE" | "DENY" | "LEAVE_AT_GATE"
  "delivery_instruction": "LEAVE_AT_DOORSTEP"
}
```

**Response Payload (200 OK):**
```json
{
  "session_id": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "status": "APPROVED",
  "approved_at": "2026-11-06T09:30:15Z"
}
```

### 4.3 Offline-First Batch Sync (Guard App Outbox -> Cloud)
`POST /api/v1/gate/sync-batch`

**Request Payload:**
```json
{
  "society_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "device_id": "tablet_gate_north_01",
  "last_synced_timestamp": "2026-11-06T08:00:00Z",
  "offline_events": [
    {
      "event_id": "a5e9f82d-1234-5678-9abc-def012345678",
      "event_type": "VISITOR_CHECK_IN",
      "timestamp": "2026-11-06T08:12:44Z",
      "payload": {
        "passcode": "849201",
        "verified_offline": true
      }
    }
  ]
}
```

---

## 5. UI/UX Design System & Layout Specifications

CommunityHolder adopts an intentional, modern design language: clean typography, high-contrast usability for outdoors/gate guards, and frictionless mobile interactions for residents.

### 5.1 Color Palette & Design Tokens
```
Primary Brand:
- Emerald Slate:  #0F766E (Primary action, security validated, approved)
- Deep Forest:    #115E59 (Primary hover, header accents)
- Mint Glow:      #CCFBF1 (Badges, light highlights)

Neutral Foundations:
- Space Black:    #090D16 (Primary headings, dark-mode surfaces)
- Slate Gray:     #64748B (Secondary labels, metadata, borders)
- Pure Surface:   #FFFFFF (Card backgrounds, modals)
- Canvas White:   #F8FAFC (App background)

Semantic Alerts:
- Success Green:  #10B981 (Gate entry permitted, payment cleared)
- Warning Amber:  #F59E0B (Overstay alert, invoice due soon)
- Critical Rose:  #EF4444 (Denied visitor, SOS panic alarm, SLA breached)
```

### 5.2 Typography Tokens
- **Display Font**: `Inter` / `Plus Jakarta Sans` (Geometric, clean readability).
- **Monospace Font**: `JetBrains Mono` (Passcodes, Virtual Account Numbers, Invoices).
- **Scale**:
  - H1: 28px, SemiBold (Screen Titles)
  - H2: 20px, SemiBold (Card Headings)
  - Body 1: 15px, Regular (General Content)
  - Caption: 12px, Medium (Timestamps, Subtitles)
  - PIN Display: 36px, Bold, Monospace (6-Digit Guest OTP)

### 5.3 Mobile Screen Layouts (Resident App)
```
+-------------------------------------------------------------+
| [Avatar] Good Morning, Avinash!             [Bell] [SOS]    |
| Flat: Tower A - 1204 (Owner)                                |
+-------------------------------------------------------------+
| Quick Actions:                                              |
| +----------------+ +----------------+ +------------------+  |
| | [QR] Guest Pass| | [Rupee] Pay Due| | [Wrench] Helpdesk|  |
| +----------------+ +----------------+ +------------------+  |
+-------------------------------------------------------------+
| Gate Activity (Live):                                       |
| +---------------------------------------------------------+ |
| | [Photo] Ramesh (Swiggy) at Main Gate        09:32 AM   | |
| | [ APPROVE ]        [ CALL GUARD ]        [ LEAVE AT GATE] | |
| +---------------------------------------------------------+ |
+-------------------------------------------------------------+
| Society Dues:                                               |
| Current Invoice: $120.00 (Due in 5 days)                    |
| [ PAY NOW (UPI / CARD) ]                                    |
+-------------------------------------------------------------+
| Domestic Staff On Premises:                                 |
| - Sita (Maid): In Flat (Entered 08:15 AM)                   |
+-------------------------------------------------------------+
| [Home]       [Gate]       [Payments]       [Community]      |
+-------------------------------------------------------------+
```

### 5.4 Tablet Screen Layouts (Gatekeeper Guard App)
```
+-------------------------------------------------------------+
| COMMUNITYHOLDER GATEKEEPER | North Gate Tablet | Status: OK |
+-------------------------------------------------------------+
| [ BIG BUTTON: NEW VISITOR ]    [ BIG BUTTON: PRE-APPROVED ] |
|                                                             |
| Enter Flat (e.g. A-101): [  101  ]                          |
| Enter 6-Digit Guest Pass: [  _ _ _ _ _ _  ]                 |
|                                                             |
| Quick Delivery Presets:                                     |
| [ AMAZON ]   [ FLIPKART ]   [ SWIGGY ]   [ ZOMATO ] [ UBER ]|
+-------------------------------------------------------------+
| Active Visitors In Campus (34):                             |
| - Courier 1 (Bluedart) -> Flat B-302 (In for 14 min)        |
| - Guest 2 (Vikram)     -> Flat A-101 (In for 42 min)        |
|   [! OVERSTAY ALERT: EXCEEDED 30 MIN !]                     |
+-------------------------------------------------------------+
| [ SCAN QR / RFID ]            [ EMERGENCY GATE LOCKDOWN ]   |
+-------------------------------------------------------------+
```

---

## 6. Edge Cases & Resiliency Matrix

| Edge Case Scenario | Failure Risk | Resiliency & Mitigation Strategy |
|---|---|---|
| **Resident phone in Do-Not-Disturb / Offline during Gate Arrival** | Visitor stranded at gate | Automated 30s timeout falls back to Telephony IVR call; guard tablet provides "Call Alternate Flat Member" or "Hold at Gate". |
| **Concurrent Amenity Double-Booking** | Two residents book the same tennis slot simultaneously | Redis `Redlock` distributed mutex on `amenity_id + slot_time`; database unique composite constraint acts as second guardrail. |
| **Guard Tablet Wi-Fi Dropout during Morning Rush** | Gate entry queue accumulates | Tablet automatically operates in offline mode; authenticates pre-approved PINs against local SQLite; queues walk-in events in Outbox. |
| **Double Payment via Bank and Payment Gateway** | Resident billed twice | Webhook idempotency keys based on transaction ID; incoming funds credited to resident's prepaid wallet balance automatically. |
| **Tampered Timestamp on Guard Patrol** | Guards falsify patrol rounds | Patrol checkpoints signed cryptographically using hardware NFC UID and device timestamp cross-referenced with server clock skew limits (< 30s). |
| **Data Privacy (Resident leaves society)** | Former tenant accesses gate feeds | Move-out workflow invalidates all user tokens, detaches unit permissions, revokes domestic staff associations, and archives ledger history. |
