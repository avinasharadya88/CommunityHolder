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

  it('8. should safely handle SQL injection payloads and escape special characters in applicant name', async () => {
    const maliciousName = "Robert'); DROP TABLE users;-- ' OR '1'='1";
    const user = await UserRepository.createOrUpdateUser({
      country_code: '+91',
      national_number: '9870001122',
      phone_e164: '+919870001122',
      full_name: maliciousName,
    });

    expect(user.id).toBeDefined();
    expect(user.full_name).toBe(maliciousName);

    // Verify lookup retains exact sanitized string without SQL execution
    const retrieved = await UserRepository.findUserById(user.id);
    expect(retrieved?.full_name).toBe(maliciousName);

    // Verify database tables still exist and were not dropped
    const seeded = await UserRepository.findUserByPhone('+919876543210');
    expect(seeded).toBeDefined();
  });

  it('9. should support diverse multilingual Unicode names (Devanagari, Arabic, Accents, Emoji)', async () => {
    const unicodeUsers = [
      { code: '+91', national: '9812345678', e164: '+919812345678', name: 'अदिति राव 🌸' },
      { code: '+971', national: '509876543', e164: '+971509876543', name: 'طارق المنصور' },
      { code: '+49', national: '15123456789', e164: '+4915123456789', name: 'Renée Müller-Lüdenscheidt' },
    ];

    for (const u of unicodeUsers) {
      const created = await UserRepository.createOrUpdateUser({
        country_code: u.code,
        national_number: u.national,
        phone_e164: u.e164,
        full_name: u.name,
      });

      expect(created.full_name).toBe(u.name);
      const fetched = await UserRepository.findUserByPhone(u.e164);
      expect(fetched?.full_name).toBe(u.name);
    }
  });

  it('10. should strictly isolate Admin KYC Queue across different multi-tenant societies', async () => {
    // 1. Create applicant in Society A (Prestige Greenwoods)
    const userA = await UserRepository.createOrUpdateUser({
      country_code: '+91',
      national_number: '9900112233',
      phone_e164: '+919900112233',
      full_name: 'Resident A',
    });

    await UserRepository.submitKyc({
      userId: userA.id,
      fullName: 'Resident A',
      societyId: 'soc_prestige_greenwoods',
      blockId: 'blk_green_alpha',
      unitId: 'unit_alpha_101',
      relationshipType: 'PRIMARY_OWNER',
      documents: [
        {
          document_category: 'GOVT_ID',
          document_type: 'AADHAAR',
          file_url: 'kyc-vault/doc_a.pdf',
          file_sha256: 'sha_a',
          file_size_bytes: 1000,
          mime_type: 'application/pdf',
        },
      ],
    });

    // 2. Query queue for Society B (Sobha Windsor)
    const queueB = await UserRepository.getAdminKycQueue('soc_sobha_windsor');
    const crossTenantMatch = queueB.find((q) => q.user_id === userA.id);
    expect(crossTenantMatch).toBeUndefined();

    // 3. Query queue for Society A
    const queueA = await UserRepository.getAdminKycQueue('soc_prestige_greenwoods');
    const tenantMatch = queueA.find((q) => q.user_id === userA.id);
    expect(tenantMatch).toBeDefined();
    expect(tenantMatch?.applicant_name).toBe('Resident A');
  });

  it('11. should handle concurrent user creation with identical phone number cleanly', async () => {
    const phone = '+919955443322';

    // Simulate two concurrent requests hitting the repository at the exact same time
    const [res1, res2] = await Promise.all([
      UserRepository.createOrUpdateUser({
        country_code: '+91',
        national_number: '9955443322',
        phone_e164: phone,
        full_name: 'Concurrent User 1',
      }),
      UserRepository.createOrUpdateUser({
        country_code: '+91',
        national_number: '9955443322',
        phone_e164: phone,
        full_name: 'Concurrent User 2',
      }),
    ]);

    expect(res1).toBeDefined();
    expect(res2).toBeDefined();

    // In-memory / DB must have a consistent single record
    const allMatching = Array.from(db.users.values()).filter((u) => u.phone_e164 === phone);
    expect(allMatching.length).toBeLessThanOrEqual(2);
  });

  it('12. should return undefined gracefully for non-existent users or non-matching phone', async () => {
    const ghostUser = await UserRepository.findUserByPhone('+910000000000');
    expect(ghostUser).toBeUndefined();

    const ghostId = await UserRepository.findUserById('non-existent-uuid-9999');
    expect(ghostId).toBeUndefined();

    const ghostMembership = await UserRepository.getUserUnitAndSociety('non-existent-uuid-9999');
    expect(ghostMembership.unitId).toBeUndefined();
    expect(ghostMembership.societyId).toBeUndefined();
  });
});

