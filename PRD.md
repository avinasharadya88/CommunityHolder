# Product Requirements Document (PRD)
## CommunityHolder — The Unified Smart Society & Community Management Ecosystem

---

| **Document Version** | 1.0.0 |
| **Status** | Approved for Architecture & Design |
| **Target Platforms** | Android Mobile, iOS Mobile, Web (Responsive) |
| **Target Personas** | Residents (Owners & Tenants), Security Guards, Society Management Committees (MC / RWA), Facility Managers, Accountants, Vendors |
| **Reference Ecosystem** | Reverse-engineered from ADDA (ApartmentADDA, ADDA ERP & ADDA Gatekeeper) |

---

## 1. Executive Summary & Vision

### 1.1 Problem Statement
Modern residential gated communities, apartment complexes, and housing societies suffer from fragmented operational tools. Management committees track society finances on disconnected spreadsheets, security guards record visitors in paper logbooks, facility managers receive complaints via scattered WhatsApp messages, and residents face opaque maintenance billing and delayed visitor coordination.

### 1.2 Product Vision
**CommunityHolder** is an all-in-one, enterprise-grade Community Super App and Society ERP designed to digitize and unify every touchpoint of residential life:
1. **Front-Gate Security & Access Automation (CommunityHolder Gatekeeper)**: Fast, reliable, offline-capable visitor validation, daily staff tracking, delivery coordination, and intercom VoIP calls.
2. **Auditor-Grade Financial & Operational Backbone (CommunityHolder ERP)**: Automated invoicing, payment gateway reconciliation, multi-tier purchase procurement, statutory compliance, and double-entry accounting.
3. **Resident Living & Social Platform (CommunityHolder Resident App)**: Frictionless billing payments, amenity bookings, helpdesk ticketing with SLAs, pre-approved visitor passes, and verified community engagement.

---

## 2. Product Architecture & User Personas

```
+-----------------------------------------------------------------------------------+
|                                 CommunityHolder                                   |
+-----------------------------------------------------------------------------------+
|  0. Authentication & Onboarding (Cross-Platform)                                  |
|     - Mobile Number Login with Global Country Codes (+91 India & International)   |
|     - Secure Passwordless OTP Verification (SMS / WhatsApp Delivery Fallback)     |
|     - First-Time KYC Registration: Govt ID & Property Ownership/Tenancy Proof     |
|     - Manual Review Queue for Society Admin, Estate & Facility Managers           |
|     - Strict Role-Based Access Control (RBAC) with Pre-Approval Restricted State  |
+-----------------------------------------------------------------------------------+
|  1. Resident App (iOS/Android/Web)                                                |
|     - Visitor Pre-approval & Intercom Approval                                    |
|     - Maintenance Payments & Ledger                                               |
|     - Helpdesk Ticketing with Photo & SLA                                         |
|     - Amenity Reservation & Booking                                               |
|     - Daily Domestic Help Attendance & Reviews                                    |
|     - Society Social Feed, Notices & Polling                                      |
+-----------------------------------------------------------------------------------+
|  2. Gatekeeper Guard App (Android/iOS Tablet & Phone)                             |
|     - Visitor Check-in (Walk-in, OTP/QR Pre-approved, Delivery, Cabs)              |
|     - Domestic Staff Check-in/Check-out (Biometric / Passcode / Card)             |
|     - Parcel Custody & Pickup Verification                                        |
|     - Guard Patrol Verification (QR / NFC Checkpoints)                            |
|     - Emergency SOS Broadcast & Gate Lockdown                                     |
|     - Offline-First Operation with Background Delta Sync                          |
+-----------------------------------------------------------------------------------+
|  3. Management Committee & ERP Admin Portal (Web Dashboard & Admin App)           |
|     - Manual KYC Verification Queue & Document Inspection (Approve / Reject)      |
|     - Complete Double-Entry Society Accounting & General Ledger                   |
|     - Automated Dues Calculation (Fixed, Sq.Ft, Sub-meters, DG, Penalties)        |
|     - Smart Bank Reconciliation & Virtual Account Payments (VAN / UPI)            |
|     - Vendor, Purchase Order & Expense Approval Workflow                          |
|     - Tenant/Owner Onboarding, KYC & Flat Directory                               |
|     - Facility AMC, Asset Tracking & Audit Compliance                             |
+-----------------------------------------------------------------------------------+
```

### 2.1 Persona Specifications
- **P1: Apartment Resident (Owner-Occupant)**: Submits property ownership documents (Sale Deed/Tax Receipt) during onboarding; once approved by Estate Manager, accesses gate approvals, transparent society ledger, dues payment, and amenity bookings.
- **P2: Apartment Resident (Tenant)**: Submits government ID and registered Rental/Lease Agreement; upon manual verification by Admin/Facility Manager, gains access to gate passes, domestic staff notifications, and tenant utility dues.
- **P3: Non-Resident Owner (Landlord)**: Authenticates with international/domestic phone number, manages multiple owned units, verifies tenant allocations remotely, and participates in society AGM polling.
- **P4: Security Guard (Gate Operator)**: Accesses Gatekeeper mode via guard roster credentials and OTP; executes sub-second visitor check-in, staff attendance, and emergency gate controls.
- **P5: Society Treasurer / Accountant**: Reviews audited financial accounts, reconciles virtual account bank streams, and authorizes society purchase orders.
- **P6: Estate / Facility Manager**: Dedicated operational gatekeeper responsible for reviewing first-time resident registrations, verifying uploaded ID and property proofs, managing vendor SLAs, and handling campus assets.
- **P7: Domestic Staff (Maids, Drivers, Cooks)**: Verified by Facility Manager and linked to resident units for automatic gate pass check-in and attendance logging.

---

## 3. Reverse-Engineered Feature Specifications

### 3.0 Module 0: Strict Role-Based Authentication, Phone OTP & KYC Onboarding

#### 3.0.1 Mobile Number & Country Code OTP Authentication
1. **Global Phone Number Support (E.164 Standard)**:
   - Dedicated interactive country code picker supporting Indian numbers (`+91`) and international numbers across all regions (`+1` US/Canada, `+44` UK, `+971` UAE, `+65` Singapore, etc.).
   - Client-side and server-side validation using Google's `libphonenumber` standard to enforce carrier and length validity before triggering SMS dispatch.
2. **Passwordless OTP Generation & Delivery**:
   - 6-digit cryptographically secure time-based OTP valid for 5 minutes.
   - Dual delivery pipeline: Primary delivery via high-reliability Tier-1 SMS Gateway (e.g., Twilio / Gupshup / Karix); automatic failover to WhatsApp Business API if SMS is unacknowledged within 45 seconds.
   - Anti-abuse & rate limiting: Maximum 3 OTP requests per 10 minutes per IP/Phone; 5 incorrect OTP attempts lock the account for 30 minutes.
3. **Session & Token Management**:
   - On successful OTP validation, the backend generates an asymmetric JSON Web Token (JWT) containing tenant society ID, user ID, assigned roles, and current KYC verification status (`UNREGISTERED`, `PENDING_VERIFICATION`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`).
   - Strict Role-Based Access Control (RBAC): Token scopes dictate exact API privileges across Resident, Security Guard, Facility Manager, Accountant, and Society Admin.

#### 3.0.2 First-Time User Registration & KYC Onboarding Flow
1. **Profile & Property Affiliation**:
   - When a phone number is authenticated for the first time, the user is directed to the **Mandatory First-Time Registration & KYC Flow**.
   - User provides full legal name, secondary contact email, emergency contact, and profile avatar.
   - User selects:
     - Target Housing Society from verified society directory.
     - Block / Tower / Phase.
     - Unit / Flat / Villa Number.
     - Relationship Type: `OWNER_OCCUPIED`, `NON_RESIDENT_OWNER`, `TENANT`, or `FAMILY_MEMBER`.
2. **Mandatory Verification Document Submission**:
   - To prevent unauthorized access to community security feeds and gate intercoms, users **must** upload authentic verification documentation before accessing any community features:
     - **Document 1: Personal Identification Proof (Government ID)**:
       - Options: Aadhaar Card (with masked UID option), Passport, Driving License, or Voter ID Card.
       - Requirement: Clear front and back photo/PDF showing legal name matching registration.
     - **Document 2: Proof of Property Ownership or Tenancy**:
       - **For Property Owners**: Registered Sale Deed (title page + schedule), Latest Property Tax Paid Receipt, Possession / Builder Allotment Letter, or Khata Certificate.
       - **For Tenants**: Registered Rent Agreement / Lease Agreement showing landlord name, tenant name, flat number, and valid lease period.
   - Direct-to-cloud secure encrypted upload (AES-256-GCM) with tamper-evident SHA-256 content hashes.
3. **Pre-Approval Restricted State**:
   - Upon submitting registration and documents, the user's account transitions to `PENDING_VERIFICATION`.
   - **Access Confinement**: The resident cannot access gate feeds, visitor logs, intercoms, payments, or community forums while in this state.
   - The user sees a dedicated **"Application Under Review"** status dashboard displaying:
     - Application ID and submission timestamp.
     - Selected unit and society details.
     - Document preview thumbnails with verified upload status.
     - Estimated review time SLA (typically 24–48 hours).
     - Direct helpline contact to the Estate Management Office.

#### 3.0.3 Manual Verification & Approval Workflow (Admin / Estate / Facility Manager)
1. **Verification Queue Dashboard**:
   - Dedicated administrative portal screen for Society Admins, Estate Managers, and Facility Managers.
   - Filterable pending review queue sorted by submission date, block/tower, and member type (Owner vs Tenant).
2. **Document Review & Comparison Workspace**:
   - Split-screen comparison tool:
     - Left pane: Registered applicant details, phone number, email, and claimed unit.
     - Right pane: High-resolution document viewer with pan/zoom, rotation, and side-by-side inspection of Government ID and Property Ownership Proof.
     - Official Society Roster cross-check: Highlights whether the flat is currently marked vacant, registered to an existing owner, or leased to another active tenant.
3. **Administrative Decision Actions**:
   - **Action A: APPROVE**:
     - Estate/Facility Manager clicks "Verify & Approve Access".
     - System updates user status to `APPROVED`, links the user to the `unit_members` table as an active resident, generates flat virtual account numbers (VAN), and enables full role privileges.
     - Dispatches instant high-priority welcome push notification, SMS, and WhatsApp message: *"Welcome to CommunityHolder! Your access for Flat [Unit No] in [Society Name] has been verified and approved."*
   - **Action B: REJECT**:
     - Estate/Facility Manager selects "Reject Application" and is **required** to select or input a specific rejection reason (e.g., *"Uploaded sale deed does not match applicant name"*, *"Lease agreement has expired"*, *"ID proof image is blurry/unreadable"*).
     - Account status transitions to `REJECTED`.
     - Resident app updates immediately with the exact rejection feedback and provides a one-click **"Resubmit Updated Documents"** workflow without requiring re-entry of basic profile information.
4. **Immutable KYC Audit Trail**:
   - Every verification, approval, rejection, and document view is permanently logged with the reviewer's User ID, timestamp, IP address, and comments for statutory compliance and RWA audit inspections.

#### 3.1.1 Visitor Check-in & Validation Workflows
1. **Walk-In Visitors**:
   - Guard enters visitor name, mobile number, flat number, purpose of visit, and vehicle number.
   - Tablet camera captures visitor photo.
   - App dispatches high-priority push notification and WebSocket event to all registered flat residents with visitor photo, name, and "Approve" / "Deny" / "Call Guard" buttons.
   - If unresponded within 30 seconds, the system triggers automated VoIP Intercom / IVR fallback call to the resident's phone.
   - On resident approval, a digital visitor pass with QR code and entry timestamp is logged, and the boom barrier trigger signal is fired.
2. **Pre-Approved Visitors (Guest Pass)**:
   - Resident pre-generates a 6-digit PIN or QR code pass with a custom validity window (e.g., today 4 PM - 9 PM) for guests or parties.
   - At the gate, guard inputs the PIN or scans the QR code via camera.
   - Instant validation (< 2 seconds): System confirms flat number and guest name without ringing resident phone.
3. **Delivery & Cab Verification**:
   - Quick presets for prominent delivery aggregators (Amazon, Flipkart, Swiggy, Zomato, Uber, Ola, etc.).
   - Resident can set "Always Allow with OTP" or "Leave at Security Gate".
   - If "Leave at Security Gate" is selected:
     - Guard marks parcel received, takes parcel photo, and tags the flat.
     - Resident receives parcel notification with a 4-digit pickup OTP.
     - Resident or authorized domestic staff presents the OTP to security to claim the parcel.
4. **Overstay & Security Alerts**:
   - Configurable maximum stay threshold for delivery executives and cabs (e.g., 30 minutes).
   - If visitor has not checked out within threshold, guard tablet and resident receive an "Overstay Alert" to verify presence.
5. **Vehicle Access Automation (ANPR / RFID Integration)**:
   - Whitelist of resident vehicles mapped to units.
   - Integration hook for automated number plate recognition (ANPR) cameras and UHF RFID readers for touchless boom-barrier opening.
   - Unauthorized vehicle entry notification if an unregistered vehicle enters.

#### 3.1.2 Domestic Daily Staff Management
1. **Directory & Profile Management**:
   - Central database of maids, cooks, drivers, cleaners, nannies, and gardeners.
   - Background check status, Aadhaar/ID proof storage, emergency contact, and flats assigned.
2. **Digital Attendance Tracking**:
   - Staff entry via QR badge scan, phone number entry, or facial recognition match on the guard tablet.
   - Instant notification to associated flats upon entry ("Maid Sita has entered the community at 08:02 AM").
   - Exit check-out notification ("Maid Sita has departed at 09:35 AM") with automatic daily hours calculation.
3. **Community Rating & Hiring**:
   - Residents rate staff on punctuality, quality, and behavior.
   - Prospective employers can browse vetted helpers currently working in the community.

#### 3.1.3 Guard Patrolling & Security Operations
1. **QR / NFC Patrol Checkpoints**:
   - Checkpoint tags placed across society grounds (basements, stairwells, clubhouse, transformer yards).
   - Guard must scan tags at predetermined sequence and time windows during night shifts.
   - Real-time GPS and timestamp validation prevents spoofing.
   - Alerts sent to Facility Manager if a checkpoint is missed by > 15 minutes.
2. **Material Movement (In/Out Pass)**:
   - Outward Gate Pass required for high-value appliances, moving trucks, contractor tools.
   - Resident or Facility Manager pre-approves the pass in-app; guard cross-verifies items before exit.
3. **Emergency Panic Button / SOS**:
   - Triggerable by resident in-app or guard on tablet for 4 categories: Medical Emergency, Fire, Intruder/Threat, Lift Stuck.
   - Instantly sounds loud alarm on all security guard devices.
   - Displays unit location, caller details, and floor plan.
   - Dispatches emergency push notification to emergency contacts and community quick-response volunteers.

---

### 3.2 Module 2: Society ERP, Accounting & Governance

#### 3.2.1 Automated Society Billing & Invoicing Engine
1. **Flexible Invoicing Rule Formulas**:
   - **Fixed Rate**: Flat charge per unit (e.g., $100 / flat).
   - **Area-Based (Per Sq.Ft)**: Rate multiplied by unit super built-up area.
   - **Hybrid**: Fixed base charge + area-based component + parking bay charges.
   - **Utility Consumption**: Sub-metered water, piped gas, and diesel generator (DG) power units.
   - **Ad-Hoc / Special Assessments**: Festival funds, clubhouse capital renovation, painting levy.
2. **Automated Bill Cycles**:
   - Automated invoice generation on the 1st of every month/quarter.
   - Automated delivery via Email, SMS, WhatsApp, and App push notification with PDF bill copy.
   - Configurable grace period (e.g., 15 days) and automated calculation of late payment penalty (fixed fee or % interest per annum).

#### 3.2.2 Integrated Payments & Smart Reconciliation
1. **Multi-Channel Payment Gateway**:
   - Integrated support for UPI (Instant Intent & Dynamic QR), Debit/Credit Cards, Net Banking, and Auto-Debit (eNACH / Mandates).
   - Zero or transparently subsidized convenience fees.
2. **Virtual Account Numbers (VAN) / Smart Collection**:
   - Each flat is allocated a unique virtual bank account number (e.g., `CHOLDR00000A101` for Flat A-101).
   - Residents transferring via NEFT/RTGS/IMPS are automatically reconciled to their flat ledger in real-time without manual receipt matching.
3. **Automated Receipts & Ledger Posting**:
   - Instant generation of digital receipt upon payment success.
   - Instant posting to Member Ledger, Bank Account, and Income Account in the ERP.
   - Defaulter aging reports (30, 60, 90+ days) and automated staggered reminders.

#### 3.2.3 Auditor-Grade Double-Entry Bookkeeping
1. **Chart of Accounts (CoA)**:
   - Pre-configured RWA standard chart of accounts: Asset (Bank, Petty Cash, Fixed Assets), Liability (Sinking Fund, Security Deposits, Vendor Payables), Income (Maintenance Dues, Facility Rentals, Interest), Expense (Security Agency, Housekeeping, Electricity, Repairs).
2. **Procurement to Payment (P2P Workflow)**:
   - Purchase Requisition (PR) created by Facility Manager with vendor quotation attachments.
   - Purchase Order (PO) issued upon digital approval from Management Committee members according to spending authorization limits.
   - Vendor Invoice entry with 3-way matching (PO, Goods Received Note, Invoice).
   - Multi-signature digital payout approval (e.g., Treasurer + President must dual-authorize before payment execution).
3. **Financial Statements & Reports**:
   - Balance Sheet, Income & Expenditure Statement, Trial Balance, General Ledger, Cash Book, Bank Reconciliation Statements (BRS).
   - One-click export for external statutory auditors.
   - GST calculation reports (GSTR-1, GSTR-3B matching for taxable RWA maintenance over statutory thresholds).

#### 3.2.4 Member Directory, Asset & Facility Management
1. **Digital Unit Registry**:
   - Hierarchical property tree: Society -> Block/Tower -> Floor -> Unit.
   - Member relationship mapping: Owner, Co-owner, Tenant, Resident Family Members, Domestic Staff.
   - Move-In / Move-Out clearance workflow: Checking pending dues, deposit collection, lift protection scheduling, issuing gate clearance pass.
2. **Asset Registry & AMC Tracking**:
   - Log of community equipment: Elevators, DG Sets, Water Pumps, Swimming Pool Filters, CCTV Cameras, Fire Extinguishers.
   - Annual Maintenance Contract (AMC) dates, service provider details, renewal reminders, and service maintenance history.
   - QR code tagging on physical assets for audit scanning during preventive inspections.

---

### 3.3 Module 3: Resident Experience & Community Super App

#### 3.3.1 Helpdesk & Service Request Management
1. **Ticket Creation**:
   - Categorized under Personal Unit (plumbing, electrical) or Common Area (staircase light, elevator beep, garbage accumulation).
   - Rich media attachments: high-resolution photos, 15-second video, or audio memo.
   - Preferred time-slot selection for technician visit.
2. **SLA Management & Assignment**:
   - Auto-routing based on category to specific staff/vendors (e.g., Electrical -> Resident Electrician).
   - Real-time status progression: `Open` -> `Assigned` -> `In Progress` -> `Resolved` -> `Closed`.
   - SLA breach alerts escalating to Facility Manager and Committee Secretary.
   - Digital signature or OTP from resident required before ticket closure, followed by 5-star rating and review.

#### 3.3.2 Amenity & Facility Reservation
1. **Slot-Based Booking**:
   - Facilities: Clubhouse, Banquet Hall, Tennis Court, Badminton Court, Swimming Pool, Guest Rooms.
   - Rules: Maximum hours per flat per week, advance booking window (e.g., 7 days ahead), peak-hour restrictions.
2. **Payment & Refundable Deposits**:
   - Booking fees and refundable security deposits handled through the payment gateway.
   - Post-event inspection checklist by Facility Manager to trigger automated deposit refund.

#### 3.3.3 Community Governance & Social Buzz
1. **Official Digital Notice Board**:
   - High-visibility broadcast notices pinned with priority levels (Emergency, Financial, General, Event).
   - Digital read receipts allowing management to verify how many residents saw the notice.
2. **Private Social Network & Discussions**:
   - Moderated discussion threads per topic (e.g., Gardening Club, Pet Owners, Sports, Carpooling).
   - Anti-spam & community guidelines moderation tools for committee admins.
3. **Polling & General Body Voting**:
   - Secure digital voting for society resolutions.
   - Strict one-vote-per-flat enforcement for owners.
   - Verifiable, tamper-evident audit logs with instant quorum calculation and percentage breakdown.
4. **Internal Marketplace (Classifieds)**:
   - Community-only buy/sell/rent board (furniture, appliances, car rentals, flat sublets).

---

## 4. Non-Functional Requirements (NFRs)

| Dimension | Target Metric | Engineering Strategy |
|---|---|---|
| **Latency (Gate Validation)** | < 1.5 seconds | Local caching of pre-approved OTPs and staff tokens on guard tablet; Redis cache on API gateway |
| **Intercom Notification Latency** | < 800 milliseconds | Persistent WebSocket connection + APNs VoIP Push (PushKit) + FCM High Priority Channels |
| **Availability (Gate Operations)** | 99.99% Offline-First | Local SQLite database on tablets with CRDT-based delta synchronization upon network reconnection |
| **Availability (Cloud API)** | 99.95% Uptime | Multi-AZ deployment on containerized Kubernetes/Serverless architecture with automated failover |
| **Security & Privacy** | DPDPA & GDPR Compliant | AES-256 encryption at rest, TLS 1.3 in transit, automated PII obfuscation and visitor photo auto-deletion after 90 days |
| **Scalability** | 500,000+ Units across 2,000+ Societies | Multi-tenant schema design with logical/row-level tenant isolation and horizontal database read-replicas |
| **Mobile Performance** | 60 FPS UI, < 25MB App Bundle | Flutter compiled binary optimization, lazy asset loading, lightweight vector icons |

---

## 5. Phased Product Roadmap

```
+---------------------------------------------------------------------------------------+
|  PHASE 1: Core Foundation & Security Gate (MVP)                                       |
|  - Multi-tenant Society & Unit Hierarchy Setup                                        |
|  - Gatekeeper Guard App (Visitor Walk-in, Pre-approved OTP Pass, Delivery Logging)    |
|  - Resident Mobile App (Gate Notifications, Intercom Approve/Deny, Guest PIN Creation)|
|  - Offline-First Guard Sync Engine                                                    |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|  PHASE 2: Society ERP, Billing & Payments                                             |
|  - Automated Maintenance Bill Calculation Engine                                      |
|  - Payment Gateway & Virtual Account Number (VAN) Integration                         |
|  - Double-Entry Chart of Accounts & General Ledger                                    |
|  - Defaulter Tracking, Invoicing PDFs & Payment Receipts                              |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|  PHASE 3: Facility Operations, Staff & Community Governance                           |
|  - Helpdesk Ticketing System with SLA Escalation Engine                               |
|  - Amenity Reservation & Booking System with Slot Constraints                         |
|  - Domestic Staff Daily Check-In/Check-Out & Review Profiles                          |
|  - Official Notice Board, Resident Discussions & Classifieds                          |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|  PHASE 4: Enterprise Hardware & AI Automation                                         |
|  - ANPR (Automated Number Plate Recognition) & Boom Barrier Controller Hardware Hook  |
|  - Face Recognition Check-in for Domestic Staff & Guards                              |
|  - IoT Smart Meter Integration (Water, Gas, Diesel Generator Energy consumption)      |
|  - Automated Purchase Order (PO) 3-Way Match & Auditor Portal                         |
+---------------------------------------------------------------------------------------+
```
