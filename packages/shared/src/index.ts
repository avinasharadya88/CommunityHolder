/**
 * CommunityHolder Shared Domain Entities, DTOs & Constants
 */

export type Role =
  | 'APPLICANT'
  | 'RESIDENT_OWNER'
  | 'RESIDENT_TENANT'
  | 'NON_RESIDENT_OWNER'
  | 'FAMILY_MEMBER'
  | 'SECURITY_GUARD'
  | 'ESTATE_MANAGER'
  | 'FACILITY_MANAGER'
  | 'TREASURER'
  | 'SOCIETY_ADMIN';

export type KycStatus =
  | 'UNREGISTERED'
  | 'PENDING_VERIFICATION'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export type VisitorType = 'GUEST' | 'DELIVERY' | 'CAB' | 'SERVICE' | 'CONTRACTOR';

export type VisitorStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DENIED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'OVERSTAY';

export type DocumentCategory = 'GOVT_ID' | 'PROPERTY_PROOF';

export type DocumentType =
  | 'AADHAAR'
  | 'PASSPORT'
  | 'DRIVING_LICENSE'
  | 'VOTER_ID'
  | 'SALE_DEED'
  | 'PROPERTY_TAX_RECEIPT'
  | 'POSSESSION_LETTER'
  | 'RENTAL_AGREEMENT';

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID';

export type EntryType = 'DEBIT' | 'CREDIT';

export type TicketScope = 'PERSONAL_UNIT' | 'COMMON_AREA';

export type TicketCategory =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'CARPENTRY'
  | 'LIFT_MAINTENANCE'
  | 'HOUSEKEEPING'
  | 'SECURITY';

export type TicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ESCALATED_L1'
  | 'ESCALATED_L2'
  | 'RESOLVED'
  | 'CLOSED';

export interface Society {
  id: string;
  name: string;
  code: string;
  address_street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  van_bank_prefix: string;
  settings: {
    visitor_photo_required: boolean;
    overstay_alert_minutes: number;
    ivr_fallback_timeout_seconds: number;
    auto_purge_visitor_days: number;
    late_payment_penalty_rate_annual: number;
  };
  created_at: string;
}

export interface Block {
  id: string;
  society_id: string;
  name: string;
  total_floors: number;
}

export interface Unit {
  id: string;
  society_id: string;
  block_id: string;
  unit_number: string;
  super_built_up_area: number;
  occupancy_status: 'VACANT' | 'OWNER_OCCUPIED' | 'TENANT_OCCUPIED';
  virtual_account_number: string;
}

export interface User {
  id: string;
  country_code: string;
  national_number: string;
  phone_e164: string;
  email?: string;
  full_name: string;
  avatar_url?: string;
  kyc_status: KycStatus;
  rejection_reason?: string;
  is_active: boolean;
  created_at: string;
}

export interface KycDocument {
  id: string;
  user_id: string;
  society_id: string;
  unit_id: string;
  document_category: DocumentCategory;
  document_type: DocumentType;
  document_identifier_masked?: string;
  file_url: string;
  file_sha256: string;
  file_size_bytes: number;
  mime_type: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  created_at: string;
}

export interface UnitMember {
  id: string;
  unit_id: string;
  user_id: string;
  member_type: 'PRIMARY_OWNER' | 'CO_OWNER' | 'TENANT' | 'FAMILY_MEMBER';
  is_primary_contact: boolean;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  approved_at?: string;
  move_in_date?: string;
}

export interface VisitorSession {
  id: string;
  society_id: string;
  unit_id: string;
  visitor_type: VisitorType;
  visitor_name: string;
  visitor_phone?: string;
  vehicle_number?: string;
  delivery_company?: string;
  photo_url?: string;
  passcode?: string;
  status: VisitorStatus;
  is_pre_approved: boolean;
  approved_by_user_id?: string;
  guard_id?: string;
  valid_from?: string;
  valid_until?: string;
  checked_in_at?: string;
  checked_out_at?: string;
  idempotency_key?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  society_id: string;
  unit_id: string;
  invoice_number: string;
  bill_date: string;
  due_date: string;
  subtotal_amount: number;
  tax_amount: number;
  late_fee_amount: number;
  total_amount: number;
  amount_paid: number;
  status: InvoiceStatus;
  created_at: string;
}

export interface LedgerTransaction {
  id: string;
  society_id: string;
  transaction_date: string;
  reference_number: string;
  description: string;
  posted_by?: string;
  lines: LedgerEntry[];
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  account_code: string;
  account_name: string;
  entry_type: EntryType;
  amount: number;
  unit_id?: string;
}

export interface Amenity {
  id: string;
  society_id: string;
  name: string;
  booking_type: 'SLOT' | 'FULL_DAY';
  slot_duration_minutes: number;
  price_per_slot: number;
  refundable_deposit: number;
}

export interface AmenityBooking {
  id: string;
  amenity_id: string;
  unit_id: string;
  user_id: string;
  booking_start: string;
  booking_end: string;
  total_fee: number;
  deposit_amount: number;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}

export interface HelpdeskTicket {
  id: string;
  society_id: string;
  unit_id: string;
  user_id: string;
  category: 'PLUMBING' | 'ELECTRICAL' | 'SECURITY' | 'CARPENTRY' | 'OTHER';
  title: string;
  description: string;
  status: 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  created_at: string;
}

// Request & Response DTOs
export interface RequestOtpDto {
  country_code: string;
  national_number: string;
  channel?: 'SMS' | 'WHATSAPP';
}

export interface VerifyOtpDto {
  country_code: string;
  national_number: string;
  otp: string;
}

export interface SubmitKycDto {
  full_name: string;
  email?: string;
  society_id: string;
  block_id: string;
  unit_id: string;
  relationship_type: 'PRIMARY_OWNER' | 'CO_OWNER' | 'TENANT' | 'FAMILY_MEMBER';
  documents: {
    document_category: DocumentCategory;
    document_type: DocumentType;
    document_identifier_masked?: string;
    file_url: string;
    file_sha256: string;
    file_size_bytes: number;
    mime_type: string;
  }[];
}

export interface VisitorCheckInDto {
  society_id: string;
  unit_id: string;
  visitor_type: VisitorType;
  visitor_name: string;
  visitor_phone?: string;
  vehicle_number?: string;
  delivery_company?: string;
  photo_url?: string;
  idempotency_key?: string;
}

export interface OfflineSyncBatchDto {
  society_id: string;
  device_id: string;
  events: {
    event_id: string;
    event_type: 'PRE_APPROVED_CHECK_IN' | 'WALK_IN_CHECK_IN' | 'VISITOR_CHECK_OUT';
    timestamp: string;
    payload: any;
  }[];
}
