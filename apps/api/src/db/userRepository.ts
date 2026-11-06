import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { db } from './inMemoryDb.js';
import type { User, Role, KycDocument, UnitMember } from '@communityholder/shared';

/**
 * UserRepository
 * Manages user data, profiles, roles, and KYC compliance records
 * in Supabase PostgreSQL (Project: ggzbyynthvxwkpdbjklf) with in-memory sync.
 */
export const UserRepository = {
  /**
   * Find a user by E.164 normalized phone number
   */
  async findUserByPhone(phone_e164: string): Promise<User | undefined> {
    // 1. If Supabase is configured with active credentials, query the public.users table
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('phone_e164', phone_e164)
          .maybeSingle();

        if (!error && data) {
          const user: User = {
            id: data.id,
            country_code: data.country_code,
            national_number: data.national_number,
            phone_e164: data.phone_e164,
            email: data.email || undefined,
            full_name: data.full_name,
            avatar_url: data.avatar_url || undefined,
            kyc_status: data.kyc_status,
            rejection_reason: data.rejection_reason || undefined,
            is_active: data.is_active,
            created_at: data.created_at,
          };
          // Sync to in-memory store
          db.users.set(user.id, user);
          return user;
        }
      } catch (err) {
        console.warn('[UserRepository] Supabase query fallback:', err);
      }
    }

    // 2. Query in-memory DB fallback
    for (const u of db.users.values()) {
      if (u.phone_e164 === phone_e164) {
        return u;
      }
    }
    return undefined;
  },

  /**
   * Find a user by UUID primary key
   */
  async findUserById(userId: string): Promise<User | undefined> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!error && data) {
          const user: User = {
            id: data.id,
            country_code: data.country_code,
            national_number: data.national_number,
            phone_e164: data.phone_e164,
            email: data.email || undefined,
            full_name: data.full_name,
            avatar_url: data.avatar_url || undefined,
            kyc_status: data.kyc_status,
            rejection_reason: data.rejection_reason || undefined,
            is_active: data.is_active,
            created_at: data.created_at,
          };
          db.users.set(user.id, user);
          return user;
        }
      } catch (err) {
        console.warn('[UserRepository] Supabase query fallback:', err);
      }
    }

    return db.users.get(userId);
  },

  /**
   * Create or update a user record in Supabase public.users
   */
  async createOrUpdateUser(params: {
    id?: string;
    country_code: string;
    national_number: string;
    phone_e164: string;
    full_name?: string;
    email?: string;
    kyc_status?: any;
    rejection_reason?: string;
    is_active?: boolean;
  }): Promise<User> {
    const userId = params.id || uuidv4();
    const user: User = {
      id: userId,
      country_code: params.country_code,
      national_number: params.national_number,
      phone_e164: params.phone_e164,
      full_name: params.full_name || 'Resident Applicant',
      email: params.email,
      kyc_status: params.kyc_status || 'UNREGISTERED',
      rejection_reason: params.rejection_reason,
      is_active: params.is_active ?? true,
      created_at: new Date().toISOString(),
    };

    // 1. Sync to local memory
    db.users.set(userId, user);
    if (!db.userRoles.has(userId)) {
      db.userRoles.set(userId, ['APPLICANT']);
    }

    // 2. Persist to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('users').upsert({
          id: user.id,
          country_code: user.country_code,
          national_number: user.national_number,
          phone_e164: user.phone_e164,
          full_name: user.full_name,
          email: user.email || null,
          kyc_status: user.kyc_status,
          rejection_reason: user.rejection_reason || null,
          is_active: user.is_active,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[UserRepository] Supabase upsert failed:', err);
      }
    }

    return user;
  },

  /**
   * Get roles for a user
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        if (!error && data && data.length > 0) {
          const roles = data.map((r: any) => r.role as Role);
          db.userRoles.set(userId, roles);
          return roles;
        }
      } catch (err) {
        console.warn('[UserRepository] Supabase roles query fallback:', err);
      }
    }

    return db.userRoles.get(userId) || ['APPLICANT'];
  },

  /**
   * Set roles for a user in a society
   */
  async setUserRoles(userId: string, societyId: string, roles: Role[]): Promise<void> {
    db.userRoles.set(userId, roles);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('user_roles').delete().eq('user_id', userId).eq('society_id', societyId);
        const rows = roles.map((role) => ({
          user_id: userId,
          society_id: societyId,
          role,
        }));
        await supabase.from('user_roles').insert(rows);
      } catch (err) {
        console.warn('[UserRepository] Supabase set roles fallback:', err);
      }
    }
  },

  /**
   * Get approved unit and society for a user
   */
  async getUserUnitAndSociety(userId: string): Promise<{ unitId?: string; societyId?: string }> {
    for (const m of db.unitMembers.values()) {
      if (m.user_id === userId && m.approval_status === 'APPROVED') {
        const unit = db.units.get(m.unit_id);
        return {
          unitId: m.unit_id,
          societyId: unit?.society_id,
        };
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('unit_members')
          .select('unit_id, society_id')
          .eq('user_id', userId)
          .eq('approval_status', 'APPROVED')
          .maybeSingle();

        if (!error && data) {
          return {
            unitId: data.unit_id,
            societyId: data.society_id,
          };
        }
      } catch (err) {
        console.warn('[UserRepository] Supabase unit query fallback:', err);
      }
    }

    return {};
  },

  /**
   * Submit KYC registration and documents
   */
  async submitKyc(params: {
    userId: string;
    fullName: string;
    email?: string;
    societyId: string;
    blockId: string;
    unitId: string;
    relationshipType: string;
    documents: Array<{
      document_category: string;
      document_type: string;
      document_identifier_masked?: string;
      file_url: string;
      file_sha256: string;
      file_size_bytes: number;
      mime_type: string;
    }>;
  }): Promise<void> {
    // 1. Update user profile in local store
    const user = db.users.get(params.userId);
    if (user) {
      user.full_name = params.fullName;
      if (params.email) user.email = params.email;
      user.kyc_status = 'PENDING_VERIFICATION';
      user.rejection_reason = undefined;
    }

    // 2. Persist documents in memory
    for (const doc of params.documents) {
      const kycDoc: KycDocument = {
        id: uuidv4(),
        user_id: params.userId,
        society_id: params.societyId,
        unit_id: params.unitId,
        document_category: doc.document_category as any,
        document_type: doc.document_type as any,
        document_identifier_masked: doc.document_identifier_masked,
        file_url: doc.file_url,
        file_sha256: doc.file_sha256,
        file_size_bytes: doc.file_size_bytes,
        mime_type: doc.mime_type,
        status: 'PENDING',
        created_at: new Date().toISOString(),
      };
      db.kycDocuments.set(kycDoc.id, kycDoc);
    }

    // 3. Persist unit membership in memory
    const memberId = uuidv4();
    const unitMember: UnitMember = {
      id: memberId,
      unit_id: params.unitId,
      user_id: params.userId,
      member_type: params.relationshipType as any,
      is_primary_contact: true,
      approval_status: 'PENDING',
      move_in_date: new Date().toISOString(),
    };
    db.unitMembers.set(memberId, unitMember);

    // 4. Persist to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('users').update({
          full_name: params.fullName,
          email: params.email || null,
          kyc_status: 'PENDING_VERIFICATION',
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        }).eq('id', params.userId);

        const docRows = params.documents.map((d) => ({
          id: uuidv4(),
          user_id: params.userId,
          society_id: params.societyId,
          unit_id: params.unitId,
          document_category: d.document_category,
          document_type: d.document_type,
          document_identifier_masked: d.document_identifier_masked || null,
          file_url: d.file_url,
          file_sha256: d.file_sha256,
          file_size_bytes: d.file_size_bytes,
          mime_type: d.mime_type,
          status: 'PENDING',
          created_at: new Date().toISOString(),
        }));
        await supabase.from('kyc_documents').insert(docRows);

        await supabase.from('unit_members').upsert({
          id: memberId,
          unit_id: params.unitId,
          society_id: params.societyId,
          user_id: params.userId,
          member_type: params.relationshipType,
          is_primary_contact: true,
          approval_status: 'PENDING',
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[UserRepository] Supabase submitKyc failed:', err);
      }
    }
  },

  /**
   * Retrieve KYC status and uploaded documents for user
   */
  async getKycStatus(userId: string): Promise<{
    kyc_status: string;
    rejection_reason?: string;
    documents: KycDocument[];
  }> {
    const user = await this.findUserById(userId);
    const documents = Array.from(db.kycDocuments.values()).filter((d) => d.user_id === userId);

    return {
      kyc_status: user?.kyc_status || 'UNREGISTERED',
      rejection_reason: user?.rejection_reason,
      documents,
    };
  },

  /**
   * Retrieve all pending KYC applications for admin queue
   */
  async getAdminKycQueue(societyId?: string): Promise<any[]> {
    const pendingDocs = Array.from(db.kycDocuments.values()).filter(
      (d) => d.status === 'PENDING' && (!societyId || d.society_id === societyId)
    );

    const applicationsMap: Map<string, any> = new Map();
    for (const doc of pendingDocs) {
      const appKey = `${doc.user_id}_${doc.unit_id}`;
      if (!applicationsMap.has(appKey)) {
        const applicant = db.users.get(doc.user_id);
        const unit = db.units.get(doc.unit_id);
        const block = unit ? db.blocks.get(unit.block_id) : undefined;
        let memberType = 'PRIMARY_OWNER';
        for (const m of db.unitMembers.values()) {
          if (m.user_id === doc.user_id && m.unit_id === doc.unit_id) {
            memberType = m.member_type;
            break;
          }
        }

        applicationsMap.set(appKey, {
          application_id: doc.id,
          user_id: doc.user_id,
          applicant_name: applicant?.full_name || 'Unknown',
          phone_e164: applicant?.phone_e164,
          unit_number: unit?.unit_number,
          block_name: block?.name,
          relationship_type: memberType,
          submitted_at: doc.created_at,
          documents: [],
        });
      }
      applicationsMap.get(appKey).documents.push(doc);
    }

    return Array.from(applicationsMap.values());
  },

  /**
   * Admin approves or rejects a KYC application
   */
  async reviewKycDecision(params: {
    applicationId: string;
    reviewerId: string;
    decision: 'APPROVE' | 'REJECT';
    notes?: string;
    rejectionReason?: string;
  }): Promise<{ user?: User; kycDoc?: KycDocument }> {
    const kycDoc = db.kycDocuments.get(params.applicationId);
    if (!kycDoc) {
      return {};
    }

    const user = db.users.get(kycDoc.user_id);
    if (!user) {
      return {};
    }

    const newKycStatus = params.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    user.kyc_status = newKycStatus;
    if (params.decision === 'REJECT') {
      user.rejection_reason = params.rejectionReason || params.notes || 'Verification failed';
    } else {
      user.rejection_reason = undefined;
    }

    // Update all pending docs for this applicant
    for (const d of db.kycDocuments.values()) {
      if (d.user_id === user.id && d.unit_id === kycDoc.unit_id) {
        d.status = params.decision === 'APPROVE' ? 'VERIFIED' : 'REJECTED';
        d.verified_by = params.reviewerId;
        d.verified_at = new Date().toISOString();
        d.verification_notes = params.notes;
      }
    }

    // Update unit membership
    for (const m of db.unitMembers.values()) {
      if (m.user_id === user.id && m.unit_id === kycDoc.unit_id) {
        m.approval_status = params.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        m.approved_by = params.reviewerId;
        m.approved_at = new Date().toISOString();
        if (params.decision === 'APPROVE') {
          const assignedRole: Role = m.member_type === 'TENANT' ? 'RESIDENT_TENANT' : 'RESIDENT_OWNER';
          db.userRoles.set(user.id, [assignedRole]);
        }
      }
    }

    // Persist decision to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('users').update({
          kyc_status: newKycStatus,
          rejection_reason: user.rejection_reason || null,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);

        await supabase.from('kyc_documents').update({
          status: params.decision === 'APPROVE' ? 'VERIFIED' : 'REJECTED',
          verified_by: params.reviewerId,
          verified_at: new Date().toISOString(),
          verification_notes: params.notes || null,
        }).eq('user_id', user.id).eq('unit_id', kycDoc.unit_id);

        await supabase.from('unit_members').update({
          approval_status: params.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          approved_by: params.reviewerId,
          approved_at: new Date().toISOString(),
        }).eq('user_id', user.id).eq('unit_id', kycDoc.unit_id);
      } catch (err) {
        console.warn('[UserRepository] Supabase review decision sync failed:', err);
      }
    }

    return { user, kycDoc };
  },
};
