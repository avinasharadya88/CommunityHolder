import { describe, it, expect, beforeEach } from 'vitest';
import { UserRepository } from '../src/db/userRepository.js';
import { db } from '../src/db/inMemoryDb.js';
import { isSupabaseConfigured } from '../src/db/supabaseClient.js';

describe('Supabase Database Integration & UserRepository Tests (Project: ggzbyynthvxwkpdbjklf)', () => {
  beforeEach(() => {
    db.reset();
  });

  it('1. should find seeded resident user by normalized E.164 phone number', async () => {
    const user = await UserRepository.findUserByPhone('+919876543210');
    expect(user).toBeDefined();
    expect(user?.full_name).toBe('Avinash Aradya');
    expect(user?.kyc_status).toBe('APPROVED');
    expect(user?.country_code).toBe('+91');
    expect(user?.national_number).toBe('9876543210');
  });

  it('2. should create a new international applicant user and default to UNREGISTERED KYC status', async () => {
    const newUser = await UserRepository.createOrUpdateUser({
      country_code: '+1',
      national_number: '4155552671',
      phone_e164: '+14155552671',
      full_name: 'Priya Nair',
      email: 'priya.nair@example.com',
    });

    expect(newUser.id).toBeDefined();
    expect(newUser.phone_e164).toBe('+14155552671');
    expect(newUser.kyc_status).toBe('UNREGISTERED');
    expect(newUser.is_active).toBe(true);

    // Verify lookup by phone
    const lookedUp = await UserRepository.findUserByPhone('+14155552671');
    expect(lookedUp?.id).toBe(newUser.id);
    expect(lookedUp?.full_name).toBe('Priya Nair');
  });

  it('3. should update user profile idempotently on repeated upserts without changing user ID', async () => {
    const user1 = await UserRepository.createOrUpdateUser({
      country_code: '+971',
      national_number: '501234567',
      phone_e164: '+971501234567',
      full_name: 'Tariq Al-Mansoor',
    });

    const user2 = await UserRepository.createOrUpdateUser({
      id: user1.id,
      country_code: '+971',
      national_number: '501234567',
      phone_e164: '+971501234567',
      full_name: 'Tariq Al-Mansoor (Updated)',
      email: 'tariq.updated@example.com',
    });

    expect(user2.id).toBe(user1.id);
    expect(user2.full_name).toBe('Tariq Al-Mansoor (Updated)');
    expect(user2.email).toBe('tariq.updated@example.com');
  });

  it('4. should assign and retrieve multi-tenant roles for user', async () => {
    const user = await UserRepository.findUserByPhone('+919876543210');
    expect(user).toBeDefined();

    await UserRepository.setUserRoles(user!.id, 'soc_prestige_greenwoods', ['RESIDENT_OWNER', 'SOCIETY_ADMIN']);
    const roles = await UserRepository.getUserRoles(user!.id);

    expect(roles).toContain('RESIDENT_OWNER');
    expect(roles).toContain('SOCIETY_ADMIN');
  });

  it('5. should handle full KYC submission, transition user to PENDING_VERIFICATION, and update admin queue', async () => {
    // 1. Create applicant
    const applicant = await UserRepository.createOrUpdateUser({
      country_code: '+91',
      national_number: '9988776655',
      phone_e164: '+919988776655',
      full_name: 'Aditi Rao',
    });

    expect(applicant.kyc_status).toBe('UNREGISTERED');

    // 2. Submit KYC application with Aadhaar and Sale Deed documents
    await UserRepository.submitKyc({
      userId: applicant.id,
      fullName: 'Aditi Rao',
      email: 'aditi.rao@example.com',
      societyId: 'soc_prestige_greenwoods',
      blockId: 'blk_green_alpha',
      unitId: 'unit_alpha_101',
      relationshipType: 'PRIMARY_OWNER',
      documents: [
        {
          document_category: 'GOVT_ID',
          document_type: 'AADHAAR',
          document_identifier_masked: 'XXXX-XXXX-9911',
          file_url: 'kyc-vault/2026/11/aadhaar_aditi.pdf',
          file_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          file_size_bytes: 1048576,
          mime_type: 'application/pdf',
        },
      ],
    });

    // 3. Verify user status updated to PENDING_VERIFICATION
    const updatedUser = await UserRepository.findUserById(applicant.id);
    expect(updatedUser?.kyc_status).toBe('PENDING_VERIFICATION');

    // 4. Verify status endpoint response
    const statusData = await UserRepository.getKycStatus(applicant.id);
    expect(statusData.kyc_status).toBe('PENDING_VERIFICATION');
    expect(statusData.documents.length).toBe(1);
    expect(statusData.documents[0].document_type).toBe('AADHAAR');

    // 5. Verify application appears in admin review queue
    const queue = await UserRepository.getAdminKycQueue('soc_prestige_greenwoods');
    const queuedApp = queue.find((q) => q.user_id === applicant.id);
    expect(queuedApp).toBeDefined();
    expect(queuedApp.applicant_name).toBe('Aditi Rao');
    expect(queuedApp.relationship_type).toBe('PRIMARY_OWNER');
  });

  it('6. should allow Estate Manager to approve KYC, upgrade status to APPROVED, and grant RESIDENT_OWNER role', async () => {
    const applicant = await UserRepository.createOrUpdateUser({
      country_code: '+91',
      national_number: '9988776655',
      phone_e164: '+919988776655',
      full_name: 'Aditi Rao',
    });

    await UserRepository.submitKyc({
      userId: applicant.id,
      fullName: 'Aditi Rao',
      societyId: 'soc_prestige_greenwoods',
      blockId: 'blk_green_alpha',
      unitId: 'unit_alpha_101',
      relationshipType: 'PRIMARY_OWNER',
      documents: [
        {
          document_category: 'GOVT_ID',
          document_type: 'AADHAAR',
          file_url: 'kyc-vault/2026/11/aadhaar.pdf',
          file_sha256: 'abc123sha256',
          file_size_bytes: 500000,
          mime_type: 'application/pdf',
        },
      ],
    });

    const queue = await UserRepository.getAdminKycQueue('soc_prestige_greenwoods');
    const app = queue.find((q) => q.user_id === applicant.id);
    expect(app).toBeDefined();

    // Estate Manager approves
    await UserRepository.reviewKycDecision({
      applicationId: app.application_id,
      reviewerId: 'usr_manager_rajesh',
      decision: 'APPROVE',
      notes: 'Matches municipal property records',
    });

    const approvedUser = await UserRepository.findUserById(applicant.id);
    expect(approvedUser?.kyc_status).toBe('APPROVED');
    expect(approvedUser?.rejection_reason).toBeUndefined();

    // Verify role granted
    const roles = await UserRepository.getUserRoles(applicant.id);
    expect(roles).toContain('RESIDENT_OWNER');

    // Verify unit and society linkage
    const membership = await UserRepository.getUserUnitAndSociety(applicant.id);
    expect(membership.unitId).toBe('unit_alpha_101');
    expect(membership.societyId).toBe('soc_prestige_greenwoods');
  });

  it('7. should handle KYC rejection with mandatory reason and preserve re-upload capability', async () => {
    const applicant = await UserRepository.createOrUpdateUser({
      country_code: '+91',
      national_number: '9911223344',
      phone_e164: '+919911223344',
      full_name: 'Kavita Sen',
    });

    await UserRepository.submitKyc({
      userId: applicant.id,
      fullName: 'Kavita Sen',
      societyId: 'soc_prestige_greenwoods',
      blockId: 'blk_green_alpha',
      unitId: 'unit_alpha_101',
      relationshipType: 'TENANT',
      documents: [
        {
          document_category: 'GOVT_ID',
          document_type: 'PASSPORT',
          file_url: 'kyc-vault/2026/11/passport_blurry.jpg',
          file_sha256: 'def456sha256',
          file_size_bytes: 300000,
          mime_type: 'image/jpeg',
        },
      ],
    });

    const queue = await UserRepository.getAdminKycQueue('soc_prestige_greenwoods');
    const app = queue.find((q) => q.user_id === applicant.id);

    // Reject with reason
    await UserRepository.reviewKycDecision({
      applicationId: app.application_id,
      reviewerId: 'usr_manager_rajesh',
      decision: 'REJECT',
      rejectionReason: 'Blurred ID Scan',
      notes: 'Page 2 date of birth unreadable. Please re-upload.',
    });

    const rejectedUser = await UserRepository.findUserById(applicant.id);
    expect(rejectedUser?.kyc_status).toBe('REJECTED');
    expect(rejectedUser?.rejection_reason).toContain('Blurred ID Scan');

    const statusData = await UserRepository.getKycStatus(applicant.id);
    expect(statusData.kyc_status).toBe('REJECTED');
    expect(statusData.rejection_reason).toContain('Blurred ID Scan');
  });
});
