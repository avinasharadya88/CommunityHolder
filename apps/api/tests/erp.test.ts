import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/inMemoryDb.js';

describe('Module 4: ERP, Accounting & Double-Entry Ledger Tests', () => {
  let app: any;
  let residentToken: string;
  let managerToken: string;

  beforeEach(async () => {
    db.reset();
    app = createApp();

    // 1. Login Verified Resident (Flat 1204, Avinash: +919876543210)
    const resOtp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919876543210' });
    const resVerify = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919876543210', otp_code: resOtp.body.otp_code });
    residentToken = resVerify.body.token;

    // 2. Login Estate Manager (+919888877777)
    const mgrOtp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919888877777' });
    const mgrVerify = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919888877777', otp_code: mgrOtp.body.otp_code });
    managerToken = mgrVerify.body.token;
  });

  it('TC-ERP-001: should generate monthly maintenance invoices based on unit square footage', async () => {
    // Unit Alpha 1204 has 1500 sqft, Unit Alpha 101 has 1200 sqft
    const genRes = await request(app)
      .post('/api/v1/erp/invoices/generate-monthly')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        society_id: 'soc_prestige_greenwoods',
        rate_per_sqft: 0.1, // $0.10 per sqft
        bill_month: '2026-12',
      });

    expect(genRes.status).toBe(201);
    expect(genRes.body.count).toBe(2);

    const inv1204 = genRes.body.invoices.find((i: any) => i.unit_id === 'unit_alpha_1204');
    expect(inv1204).toBeDefined();
    expect(inv1204.total_amount).toBe(150); // 1500 * 0.10
    expect(inv1204.status).toBe('ISSUED');

    const inv101 = genRes.body.invoices.find((i: any) => i.unit_id === 'unit_alpha_101');
    expect(inv101).toBeDefined();
    expect(inv101.total_amount).toBe(120); // 1200 * 0.10
  });

  it('TC-ERP-002: should settle payment and verify strict double-entry ledger balance (Debits == Credits)', async () => {
    // Settle the pre-seeded invoice inv_nov_1204 ($120)
    const payRes = await request(app)
      .post('/api/v1/payments/settle')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        invoice_id: 'inv_nov_1204',
        amount: 120.0,
        payment_method: 'UPI',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.invoice_status).toBe('PAID');
    expect(payRes.body.receipt_id).toContain('RCP-INV-202611');

    // Audit general ledger
    const ledgerRes = await request(app)
      .get('/api/v1/erp/reports/ledger')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.body.total_transactions).toBeGreaterThanOrEqual(1);
    expect(ledgerRes.body.total_debits).toBe(120.0);
    expect(ledgerRes.body.total_credits).toBe(120.0);
    expect(ledgerRes.body.is_balanced).toBe(true);

    // Attempting to pay an already paid invoice should be rejected
    const dupRes = await request(app)
      .post('/api/v1/payments/settle')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        invoice_id: 'inv_nov_1204',
        amount: 120.0,
      });

    expect(dupRes.status).toBe(400);
    expect(dupRes.body.error).toBe('INVOICE_ALREADY_PAID');
  });

  it('TC-ERP-003: should automatically reconcile payment received via Virtual Account Number (VAN) webhook', async () => {
    // Flat 1204 VAN is CHOLDRBLR1204
    const webhookRes = await request(app)
      .post('/api/v1/webhooks/banking/van')
      .send({
        virtual_account_number: 'CHOLDRBLR1204',
        amount: 120.0,
        utr_reference: 'CMS2026110698124',
        remitter_name: 'Avinash Aradya',
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.status).toBe('RECONCILED');
    expect(webhookRes.body.unit_id).toBe('unit_alpha_1204');
    expect(webhookRes.body.settled_invoice_id).toBe('inv_nov_1204');

    // Check that the invoice is marked PAID
    const inv = db.invoices.get('inv_nov_1204');
    expect(inv?.status).toBe('PAID');
    expect(inv?.amount_paid).toBe(120.0);
  });

  it('TC-ERP-004: should credit overpayment or second VAN transfer to Member Advance Deposit Wallet', async () => {
    // 1. Settle the invoice first
    await request(app)
      .post('/api/v1/webhooks/banking/van')
      .send({
        virtual_account_number: 'CHOLDRBLR1204',
        amount: 120.0,
        utr_reference: 'CMS_TXN_FIRST',
      });

    // 2. Second transfer comes into VAN with no pending invoice
    const secondWebhook = await request(app)
      .post('/api/v1/webhooks/banking/van')
      .send({
        virtual_account_number: 'CHOLDRBLR1204',
        amount: 150.0,
        utr_reference: 'CMS_TXN_SECOND_ADVANCE',
      });

    expect(secondWebhook.status).toBe(200);
    expect(secondWebhook.body.credited_to_advance).toBe(true);
    expect(secondWebhook.body.current_advance_balance).toBe(150.0);

    // Verify resident sees their advance wallet balance
    const unitInvoicesRes = await request(app)
      .get('/api/v1/erp/invoices/unit/unit_alpha_1204')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(unitInvoicesRes.status).toBe(200);
    expect(unitInvoicesRes.body.advance_wallet_balance).toBe(150.0);
  });
});

