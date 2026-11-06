import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/inMemoryDb.js';
import type { Invoice, LedgerTransaction } from '@communityholder/shared';

export const ErpController = {
  generateMonthlyInvoices(req: Request, res: Response) {
    const { society_id, rate_per_sqft = 0.08, bill_month = '2026-11' } = req.body;

    const generated: Invoice[] = [];
    for (const unit of db.units.values()) {
      if (unit.society_id === society_id) {
        const invId = `inv_${bill_month}_${unit.id}`;
        const subtotal = Math.round(unit.super_built_up_area * rate_per_sqft * 100) / 100;
        const total = subtotal;

        const invoice: Invoice = {
          id: invId,
          society_id,
          unit_id: unit.id,
          invoice_number: `INV-${bill_month.replace('-', '')}-${unit.unit_number.replace(/\s+/g, '')}`,
          bill_date: `${bill_month}-01`,
          due_date: `${bill_month}-15`,
          subtotal_amount: subtotal,
          tax_amount: 0.0,
          late_fee_amount: 0.0,
          total_amount: total,
          amount_paid: 0.0,
          status: 'ISSUED',
          created_at: new Date().toISOString(),
        };

        db.invoices.set(invId, invoice);
        generated.push(invoice);
      }
    }

    return res.status(201).json({
      count: generated.length,
      invoices: generated,
      message: 'Monthly maintenance invoices generated and issued',
    });
  },

  getUnitInvoices(req: Request, res: Response) {
    const unitId = req.params.unitId as string;
    const list = Array.from(db.invoices.values()).filter((i) => i.unit_id === unitId);

    const advanceBalance = db.walletBalances.get(unitId) || 0;

    return res.status(200).json({
      unit_id: unitId,
      advance_wallet_balance: advanceBalance,
      invoices: list,
    });
  },

  settlePayment(req: Request, res: Response) {
    const { invoice_id, amount, payment_method = 'UPI' } = req.body;

    const invoice = db.invoices.get(invoice_id);
    if (!invoice) {
      return res.status(404).json({ error: 'INVOICE_NOT_FOUND' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ error: 'INVOICE_ALREADY_PAID', message: 'Invoice has already been settled' });
    }

    invoice.amount_paid += amount;
    if (invoice.amount_paid >= invoice.total_amount) {
      invoice.status = 'PAID';
    } else {
      invoice.status = 'PARTIALLY_PAID';
    }

    // Post Double-Entry Ledger Transaction
    const txnId = uuidv4();
    const ledgerTxn: LedgerTransaction = {
      id: txnId,
      society_id: invoice.society_id,
      transaction_date: new Date().toISOString().split('T')[0],
      reference_number: `RCP-${invoice.invoice_number}`,
      description: `Payment for ${invoice.invoice_number} via ${payment_method}`,
      lines: [
        {
          id: uuidv4(),
          transaction_id: txnId,
          account_code: '1010',
          account_name: 'Bank HDFC Operating',
          entry_type: 'DEBIT',
          amount,
          unit_id: invoice.unit_id,
        },
        {
          id: uuidv4(),
          transaction_id: txnId,
          account_code: '4010',
          account_name: 'Member Maintenance Income',
          entry_type: 'CREDIT',
          amount,
          unit_id: invoice.unit_id,
        },
      ],
      created_at: new Date().toISOString(),
    };

    db.ledgerTransactions.push(ledgerTxn);

    return res.status(200).json({
      receipt_id: `RCP-${invoice.invoice_number}`,
      invoice_status: invoice.status,
      amount_settled: amount,
      ledger_transaction_id: txnId,
      message: 'Payment settled. Balanced double-entry ledger posted.',
    });
  },

  vanWebhook(req: Request, res: Response) {
    const { virtual_account_number, amount, utr_reference } = req.body;

    if (!virtual_account_number || !amount) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    // Identify unit by VAN
    let targetUnit: any;
    for (const unit of db.units.values()) {
      if (unit.virtual_account_number === virtual_account_number) {
        targetUnit = unit;
        break;
      }
    }

    if (!targetUnit) {
      return res.status(404).json({ error: 'UNKNOWN_VIRTUAL_ACCOUNT', message: 'No matching unit found for VAN' });
    }

    // Find pending invoice for this unit
    let pendingInvoice: Invoice | undefined;
    for (const inv of db.invoices.values()) {
      if (inv.unit_id === targetUnit.id && (inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID')) {
        pendingInvoice = inv;
        break;
      }
    }

    let settledInvoiceId: string | undefined;
    let creditedToAdvance = false;

    if (pendingInvoice) {
      pendingInvoice.amount_paid += amount;
      pendingInvoice.status = 'PAID';
      settledInvoiceId = pendingInvoice.id;
    } else {
      // Race condition / Overpayment: Credit to Advance Wallet!
      const currentBalance = db.walletBalances.get(targetUnit.id) || 0;
      db.walletBalances.set(targetUnit.id, currentBalance + amount);
      creditedToAdvance = true;
    }

    // Post to Ledger
    const txnId = uuidv4();
    db.ledgerTransactions.push({
      id: txnId,
      society_id: targetUnit.society_id,
      transaction_date: new Date().toISOString().split('T')[0],
      reference_number: utr_reference || `VAN-${Date.now()}`,
      description: creditedToAdvance
        ? `Advance credit for ${targetUnit.unit_number} via VAN (UTR: ${utr_reference})`
        : `VAN Settlement for ${pendingInvoice?.invoice_number}`,
      lines: [
        {
          id: uuidv4(),
          transaction_id: txnId,
          account_code: '1010',
          account_name: 'Bank HDFC Operating',
          entry_type: 'DEBIT',
          amount,
          unit_id: targetUnit.id,
        },
        {
          id: uuidv4(),
          transaction_id: txnId,
          account_code: creditedToAdvance ? '2030' : '4010',
          account_name: creditedToAdvance ? 'Member Advance Deposits' : 'Member Maintenance Income',
          entry_type: 'CREDIT',
          amount,
          unit_id: targetUnit.id,
        },
      ],
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({
      status: 'RECONCILED',
      unit_id: targetUnit.id,
      unit_number: targetUnit.unit_number,
      settled_invoice_id: settledInvoiceId,
      credited_to_advance: creditedToAdvance,
      current_advance_balance: db.walletBalances.get(targetUnit.id) || 0,
      message: creditedToAdvance
        ? 'Duplicate or advance payment detected: successfully credited to flat advance balance'
        : 'Invoice automatically reconciled via VAN webhook',
    });
  },

  getLedger(req: Request, res: Response) {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const txn of db.ledgerTransactions) {
      for (const line of txn.lines) {
        if (line.entry_type === 'DEBIT') {
          totalDebits += line.amount;
        } else if (line.entry_type === 'CREDIT') {
          totalCredits += line.amount;
        }
      }
    }

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001;

    return res.status(200).json({
      total_transactions: db.ledgerTransactions.length,
      total_debits: totalDebits,
      total_credits: totalCredits,
      is_balanced: isBalanced,
      transactions: db.ledgerTransactions,
    });
  },
};
