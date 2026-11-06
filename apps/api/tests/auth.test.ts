import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/inMemoryDb.js';

describe('Module 1: Authentication & Phone OTP Tests', () => {
  const app = createApp();

  beforeEach(() => {
    db.reset();
  });

  // TC-AUTH-001: Standard Indian Mobile Number Login (Happy Flow)
  it('TC-AUTH-001: should request and verify OTP for a valid Indian number (+91)', async () => {
    const reqRes = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ country_code: '+91', national_number: '9876543210', channel: 'SMS' });

    expect(reqRes.status).toBe(200);
    expect(reqRes.body.phone_e164).toBe('+919876543210');
    expect(reqRes.body.channel).toBe('SMS');

    // Retrieve active OTP from store
    const storedOtp = db.otpStore.get('+919876543210');
    expect(storedOtp).toBeDefined();

    // Verify OTP
    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ country_code: '+91', national_number: '9876543210', otp: storedOtp!.otp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.access_token).toBeDefined();
    expect(verifyRes.body.user.phone_e164).toBe('+919876543210');
    expect(verifyRes.body.user.kyc_status).toBe('APPROVED'); // pre-seeded user
  });

  // TC-AUTH-002: International E.164 Mobile Number Login (Happy Flow)
  it('TC-AUTH-002: should support international numbers (+1 US and +971 UAE)', async () => {
    const usRes = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ country_code: '+1', national_number: '4155552671' });

    expect(usRes.status).toBe(200);
    expect(usRes.body.phone_e164).toBe('+14155552671');

    const uaeRes = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ country_code: '+971', national_number: '501234567' });

    expect(uaeRes.status).toBe(200);
    expect(uaeRes.body.phone_e164).toBe('+971501234567');
  });

  // TC-AUTH-003: Invalid Mobile Format & Non-Existent Country Code (Adversarial / Corner Case)
  it('TC-AUTH-003: should reject invalid Indian numbers, short lengths and impossible country codes', async () => {
    // Incomplete length
    const res1 = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ country_code: '+91', national_number: '12345' });
    expect(res1.status).toBe(400);
    expect(res1.body.error).toBe('INVALID_INDIAN_MOBILE_NUMBER');

    // Invalid prefix (e.g. starting with 0)
    const res2 = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ country_code: '+91', national_number: '0123456789' });
    expect(res2.status).toBe(400);

    // Non-existent country code (+999)
    const res3 = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ country_code: '+999', national_number: '9876543210' });
    expect(res3.status).toBe(400);
    expect(res3.body.error).toBe('INVALID_COUNTRY_CODE');
  });

  // TC-AUTH-004: Brute-Force OTP Attack & Account Lockout (Edge / Security)
  it('TC-AUTH-004: should lock account for 30 minutes after 5 consecutive failed OTP attempts', async () => {
    const phone = '9123456789';
    await request(app).post('/api/v1/auth/request-otp').send({ country_code: '+91', national_number: phone });

    // Fail 4 times
    for (let i = 0; i < 4; i++) {
      const failRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ country_code: '+91', national_number: phone, otp: '000000' });
      expect(failRes.status).toBe(400);
      expect(failRes.body.attempts_remaining).toBe(4 - i);
    }

    // 5th failure -> Lockout!
    const lockRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ country_code: '+91', national_number: phone, otp: '000000' });
    expect(lockRes.status).toBe(429);
    expect(lockRes.body.error).toBe('ACCOUNT_LOCKED');

    // 6th attempt with ANY OTP (even valid) must be rejected due to lockout
    const postLockRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ country_code: '+91', national_number: phone, otp: '491823' });
    expect(postLockRes.status).toBe(429);
    expect(postLockRes.body.error).toBe('ACCOUNT_LOCKED');
  });

  // TC-AUTH-005: High-Frequency OTP Request Flooding (Rate-Limiting Edge)
  it('TC-AUTH-005: should rate-limit rapid successive OTP requests within 60 seconds', async () => {
    const phone = '9333344444';
    // 1st request -> success
    const res1 = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ country_code: '+91', national_number: phone });
    expect(res1.status).toBe(200);

    // 2nd immediate request -> 429 rate limited
    const res2 = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ country_code: '+91', national_number: phone });
    expect(res2.status).toBe(429);
    expect(res2.body.error).toBe('RATE_LIMITED');
    expect(res2.body.retry_after_seconds).toBeGreaterThan(0);
  });
});
