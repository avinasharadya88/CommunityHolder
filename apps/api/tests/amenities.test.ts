import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/inMemoryDb.js';

describe('Module 5: Amenities Booking & Concurrency Tests', () => {
  let app: any;
  let resident1Token: string;
  let resident2Token: string;

  beforeEach(async () => {
    db.reset();
    app = createApp();

    // Resident 1 (Avinash: +919876543210)
    const res1Otp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919876543210' });
    const res1Verify = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919876543210', otp_code: res1Otp.body.otp_code });
    resident1Token = res1Verify.body.token;

    // Create & Approve Resident 2 (+919111222333)
    const res2Otp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919111222333' });
    const res2Verify = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919111222333', otp_code: res2Otp.body.otp_code });
    resident2Token = res2Verify.body.token;

    // Approve Resident 2 in DB
    const u2 = db.users.get(res2Verify.body.user.id);
    if (u2) u2.kyc_status = 'APPROVED';
  });

  it('TC-AMEN-001: should prevent double-booking under concurrent race conditions using distributed lock', async () => {
    const slotPayload = {
      amenity_id: 'amenity_tennis_01',
      unit_id: 'unit_alpha_1204',
      booking_start: '2026-11-20T18:00:00Z',
      booking_end: '2026-11-20T19:00:00Z',
      total_fee: 10,
      deposit_amount: 50,
    };

    // Both residents fire simultaneously to book the same slot
    const [booking1, booking2] = await Promise.all([
      request(app)
        .post('/api/v1/amenities/bookings')
        .set('Authorization', `Bearer ${resident1Token}`)
        .send(slotPayload),
      request(app)
        .post('/api/v1/amenities/bookings')
        .set('Authorization', `Bearer ${resident2Token}`)
        .send({ ...slotPayload, unit_id: 'unit_alpha_101' }),
    ]);

    // Exactly one must succeed with 201, and one must be rejected with 409
    const statuses = [booking1.status, booking2.status].sort();
    expect(statuses).toEqual([201, 409]);

    // Verify only one booking exists in the database
    const listRes = await request(app)
      .get('/api/v1/amenities/bookings')
      .set('Authorization', `Bearer ${resident1Token}`);

    expect(listRes.status).toBe(200);
    const tennisBookings = listRes.body.bookings.filter(
      (b: any) => b.amenity_id === 'amenity_tennis_01' && b.booking_start === '2026-11-20T18:00:00Z'
    );
    expect(tennisBookings.length).toBe(1);
  });
});
